import { loadUsageWindows } from "../src/usage";
import { CurrentWindow } from "../src/types";

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;
  if (days > 0) return `${days}일 ${h}시간`;
  return `${h}시간 ${m}분`;
}

function show(label: string, win: CurrentWindow) {
  console.log(`\n--- ${label} ---`);
  if (!win.isActive) {
    console.log("활성 윈도우 없음");
    return;
  }
  console.log(`메시지: ${win.messageCount}`);
  console.log(`토큰: ${fmtTokens(win.totalTokens)}`);
  console.log(`리셋: ${new Date(win.resetTime).toLocaleString()}`);
  console.log(`남은 시간: ${fmtDuration(win.remainingMs)}`);
}

const w = loadUsageWindows();
show("최근 5시간", w.fiveHour);
show("주간", w.weekly);
