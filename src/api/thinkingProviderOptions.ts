// Adapted from obsidian-ai provider reasoning options.
import type { ThinkingMode } from "../core/types";
import { getSdkReasoningLevel } from "./thinkingModes";
export function getThinkingProviderOptions(
  profile: { provider: string; model?: string },
  thinkingMode: ThinkingMode = "provider-default",
): Record<string, any> | undefined {
  const options: Record<string, any> = {};
  if (profile.provider === "codex") options.openai = { store: false };
  const isDeepSeekV32 = /deepseek-v3[.-]2(?:-|$)/i.test(profile.model ?? "");
  if (
    isDeepSeekV32 &&
    (profile.provider === "deepseek" || profile.provider === "openrouter") &&
    (thinkingMode === "enabled" || thinkingMode === "none")
  ) {
    options[profile.provider] =
      profile.provider === "deepseek"
        ? {
            thinking: {
              type: thinkingMode === "enabled" ? "enabled" : "disabled",
            },
          }
        : {
            reasoning: {
              enabled: thinkingMode === "enabled",
            },
          };
    return options;
  }
  if (thinkingMode === "none") {
    if (profile.provider === "openai" || profile.provider === "azure")
      return { openai: { reasoningEffort: "none" } };
    if (profile.provider === "anthropic")
      return { anthropic: { thinking: { type: "disabled" } } };
    if (profile.provider === "google")
      return { google: { thinkingConfig: { thinkingBudget: 0 } } };
  }
  if (thinkingMode === "provider-default" || thinkingMode === "none") {
    if (profile.provider === "openrouter" && thinkingMode === "none") {
      options.openrouter = { reasoning: { effort: "none" } };
    }
    return Object.keys(options).length > 0 ? options : undefined;
  }
  if (profile.provider === "deepseek" && thinkingMode === "enabled") {
    options.deepseek = { thinking: { type: "enabled" } };
  }
  if (profile.provider === "deepseek" && thinkingMode === "max") {
    options.deepseek = { reasoningEffort: "max" };
  }
  if (profile.provider === "openrouter") {
    options.openrouter = {
      reasoning: {
        effort: thinkingMode === "enabled" ? "high" : thinkingMode,
      },
    };
  }
  const level = getSdkReasoningLevel(thinkingMode, profile);
  if (profile.provider === "openai" || profile.provider === "azure")
    options.openai = { reasoningEffort: level };
  if (profile.provider === "anthropic")
    options.anthropic = {
      thinking: {
        type: "enabled",
        budgetTokens:
          thinkingMode === "low"
            ? 1024
            : thinkingMode === "medium"
              ? 4096
              : 8192,
      },
    };
  if (profile.provider === "google")
    options.google = { thinkingConfig: { thinkingLevel: level } };
  return Object.keys(options).length > 0 ? options : undefined;
}
