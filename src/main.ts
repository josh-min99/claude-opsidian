import { Plugin, WorkspaceLeaf } from "obsidian";
import {
  ClaudeUsageSettings,
  ClaudeUsageSettingTab,
  DEFAULT_SETTINGS,
} from "./settings";
import { ClaudeUsageView, VIEW_TYPE_CLAUDE_USAGE } from "./view";

export default class ClaudeUsageBarPlugin extends Plugin {
  settings!: ClaudeUsageSettings;
  private refreshTimer: number | null = null;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_CLAUDE_USAGE, (leaf) => new ClaudeUsageView(leaf, this));

    this.addRibbonIcon("bar-chart", "Claude Usage Bar", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-claude-usage-view",
      name: "Claude 사용량 패널 열기",
      callback: () => this.activateView(),
    });

    this.addSettingTab(new ClaudeUsageSettingTab(this.app, this));

    this.restartRefreshTimer();
  }

  onunload() {
    if (this.refreshTimer !== null) window.clearInterval(this.refreshTimer);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(VIEW_TYPE_CLAUDE_USAGE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false) as WorkspaceLeaf;
      await leaf.setViewState({ type: VIEW_TYPE_CLAUDE_USAGE, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_CLAUDE_USAGE)) {
      const view = leaf.view;
      if (view instanceof ClaudeUsageView) view.render();
    }
  }

  restartRefreshTimer(): void {
    if (this.refreshTimer !== null) window.clearInterval(this.refreshTimer);
    const intervalMs = this.settings.refreshIntervalSec * 1000;
    this.refreshTimer = window.setInterval(() => this.refreshViews(), intervalMs);
    this.registerInterval(this.refreshTimer);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.refreshViews();
  }
}
