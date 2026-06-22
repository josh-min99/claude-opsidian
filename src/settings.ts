import { App, PluginSettingTab, Setting } from "obsidian";
import type ClaudeUsageBarPlugin from "./main";
import { loadUsageWindows } from "./usage";

export type Plan = "pro" | "max5" | "max20" | "custom";

// 윈도우당 추정 한도(비캐시 토큰 기준 = input+output+cacheCreate).
// Pro 값은 실측 2점(5h 32%/39%, 주간 16%)으로 역산: 5h≈0.74M, 주간≈3.5M.
// Max는 플랜 배수(5x/20x). 정확히는 "보정"으로 맞추는 것을 권장.
export const PLAN_LIMITS: Record<Exclude<Plan, "custom">, { fiveHour: number; weekly: number }> = {
  pro: { fiveHour: 740_000, weekly: 3_500_000 },
  max5: { fiveHour: 3_700_000, weekly: 17_500_000 },
  max20: { fiveHour: 14_800_000, weekly: 70_000_000 },
};

export interface ClaudeUsageSettings {
  plan: Plan;
  // plan === "custom" 일 때만 사용. 그 외엔 PLAN_LIMITS에서 계산한다.
  customFiveHourLimit: number;
  customWeeklyLimit: number;
  refreshIntervalSec: number;
}

export const DEFAULT_SETTINGS: ClaudeUsageSettings = {
  plan: "pro",
  customFiveHourLimit: PLAN_LIMITS.pro.fiveHour,
  customWeeklyLimit: PLAN_LIMITS.pro.weekly,
  refreshIntervalSec: 60,
};

// 한도는 저장값이 아니라 플랜에서 계산한다(프리셋 수정이 즉시 반영되도록).
export function effectiveLimits(s: ClaudeUsageSettings): { fiveHour: number; weekly: number } {
  if (s.plan === "custom") {
    return { fiveHour: s.customFiveHourLimit, weekly: s.customWeeklyLimit };
  }
  return PLAN_LIMITS[s.plan];
}

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
      .setDesc("윈도우별 추정 한도를 플랜에 맞춰 계산합니다.")
      .addDropdown((dd) =>
        dd
          .addOption("pro", "Pro")
          .addOption("max5", "Max 5x")
          .addOption("max20", "Max 20x")
          .addOption("custom", "직접 입력")
          .setValue(this.plugin.settings.plan)
          .onChange(async (value) => {
            this.plugin.settings.plan = value as Plan;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    const isCustom = this.plugin.settings.plan === "custom";

    if (isCustom) {
      new Setting(containerEl)
        .setName("한도: 5시간 (비캐시 토큰)")
        .addText((text) =>
          text.setValue(String(this.plugin.settings.customFiveHourLimit)).onChange(async (value) => {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) return;
            this.plugin.settings.customFiveHourLimit = n;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName("한도: 주간 (비캐시 토큰)")
        .addText((text) =>
          text.setValue(String(this.plugin.settings.customWeeklyLimit)).onChange(async (value) => {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) return;
            this.plugin.settings.customWeeklyLimit = n;
            await this.plugin.saveSettings();
          })
        );
    }

    // --- 보정: Claude 앱이 보여주는 실제 % 를 입력하면 현재 측정값으로 한도를 역산한다. ---
    new Setting(containerEl).setName("보정 (Claude 실제 % 입력)").setHeading();

    const windows = loadUsageWindows();

    this.addCalibration(containerEl, "5시간", windows.fiveHour.totalTokens, windows.fiveHour.isActive, (limit) => {
      this.plugin.settings.customFiveHourLimit = limit;
    });

    this.addCalibration(containerEl, "주간", windows.weekly.totalTokens, windows.weekly.isActive, (limit) => {
      this.plugin.settings.customWeeklyLimit = limit;
    });

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
      ? `현재 측정 ${fmtM(measured)} (비캐시). Claude % 를 입력하면 한도를 역산해 '직접 입력'으로 전환합니다.`
      : "활성 윈도우가 없어 지금은 보정할 수 없습니다.";

    new Setting(containerEl)
      .setName(`${label} 보정`)
      .setDesc(desc)
      .addText((text) =>
        text
          .setPlaceholder("예: 39")
          .setDisabled(!isActive)
          .onChange(async (value) => {
            const pct = Number(value);
            if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return;
            apply(Math.round(measured / (pct / 100)));
            this.plugin.settings.plan = "custom";
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }
}
