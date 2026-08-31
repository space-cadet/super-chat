import type {
	ChatMessage,
	ChatModelMessage,
	ChatSession,
	ChatTurn,
	ExternalSessionIdentity,
	SessionPersistenceMetadata,
	SessionWriteContext,
} from "./types";

/** Current format written by the shared engine. */
export const CURRENT_SESSION_SCHEMA_VERSION = 1;
export const SESSION_MIGRATION_ID = "super-chat-session-v1";

export interface SessionLoadReport {
	migratedSessionIds: string[];
	recoveredSessionIds: string[];
	skippedSessionIds: string[];
}

export interface NormalizedSessionResult {
	session: ChatSession | null;
	migrated: boolean;
	recovered: boolean;
}

export function createSessionId(now = Date.now()): string {
	return `sess-${now}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTurnId(now = Date.now()): string {
	return `turn-${now}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSessionPersistenceMetadata(
	previousVersion?: number,
): SessionPersistenceMetadata {
	return {
		schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
		...(previousVersion !== undefined && previousVersion !== CURRENT_SESSION_SCHEMA_VERSION
			? {
					migratedFromVersion: previousVersion,
					migrationId: SESSION_MIGRATION_ID,
				}
				: {}),
	};
}

export function createExternalSessionIdentity(
	namespace: string,
	id: string,
	version?: string,
): ExternalSessionIdentity {
	return { namespace, id, ...(version ? { version } : {}) };
}

export function cloneSession(session: ChatSession): ChatSession {
	return structuredClone(session);
}

export function cloneModelMessages(
	messages: ChatModelMessage[],
): ChatModelMessage[] {
	return messages.map((message) => ({ ...message }));
}

export function createTurn(
	userMessage: ChatMessage,
	modelMessages: ChatModelMessage[],
	now = Date.now(),
): ChatTurn {
	return {
		id: createTurnId(now),
		userMessageId: userMessage.id,
		status: "streaming",
		startedAt: now,
		updatedAt: now,
		toolCalls: [],
		toolResults: {},
		modelMessages: cloneModelMessages(modelMessages),
	};
}

/**
 * Convert older visible-only records into the current durable shape.
 * Invalid entries are skipped by returning null; one bad record must not hide
 * every other saved conversation.
 */
export function normalizePersistedSession(
	value: unknown,
): NormalizedSessionResult {
	if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
		return { session: null, migrated: false, recovered: false };
	}
	if (
		typeof value.title !== "string" ||
		typeof value.createdAt !== "number" ||
		typeof value.updatedAt !== "number" ||
		!Array.isArray(value.messages)
	) {
		return { session: null, migrated: false, recovered: false };
	}

	const rawVersion = getSchemaVersion(value.persistence);
	const migrated = rawVersion !== CURRENT_SESSION_SCHEMA_VERSION;
	const messages = value.messages.filter(isChatMessage);
	const recovered = messages.length !== value.messages.length;
	const turns = normalizeTurns(value.turns);
	const modelHistory = normalizeModelHistory(value.modelHistory);

	const session: ChatSession = {
		id: value.id,
		title: value.title,
		createdAt: value.createdAt,
		updatedAt: value.updatedAt,
		messages,
		persistence: createSessionPersistenceMetadata(rawVersion),
		...(isExternalIdentity(value.externalIdentity)
			? { externalIdentity: value.externalIdentity }
			: {}),
		...(turns ? { turns } : {}),
		...(modelHistory ? { modelHistory } : {}),
		...(typeof value.llmProvider === "string"
			? { llmProvider: value.llmProvider }
			: {}),
		...(typeof value.llmModel === "string" ? { llmModel: value.llmModel } : {}),
		...(typeof value.archived === "boolean" ? { archived: value.archived } : {}),
		...(isRecord(value.metadata) ? { metadata: value.metadata } : {}),
	};

	// Visible messages are the safe fallback for records written before the
	// model-history field existed. This preserves continuation without inventing
	// provider-specific tool messages.
	if (!session.modelHistory) {
		session.modelHistory = messages.map(({ role, content }) => ({ role, content }));
	}

	return { session, migrated, recovered };
}

function getSchemaVersion(value: unknown): number {
	if (isRecord(value) && typeof value.schemaVersion === "number") {
		return value.schemaVersion;
	}
	return 0;
}

function normalizeTurns(value: unknown): ChatTurn[] | null {
	if (!Array.isArray(value)) return null;
	return value.filter(isChatTurn).map((turn) => ({
		...turn,
		toolCalls: turn.toolCalls.map((call) => ({ ...call, args: { ...call.args } })),
		toolResults: { ...turn.toolResults },
		modelMessages: cloneModelMessages(turn.modelMessages),
	}));
}

function normalizeModelHistory(value: unknown): ChatModelMessage[] | null {
	if (!Array.isArray(value)) return null;
	const messages = value.filter(isModelMessage);
	return messages.length === value.length ? cloneModelMessages(messages) : null;
}

function isChatMessage(value: unknown): value is ChatMessage {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		(value.role === "user" || value.role === "assistant" || value.role === "system") &&
		typeof value.content === "string" &&
		typeof value.timestamp === "number"
	);
}

function isModelMessage(value: unknown): value is ChatModelMessage {
	return isRecord(value) && typeof value.role === "string" && typeof value.content === "string";
}

function isChatTurn(value: unknown): value is ChatTurn {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.userMessageId === "string" &&
		(value.status === "streaming" ||
			value.status === "completed" ||
			value.status === "cancelled" ||
			value.status === "failed") &&
		typeof value.startedAt === "number" &&
		typeof value.updatedAt === "number" &&
		Array.isArray(value.toolCalls) &&
		Array.isArray(value.modelMessages) &&
		value.toolCalls.every(isToolCall) &&
		isRecord(value.toolResults) &&
		Object.values(value.toolResults).every(isToolResult) &&
		value.modelMessages.every(isModelMessage)
	);
}

function isToolCall(value: unknown): boolean {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		isRecord(value.args)
	);
}

function isToolResult(value: unknown): boolean {
	return isRecord(value);
}

function isExternalIdentity(value: unknown): value is ExternalSessionIdentity {
	return (
		isRecord(value) &&
		typeof value.namespace === "string" &&
		typeof value.id === "string" &&
		(value.version === undefined || typeof value.version === "string")
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEngineWrite(context: SessionWriteContext | undefined): boolean {
	return context?.owner === "chat-engine";
}
