import {
  FIVE_HOURS_MS,
  WEEK_MS,
  buildBlocks,
  findTranscriptFiles,
  getProjectsDir,
  parseUsageEntries,
} from "../src/usage";
import { CurrentWindow, UsageEntry } from "../src/types";

const entries = parseUsageEntries(findTranscriptFiles(getProjectsDir()));
const now = Date.now();
const fmt = (n: number) => (n / 1_000_000).toFixed(3) + "M";

function activeBlockEntries(windowMs: number): UsageEntry[] {
  const blocks = buildBlocks(entries, windowMs);
  const last = blocks[blocks.length - 1];
  if (!last || now >= last.endTime) return [];
  return last.entries;
}

function report(label: string, windowMs: number, defaultLimit: number) {
  const es = activeBlockEntries(windowMs);
  let input = 0, output = 0, cacheCreate = 0, cacheRead = 0;
  for (const e of es) {
    input += e.inputTokens;
    output += e.outputTokens;
    cacheCreate += e.cacheCreationTokens;
    cacheRead += e.cacheReadTokens;
  }
  const raw = input + output + cacheCreate + cacheRead;
  const weighted = input * 1 + output * 5 + cacheCreate * 1.25 + cacheRead * 0.1;
  console.log(`\n=== ${label} (메시지 ${es.length}) ===`);
  console.log(`input ${fmt(input)} / output ${fmt(output)} / cacheCreate ${fmt(cacheCreate)} / cacheRead ${fmt(cacheRead)}`);
  console.log(`raw 합계      : ${fmt(raw)}`);
  console.log(`가중 합계     : ${fmt(weighted)}`);
  console.log(`기본 한도     : ${fmt(defaultLimit)}`);
  console.log(`→ 플러그인 표시 %: ${((weighted / defaultLimit) * 100).toFixed(0)}%`);
}

report("최근 5시간", FIVE_HOURS_MS, 4_200_000);
report("주간", WEEK_MS, 16_000_000);
