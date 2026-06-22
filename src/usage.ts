import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CurrentWindow, SessionBlock, UsageEntry } from "./types";

export const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getProjectsDir(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

export function findTranscriptFiles(projectsDir: string): string[] {
  if (!fs.existsSync(projectsDir)) return [];

  const files: string[] = [];
  for (const project of fs.readdirSync(projectsDir)) {
    const projectPath = path.join(projectsDir, project);
    if (!fs.statSync(projectPath).isDirectory()) continue;

    for (const file of fs.readdirSync(projectPath)) {
      if (file.endsWith(".jsonl")) {
        files.push(path.join(projectPath, file));
      }
    }
  }
  return files;
}

export function parseUsageEntries(files: string[]): UsageEntry[] {
  const entries: UsageEntry[] = [];
  const seenMessageIds = new Set<string>();

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, "utf-8");
    } catch {
      continue;
    }

    for (const line of content.split("\n")) {
      if (!line.trim()) continue;

      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }

      const message = obj?.message;
      const usage = message?.usage;
      if (obj?.type !== "assistant" || !usage || !obj?.timestamp) continue;

      // 같은 메시지가 여러 파일/줄에 중복 기록될 수 있어 id로 한 번만 센다.
      const messageId = message?.id;
      if (messageId) {
        if (seenMessageIds.has(messageId)) continue;
        seenMessageIds.add(messageId);
      }

      entries.push({
        timestamp: new Date(obj.timestamp).getTime(),
        model: message?.model ?? "unknown",
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      });
    }
  }

  return entries;
}

// Anthropic 한도/과금은 토큰 종류별 비용이 다르다. 특히 cache 읽기는 매우 저렴(~0.1x)해
// 단순 합산하면 cache 읽기가 수치를 지배해 실제 사용률과 어긋난다. 비용에 비례해 가중한다.
export const TOKEN_WEIGHTS = {
  input: 1,
  output: 5,
  cacheCreate: 1.25,
  cacheRead: 0.1,
};

function entryTokens(e: UsageEntry): number {
  return (
    e.inputTokens * TOKEN_WEIGHTS.input +
    e.outputTokens * TOKEN_WEIGHTS.output +
    e.cacheCreationTokens * TOKEN_WEIGHTS.cacheCreate +
    e.cacheReadTokens * TOKEN_WEIGHTS.cacheRead
  );
}

function floorToHour(timestamp: number): number {
  return timestamp - (timestamp % (60 * 60 * 1000));
}

// 윈도우 길이(windowMs)만 바꾸면 5시간/주간 등 어떤 블록도 같은 로직으로 만든다.
// 블록 분할 규칙: 블록 시작 후 windowMs 경과 OR 직전 메시지와 windowMs 이상 간격.
export function buildBlocks(entries: UsageEntry[], windowMs: number): SessionBlock[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const blocks: SessionBlock[] = [];

  let blockStart = floorToHour(sorted[0].timestamp);
  let lastTimestamp = sorted[0].timestamp;
  let current: UsageEntry[] = [];

  const flush = () => {
    if (current.length === 0) return;
    blocks.push({
      startTime: blockStart,
      endTime: blockStart + windowMs,
      entries: current,
      totalTokens: current.reduce((sum, e) => sum + entryTokens(e), 0),
      messageCount: current.length,
    });
  };

  for (const entry of sorted) {
    const exceedsDuration = entry.timestamp - blockStart >= windowMs;
    const exceedsGap = entry.timestamp - lastTimestamp >= windowMs;

    if (current.length > 0 && (exceedsDuration || exceedsGap)) {
      flush();
      current = [];
      blockStart = floorToHour(entry.timestamp);
    }

    current.push(entry);
    lastTimestamp = entry.timestamp;
  }
  flush();

  return blocks;
}

export function getCurrentWindow(blocks: SessionBlock[], now: number = Date.now()): CurrentWindow {
  const empty: CurrentWindow = {
    isActive: false,
    totalTokens: 0,
    messageCount: 0,
    blockStart: 0,
    resetTime: 0,
    remainingMs: 0,
  };

  if (blocks.length === 0) return empty;

  const last = blocks[blocks.length - 1];
  if (now >= last.endTime) return empty;

  return {
    isActive: true,
    totalTokens: last.totalTokens,
    messageCount: last.messageCount,
    blockStart: last.startTime,
    resetTime: last.endTime,
    remainingMs: last.endTime - now,
  };
}

export interface UsageWindows {
  fiveHour: CurrentWindow;
  weekly: CurrentWindow;
}

export function loadUsageWindows(now: number = Date.now()): UsageWindows {
  const files = findTranscriptFiles(getProjectsDir());
  const entries = parseUsageEntries(files);
  return {
    fiveHour: getCurrentWindow(buildBlocks(entries, FIVE_HOURS_MS), now),
    weekly: getCurrentWindow(buildBlocks(entries, WEEK_MS), now),
  };
}
