/**
 * Rough token estimation using characters / 4.
 * This is intentionally approximate — exact per-model tokenizers are deferred.
 */
export const TOKEN_ESTIMATE_RATIO = 4;

export function estimateTokens(text: string): number {
	return Math.ceil(text.length / TOKEN_ESTIMATE_RATIO);
}
