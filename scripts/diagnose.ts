import {
  FIVE_HOURS_MS,
  buildBlocks,
  findTranscriptFiles,
  getProjectsDir,
  parseUsageEntries,
} from "../src/usage";

const entries = parseUsageEntries(findTranscriptFiles(getProjectsDir()));
const blocks = buildBlocks(entries, FIVE_HOURS_MS);
const now = Date.now();

const last = blocks[blocks.length - 1];
if (!last || now >= last.endTime) {
  console.log("활성 5시간 블록 없음");
  process.exit(0);
}

console.log("=== 현재 5시간 블록 ===");
console.log("블록 시작:", new Date(last.startTime).toLocaleString());
console.log("리셋:", new Date(last.endTime).toLocaleString());
console.log("메시지 수:", last.messageCount);

let input = 0, output = 0, cacheCreate = 0, cacheRead = 0;
for (const e of last.entries) {
  input += e.inputTokens;
  output += e.outputTokens;
  cacheCreate += e.cacheCreationTokens;
  cacheRead += e.cacheReadTokens;
}
const fmt = (n: number) => (n / 1_000_000).toFixed(3) + "M";

console.log("\n=== 토큰 구성 ===");
console.log("input         :", fmt(input));
console.log("output        :", fmt(output));
console.log("cacheCreate   :", fmt(cacheCreate));
console.log("cacheRead     :", fmt(cacheRead));
console.log("합계(현재 metric):", fmt(input + output + cacheCreate + cacheRead));
console.log("cacheRead 제외   :", fmt(input + output + cacheCreate));

// 비용 가중 근사 (input=1, cacheRead=0.1, cacheCreate=1.25, output=5)
const weighted = input * 1 + cacheRead * 0.1 + cacheCreate * 1.25 + output * 5;
console.log("비용가중 근사    :", fmt(weighted));

console.log("\n=== Claude 앱이 32%라면, 각 metric 기준 추정 한도 ===");
const total = input + output + cacheCreate + cacheRead;
console.log("현재 metric 기준 :", fmt(total / 0.32));
console.log("cacheRead 제외   :", fmt((input + output + cacheCreate) / 0.32));
console.log("비용가중 기준    :", fmt(weighted / 0.32));
