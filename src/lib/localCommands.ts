import type { ChatSession, ChatSettings } from "../core/types";
import { estimateTokens } from "../core/tokenEstimator";
import { formatBuiltinCommandReference } from "./builtinCommands";

export interface LocalCommandContext { session: ChatSession | null; settings: Partial<ChatSettings>; compact?: () => Promise<string> }
export async function dispatchLocalCommand(text: string, context: LocalCommandContext): Promise<{ handled: boolean; output: string }> {
 const command = text.trim().toLowerCase().replace(/\s+/g, " ");
 if (!/^!(help|debug)(\s|$)/.test(command)) return { handled: false, output: "" };
 let output: string;
 switch (command) {
  case "!help": case "!debug": case "!debug help": output = formatBuiltinCommandReference(); break;
  case "!debug history": output = JSON.stringify(context.session?.modelHistory ?? [], null, 2); break;
  case "!debug tokens": output = JSON.stringify({ estimatedTranscriptTokens: (context.session?.messages ?? []).reduce((total, message) => total + estimateTokens(message.content), 0), maxContextTokens: context.settings.maxContextTokens, toolCalls: (context.session?.messages ?? []).reduce((total, message) => total + (message.toolCalls?.length ?? 0), 0) }, null, 2); break;
  case "!debug context": { const message = [...(context.session?.messages ?? [])].reverse().find(message => message.role === "user"); output = JSON.stringify({ attachments: message?.attachments?.map(attachment => ({ id: attachment.id, name: attachment.name, type: attachment.type })) ?? [] }, null, 2); break; }
  case "!debug compact": output = context.compact ? await context.compact() : "Manual compaction is unavailable in this runtime. The full transcript is preserved."; break;
  default: output = `Unknown local command: ${command}\n\n${formatBuiltinCommandReference()}`;
 }
 return { handled: true, output };
}
