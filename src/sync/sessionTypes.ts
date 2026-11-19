import type { ChatSession as CoreChatSession } from "../core/types";
export type ChatSession = CoreChatSession & { hydrated?: boolean };
