import { ItemView, WorkspaceLeaf } from "obsidian";
import type ClaudeUsageBarPlugin from "./main";
import { loadUsageWindows } from "./usage";
import { CurrentWindow } from "./types";
import { effectiveLimits } from "./settings";

export const VIEW_TYPE_CLAUDE_USAGE = "claude-usage-view";

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

function severity(pct: number): "ok" | "warn" | "danger" {
  if (pct >= 90) return "danger";
  if (pct >= 70) return "warn";
  return "ok";
}

export class ClaudeUsageView extends ItemView {
  plugin: ClaudeUsageBarPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeUsageBarPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CLAUDE_USAGE;
  }

  getDisplayText(): string {
    return "Claude Usage";
  }

  getIcon(): string {
    return "bar-chart";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  render(): void {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("claude-usage-view");

    const windows = loadUsageWindows();
    const limits = effectiveLimits(this.plugin.settings);

    this.renderBar(container as HTMLElement, "최근 5시간", windows.fiveHour, limits.fiveHour);
    this.renderBar(container as HTMLElement, "주간", windows.weekly, limits.weekly);
  }

  private renderBar(parent: HTMLElement, label: string, win: CurrentWindow, limit: number): void {
    const section = parent.createDiv({ cls: "cu-section" });
    section.createDiv({ cls: "cu-label", text: label });

    if (!win.isActive) {
      section.createDiv({ cls: "cu-empty", text: "최근 활동 없음" });
      return;
    }

    const pct = limit > 0 ? Math.min(100, (win.totalTokens / limit) * 100) : 0;
    const sev = severity(pct);

    const track = section.createDiv({ cls: "cu-track" });
    const fill = track.createDiv({ cls: `cu-fill cu-${sev}` });
    fill.style.width = `${pct}%`;

    section.createDiv({
      cls: "cu-stats",
      text: `${pct.toFixed(0)}% · ${fmtTokens(win.totalTokens)} / ${fmtTokens(limit)}`,
    });
    section.createDiv({ cls: "cu-meta", text: `메시지 ${win.messageCount}` });
    section.createDiv({
      cls: "cu-meta",
      text: `리셋까지 ${fmtDuration(win.remainingMs)} (${new Date(win.resetTime).toLocaleString()})`,
    });
  }
}
