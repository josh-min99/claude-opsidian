import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CurrentWindow, SessionBlock, UsageEntry } from "./types";

export const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

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

function entryTokens(e: UsageEntry): number {
  return e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
}

function floorToHour(timestamp: number): number {
  return timestamp - (timestamp % (60 * 60 * 1000));
}

export function buildBlocks(entries: UsageEntry[]): SessionBlock[] {
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
      endTime: blockStart + FIVE_HOURS_MS,
      entries: current,
      totalTokens: current.reduce((sum, e) => sum + entryTokens(e), 0),
      messageCount: current.length,
    });
  };

  for (const entry of sorted) {
    const exceedsDuration = entry.timestamp - blockStart >= FIVE_HOURS_MS;
    const exceedsGap = entry.timestamp - lastTimestamp >= FIVE_HOURS_MS;

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
  const resetTime = last.startTime + FIVE_HOURS_MS;

  if (now >= resetTime) return empty;

  return {
    isActive: true,
    totalTokens: last.totalTokens,
    messageCount: last.messageCount,
    blockStart: last.startTime,
    resetTime,
    remainingMs: resetTime - now,
  };
}

export function loadCurrentWindow(now: number = Date.now()): CurrentWindow {
  const files = findTranscriptFiles(getProjectsDir());
  const entries = parseUsageEntries(files);
  const blocks = buildBlocks(entries);
  return getCurrentWindow(blocks, now);
}
