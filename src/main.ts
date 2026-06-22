import { Plugin, Notice } from "obsidian";

export default class ClaudeUsageBarPlugin extends Plugin {
  async onload() {
    this.addRibbonIcon("bar-chart", "Claude Usage Bar", () => {
      new Notice("Claude Usage Bar 플러그인이 살아있습니다 👋");
    });

    console.log("Claude Usage Bar loaded");
  }

  onunload() {
    console.log("Claude Usage Bar unloaded");
  }
}
