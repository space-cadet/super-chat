import type { StandaloneHttpRequest } from "./createStandaloneHost";
import type { StandaloneWebRequester } from "../searchDocuments";

export async function fetchStandaloneHttpRequest(request: StandaloneHttpRequest) {
	const response = await fetch(request.url, {
		method: request.method,
		headers: request.headers,
		body: request.body,
		signal: request.signal ?? AbortSignal.timeout(request.timeoutMs ?? 30_000),
	});
	return {
		status: response.status,
		text: await response.text(),
		headers: Object.fromEntries(response.headers.entries()),
	};
}

export const fetchWebSearchRequest: StandaloneWebRequester = async (request, signal) => {
	const response = await fetch(request.url, { ...request, signal });
	return { status: response.status, text: await response.text() };
};
