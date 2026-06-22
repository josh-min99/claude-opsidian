import { Plugin, Notice } from "obsidian";
import { loadCurrentWindow } from "./usage";

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

export default class ClaudeUsageBarPlugin extends Plugin {
  async onload() {
    this.addRibbonIcon("bar-chart", "Claude Usage Bar", () => {
      const win = loadCurrentWindow();
      if (!win.isActive) {
        new Notice("최근 5시간 내 Claude 활동이 없습니다.");
        return;
      }
      new Notice(
        `Claude 사용량 (최근 5시간)\n` +
          `메시지 ${win.messageCount} · 토큰 ${fmtTokens(win.totalTokens)}\n` +
          `리셋까지 ${fmtDuration(win.remainingMs)}`
      );
    });

    console.log("Claude Usage Bar loaded");
  }

  onunload() {
    console.log("Claude Usage Bar unloaded");
  }
}
