import { App, PluginSettingTab, Setting } from "obsidian";
import type ClaudeUsageBarPlugin from "./main";
import { loadUsageWindows } from "./usage";

export type Plan = "pro" | "max5" | "max20" | "custom";

// 윈도우당 추정 한도(비용 가중 토큰 기준). Anthropic 비공개라 근사치이며,
// 아래 "보정" 기능으로 Claude 실제 % 를 입력해 정확히 맞추는 것을 권장한다.
export const PLAN_LIMITS: Record<Exclude<Plan, "custom">, { fiveHour: number; weekly: number }> = {
  pro: { fiveHour: 850_000, weekly: 6_000_000 },
  max5: { fiveHour: 4_200_000, weekly: 16_000_000 },
  max20: { fiveHour: 16_800_000, weekly: 64_000_000 },
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

function fmtM(n: number): string {
  return (n / 1_000_000).toFixed(2) + "M";
}

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
      .setDesc("윈도우별 추정 한도(비용 가중 토큰)를 플랜에 맞춰 설정합니다.")
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
      .setName("한도: 5시간 (가중 토큰)")
      .setDesc("직접 입력 모드에서만 수정 가능합니다.")
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
      .setName("한도: 주간 (가중 토큰)")
      .setDesc("직접 입력 모드에서만 수정 가능합니다.")
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

    // --- 보정: Claude 앱이 보여주는 실제 % 를 입력하면 현재 측정값으로 한도를 역산한다. ---
    new Setting(containerEl).setName("보정 (Claude 실제 % 입력)").setHeading();

    const windows = loadUsageWindows();

    this.addCalibration(
      containerEl,
      "5시간",
      windows.fiveHour.totalTokens,
      windows.fiveHour.isActive,
      (limit) => {
        this.plugin.settings.fiveHourLimit = limit;
      }
    );

    this.addCalibration(
      containerEl,
      "주간",
      windows.weekly.totalTokens,
      windows.weekly.isActive,
      (limit) => {
        this.plugin.settings.weeklyLimit = limit;
      }
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

  private addCalibration(
    containerEl: HTMLElement,
    label: string,
    measured: number,
    isActive: boolean,
    apply: (limit: number) => void
  ): void {
    const desc = isActive
      ? `현재 측정 ${fmtM(measured)} (가중). Claude가 보여주는 %를 입력하면 한도를 자동 계산합니다.`
      : "활성 윈도우가 없어 지금은 보정할 수 없습니다.";

    new Setting(containerEl)
      .setName(`${label} 보정`)
      .setDesc(desc)
      .addText((text) =>
        text
          .setPlaceholder("예: 32")
          .setDisabled(!isActive)
          .onChange(async (value) => {
            const pct = Number(value);
            if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return;
            const limit = Math.round(measured / (pct / 100));
            apply(limit);
            this.plugin.settings.plan = "custom";
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }
}
