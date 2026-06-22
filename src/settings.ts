import { App, PluginSettingTab, Setting } from "obsidian";
import type ClaudeUsageBarPlugin from "./main";

export type Plan = "pro" | "max5" | "max20" | "custom";

// 윈도우당 추정 토큰 한도. Anthropic이 정확한 값을 공개하지 않아 근사치다.
// 사용자가 실제 Claude 화면과 비교해 custom 값으로 보정할 수 있다.
export const PLAN_LIMITS: Record<Exclude<Plan, "custom">, { fiveHour: number; weekly: number }> = {
  pro: { fiveHour: 2_000_000, weekly: 10_000_000 },
  max5: { fiveHour: 10_000_000, weekly: 50_000_000 },
  max20: { fiveHour: 40_000_000, weekly: 200_000_000 },
};

export interface ClaudeUsageSettings {
  plan: Plan;
  fiveHourLimit: number;
  weeklyLimit: number;
  refreshIntervalSec: number;
}

export const DEFAULT_SETTINGS: ClaudeUsageSettings = {
  plan: "max5",
  fiveHourLimit: PLAN_LIMITS.max5.fiveHour,
  weeklyLimit: PLAN_LIMITS.max5.weekly,
  refreshIntervalSec: 60,
};

export class ClaudeUsageSettingTab extends PluginSettingTab {
  plugin: ClaudeUsageBarPlugin;

  constructor(app: App, plugin: ClaudeUsageBarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("플랜")
      .setDesc("윈도우별 추정 토큰 한도를 플랜에 맞춰 설정합니다.")
      .addDropdown((dd) =>
        dd
          .addOption("pro", "Pro")
          .addOption("max5", "Max 5x")
          .addOption("max20", "Max 20x")
          .addOption("custom", "직접 입력")
          .setValue(this.plugin.settings.plan)
          .onChange(async (value) => {
            const plan = value as Plan;
            this.plugin.settings.plan = plan;
            if (plan !== "custom") {
              this.plugin.settings.fiveHourLimit = PLAN_LIMITS[plan].fiveHour;
              this.plugin.settings.weeklyLimit = PLAN_LIMITS[plan].weekly;
            }
            await this.plugin.saveSettings();
            this.display();
          })
      );

    const isCustom = this.plugin.settings.plan === "custom";

    new Setting(containerEl)
      .setName("토큰 한도 (5시간)")
      .setDesc("추정치입니다. Claude 실제 사용량 화면과 비교해 보정하세요.")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.fiveHourLimit))
          .setDisabled(!isCustom)
          .onChange(async (value) => {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) return;
            this.plugin.settings.fiveHourLimit = n;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("토큰 한도 (주간)")
      .setDesc("추정치입니다. 직접 입력 모드에서만 수정 가능합니다.")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.weeklyLimit))
          .setDisabled(!isCustom)
          .onChange(async (value) => {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) return;
            this.plugin.settings.weeklyLimit = n;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("자동 갱신 주기 (초)")
      .addSlider((slider) =>
        slider
          .setLimits(10, 300, 10)
          .setValue(this.plugin.settings.refreshIntervalSec)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.refreshIntervalSec = value;
            await this.plugin.saveSettings();
            this.plugin.restartRefreshTimer();
          })
      );
  }
}
