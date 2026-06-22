import {
  buildBlocks,
  findTranscriptFiles,
  getCurrentWindow,
  getProjectsDir,
  parseUsageEntries,
} from "../src/usage";

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}시간 ${m}분`;
}

const files = findTranscriptFiles(getProjectsDir());
console.log(`transcript 파일: ${files.length}개`);

const entries = parseUsageEntries(files);
console.log(`usage 엔트리(중복 제거 후): ${entries.length}개`);

const blocks = buildBlocks(entries);
console.log(`세션 블록: ${blocks.length}개`);

console.log("\n--- 최근 5개 블록 ---");
for (const b of blocks.slice(-5)) {
  const start = new Date(b.startTime).toLocaleString();
  console.log(`${start} | 메시지 ${b.messageCount} | 토큰 ${fmtTokens(b.totalTokens)}`);
}

const win = getCurrentWindow(blocks);
console.log("\n--- 현재 5시간 윈도우 ---");
if (win.isActive) {
  console.log(`활성 ✅`);
  console.log(`메시지: ${win.messageCount}`);
  console.log(`토큰: ${fmtTokens(win.totalTokens)}`);
  console.log(`리셋: ${new Date(win.resetTime).toLocaleString()}`);
  console.log(`남은 시간: ${fmtDuration(win.remainingMs)}`);
} else {
  console.log("활성 윈도우 없음 (최근 5시간 내 활동 없음)");
}
