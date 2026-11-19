import { describe, expect, it } from "vitest";
import { dispatchLocalCommand } from "./localCommands";
describe("local composer commands", () => {
 it("intercepts supported and unknown debug subcommands locally", async () => {
  const context = { session: null, settings: {} };
  expect((await dispatchLocalCommand("!help", context)).output).toContain("!debug history");
  expect((await dispatchLocalCommand("!debug nonsense", context)).handled).toBe(true);
  expect((await dispatchLocalCommand("ordinary message", context)).handled).toBe(false);
 });
 it("reports missing compaction instead of claiming success", async () => {
  expect((await dispatchLocalCommand("!debug compact", { session: null, settings: {} })).output).toContain("unavailable");
 });
 it("uses explicit runtime compaction when provided", async () => {
  expect((await dispatchLocalCommand("!debug compact", { session: null, settings: {}, compact: async () => "Saved summary" })).output).toBe("Saved summary");
 });
});
