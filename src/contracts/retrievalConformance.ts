import type {
	HostOperationContext,
	RetrievalCapability,
	RetrievalRequest,
} from "./host";

export type RetrievalResponseKind = "array" | "result" | "invalid" | "error";

export interface RetrievalConformanceIssue {
	path: string;
	message: string;
}

export interface RetrievalConformanceReport {
	valid: boolean;
	responseKind: RetrievalResponseKind;
	status?: "complete" | "partial" | "unavailable" | "unauthorized" | "cancelled";
	sourceCount: number;
	issues: RetrievalConformanceIssue[];
}

export interface RetrievalConformanceOptions {
	capability: RetrievalCapability;
	request?: RetrievalRequest;
	context?: HostOperationContext;
}

/** Validate one host retrieval response without executing provider work. */
export function validateRetrievalResponse(
	value: unknown,
	capabilityId: string,
): RetrievalConformanceReport {
	const issues: RetrievalConformanceIssue[] = [];
	const responseKind: RetrievalResponseKind = Array.isArray(value)
		? "array"
		: isRecord(value) && Array.isArray(value.sources)
			? "result"
			: "invalid";
	if (responseKind === "invalid") {
		return {
			valid: false,
			responseKind,
			sourceCount: 0,
			issues: [{ path: "response", message: "Expected a source array or retrieval result." }],
		};
	}

	const sources: unknown[] = responseKind === "array"
		? (value as unknown[])
		: (value as Record<string, unknown>).sources as unknown[];
	const result = responseKind === "result" ? (value as Record<string, unknown>) : undefined;
	const status = result ? normalizeStatus(result.status) : "complete";
	if (result && result.status !== undefined && !status) {
		issues.push({ path: "response.status", message: "Retrieval status is invalid." });
	}

	if (result && result.warnings !== undefined &&
		(!Array.isArray(result.warnings) || !result.warnings.every((warning) => typeof warning === "string"))) {
		issues.push({ path: "response.warnings", message: "Retrieval warnings must be strings." });
	}

	const error = result?.error;
	const validError = error === undefined || isRetrievalError(error);
	if (!validError) {
		issues.push({ path: "response.error", message: "Retrieval error is invalid." });
	}
	if (status && ["unavailable", "unauthorized", "cancelled"].includes(status) && error === undefined) {
		issues.push({ path: "response.error", message: `${status} retrieval must include an error.` });
	}
	if (status === "complete" && error !== undefined) {
		issues.push({ path: "response.error", message: "Complete retrieval must not include an error." });
	}

	const seenIdentities = new Set<string>();
	const seenIds = new Set<string>();
	for (const [index, source] of sources.entries()) {
		const path = `response.sources[${index}]`;
		if (!isRecord(source)) {
			issues.push({ path, message: "Retrieved source must be an object." });
			continue;
		}
		if (typeof source.id !== "string" || !source.id) {
			issues.push({ path: `${path}.id`, message: "Source ID must be non-empty." });
		}
		if (typeof source.title !== "string" || !source.title) {
			issues.push({ path: `${path}.title`, message: "Source title must be non-empty." });
		}
		if (typeof source.content !== "string" || !source.content) {
			issues.push({ path: `${path}.content`, message: "Source content must be non-empty." });
		}
		if (source.uri !== undefined && typeof source.uri !== "string") {
			issues.push({ path: `${path}.uri`, message: "Source URI must be a string." });
		}
		if (source.score !== undefined &&
			(typeof source.score !== "number" || !Number.isFinite(source.score))) {
			issues.push({ path: `${path}.score`, message: "Source score must be finite." });
		}
		if (source.metadata !== undefined && !isRecord(source.metadata)) {
			issues.push({ path: `${path}.metadata`, message: "Source metadata must be an object." });
		}

		const provenance = source.provenance;
		if (!isRecord(provenance)) {
			issues.push({ path: `${path}.provenance`, message: "Source provenance is required." });
			continue;
		}
		if (typeof provenance.capabilityId !== "string" || !provenance.capabilityId) {
			issues.push({ path: `${path}.provenance.capabilityId`, message: "Capability ID must be non-empty." });
		} else if (provenance.capabilityId !== capabilityId) {
			issues.push({ path: `${path}.provenance.capabilityId`, message: "Capability ID does not match the host capability." });
		}
		if (typeof provenance.sourceId !== "string" || !provenance.sourceId) {
			issues.push({ path: `${path}.provenance.sourceId`, message: "Provenance source ID must be non-empty." });
		}
		if (typeof provenance.retrievedAt !== "number" || !Number.isFinite(provenance.retrievedAt)) {
			issues.push({ path: `${path}.provenance.retrievedAt`, message: "Retrieval timestamp must be finite." });
		}

		if (typeof source.id === "string" && source.id) {
			if (seenIds.has(source.id)) {
				issues.push({ path: `${path}.id`, message: "Source ID must be unique within a response." });
			}
			seenIds.add(source.id);
		}
		if (typeof provenance.capabilityId === "string" && provenance.capabilityId &&
			typeof provenance.sourceId === "string" && provenance.sourceId) {
			const identity = `${provenance.capabilityId}\u0000${provenance.sourceId}`;
			if (seenIdentities.has(identity)) {
				issues.push({ path: `${path}.provenance`, message: "Capability/source identity must be unique within a response." });
			}
			seenIdentities.add(identity);
		}
	}

	return {
		valid: issues.length === 0,
		responseKind,
		...(status ? { status } : {}),
		sourceCount: sources.length,
		issues,
	};
}

/** Execute a retrieval capability once and validate its public response. */
export async function runRetrievalConformance(
	options: RetrievalConformanceOptions,
): Promise<RetrievalConformanceReport> {
	const request = options.request ?? {
		query: "super-chat retrieval conformance",
		maxResults: 3,
	};
	const context = options.context ?? {
		requestId: "super-chat-retrieval-conformance",
	};
	try {
		const response = await options.capability.retrieve(request, context);
		return validateRetrievalResponse(response, options.capability.id);
	} catch (error) {
		return {
			valid: false,
			responseKind: "error",
			sourceCount: 0,
			issues: [{
				path: "retrieve",
				message: error instanceof Error ? error.message : String(error),
			}],
		};
	}
}

function normalizeStatus(value: unknown): RetrievalConformanceReport["status"] | undefined {
	return value === undefined || value === "complete" || value === "partial" ||
		value === "unavailable" || value === "unauthorized" || value === "cancelled"
		? value ?? "complete"
		: undefined;
}

function isRetrievalError(value: unknown): boolean {
	return isRecord(value) &&
		(value.code === "cancelled" || value.code === "unauthorized" ||
			value.code === "unavailable" || value.code === "invalid-response" ||
			value.code === "failed") &&
		typeof value.message === "string" && value.message.length > 0 &&
		(value.retryable === undefined || typeof value.retryable === "boolean");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
