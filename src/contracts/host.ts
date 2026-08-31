import type {
	ChatSession,
	RetrievalResult,
	ToolCall,
	ToolDefinition,
	ToolResult,
} from "../core/types";

export type HostCapabilityKind =
	| "identity"
	| "persistence"
	| "credentials"
	| "tools"
	| "retrieval"
	| "documents"
	| "navigation"
	| "notifications"
	| "lifecycle";

/** Information passed to a host service for one piece of work. */
export interface HostOperationContext {
	requestId: string;
	signal?: AbortSignal;
}

export interface HostCapabilityBase {
	id: string;
	kind: HostCapabilityKind;
	version?: string;
}

export interface HostIdentity {
	id: string;
	displayName?: string;
	email?: string;
	metadata?: Record<string, unknown>;
}

export interface IdentityCapability extends HostCapabilityBase {
	kind: "identity";
	getIdentity(context: HostOperationContext): Promise<HostIdentity | null>;
	subscribe?(listener: (identity: HostIdentity | null) => void): () => void;
}

export interface ChatPersistenceCapability extends HostCapabilityBase {
	kind: "persistence";
	schemaVersion: number;
	loadSessions(context: HostOperationContext): Promise<ChatSession[]>;
	saveSession(
		session: ChatSession,
		context: HostOperationContext,
	): Promise<void>;
	deleteSession(
		sessionId: string,
		context: HostOperationContext,
	): Promise<void>;
	archiveSession(
		sessionId: string,
		context: HostOperationContext,
	): Promise<void>;
}

export interface CredentialReference {
	id: string;
	label: string;
	provider?: string;
	metadata?: Record<string, unknown>;
}

export interface CredentialCapability extends HostCapabilityBase {
	kind: "credentials";
	listCredentials(
		context: HostOperationContext,
	): Promise<CredentialReference[]>;
	getCredential(
		credentialId: string,
		context: HostOperationContext,
	): Promise<string | null>;
	setCredential?(
		credential: CredentialReference,
		secret: string,
		context: HostOperationContext,
	): Promise<void>;
	deleteCredential?(
		credentialId: string,
		context: HostOperationContext,
	): Promise<void>;
}

export type ToolRisk = "read" | "write" | "destructive" | "external";
export type ToolApprovalPolicy = "never" | "always" | "host-policy";

export interface HostToolDescriptor extends ToolDefinition {
	title: string;
	risk: ToolRisk;
	approval: ToolApprovalPolicy;
	/** True when repeating the same call is safe. */
	idempotent?: boolean;
}

export interface ToolCapability extends HostCapabilityBase {
	kind: "tools";
	getTools(context: HostOperationContext): Promise<HostToolDescriptor[]>;
	executeTool(
		call: ToolCall,
		context: HostOperationContext,
	): Promise<ToolResult>;
}

export interface RetrievalRequest {
	query: string;
	maxResults?: number;
	filters?: Record<string, unknown>;
}

export interface RetrievedSource {
	id: string;
	title: string;
	content: string;
	uri?: string;
	score?: number;
	metadata?: Record<string, unknown>;
	/** Details that show where this result came from. */
	provenance: {
		capabilityId: string;
		sourceId: string;
		retrievedAt: number;
	};
}

export interface RetrievalCapability extends HostCapabilityBase {
	kind: "retrieval";
	 retrieve(
		request: RetrievalRequest,
		context: HostOperationContext,
	): Promise<RetrievedSource[] | RetrievalResult>;
}

export interface HostDocument {
	id: string;
	title: string;
	content: string;
	uri?: string;
	version?: string;
	metadata?: Record<string, unknown>;
}

export interface DocumentWrite {
	content: string;
	expectedVersion?: string;
	metadata?: Record<string, unknown>;
}

export interface DocumentCapability extends HostCapabilityBase {
	kind: "documents";
	readDocument(
		documentId: string,
		context: HostOperationContext,
	): Promise<HostDocument | null>;
	writeDocument?(
		documentId: string,
		write: DocumentWrite,
		context: HostOperationContext,
	): Promise<HostDocument>;
	createDocument?(
		document: Omit<HostDocument, "version">,
		context: HostOperationContext,
	): Promise<HostDocument>;
}

export interface NavigationTarget {
	type: "document" | "session" | "settings" | "external" | "custom";
	id?: string;
	uri?: string;
	metadata?: Record<string, unknown>;
}

export interface NavigationCapability extends HostCapabilityBase {
	kind: "navigation";
	navigate(
		target: NavigationTarget,
		context: HostOperationContext,
	): Promise<void>;
}

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface HostNotification {
	message: string;
	level?: NotificationLevel;
	detail?: string;
}

export interface NotificationCapability extends HostCapabilityBase {
	kind: "notifications";
	notify(
		notification: HostNotification,
		context: HostOperationContext,
	): Promise<void> | void;
}

export interface LifecycleCapability extends HostCapabilityBase {
	kind: "lifecycle";
	start?(context: HostOperationContext): Promise<void> | void;
	stop?(context: HostOperationContext): Promise<void> | void;
	subscribeVisibility?(
		listener: (visible: boolean) => void,
	): () => void;
}

export interface SuperChatCapabilities {
	identity?: IdentityCapability;
	persistence?: ChatPersistenceCapability;
	credentials?: CredentialCapability;
	tools?: ToolCapability;
	retrieval?: RetrievalCapability;
	documents?: DocumentCapability;
	navigation?: NavigationCapability;
	notifications?: NotificationCapability;
	lifecycle?: LifecycleCapability;
}

/**
 * A product that runs super-chat.
 *
 * Each optional entry in `capabilities` is one service the product offers,
 * such as saving chats, searching papers, or opening a document.
 */
export interface SuperChatHost {
	id: string;
	name: string;
	version?: string;
	capabilities: SuperChatCapabilities;
}

export type HostCapability = NonNullable<
	SuperChatCapabilities[keyof SuperChatCapabilities]
>;
