import { CapacitorHttp } from "@capacitor/core";
import { capacitorDiagnostics } from "./capacitorDiagnostics";
import { androidCredentialCapability } from "../androidCredentials";
import { androidDocuments } from "../androidDocuments";
import { androidLifecycle } from "../lifecycle";
import { createStandaloneHost } from "./createStandaloneHost";
import type { StandaloneHttpRequest } from "./createStandaloneHost";

async function androidHttpRequest(request: StandaloneHttpRequest) {
	request.signal?.throwIfAborted();
	const headers = request.headers ?? {};
	const isJson = Object.entries(headers).some(([name, value]) =>
		name.toLowerCase() === "content-type" && value.toLowerCase().includes("json"),
	);
	const response = await CapacitorHttp.request({
		url: request.url,
		method: request.method,
		headers,
		data: request.body && isJson ? JSON.parse(request.body) : request.body,
		responseType: "text",
		connectTimeout: request.timeoutMs ?? 30_000,
		readTimeout: request.timeoutMs ?? 30_000,
	});
	request.signal?.throwIfAborted();
	return {
		status: response.status,
		text: typeof response.data === "string" ? response.data : JSON.stringify(response.data),
		headers: response.headers,
	};
}

export const standalonePlatform = "android" as const;
export const standaloneHost = createStandaloneHost(standalonePlatform, {
	documents: androidDocuments,
	diagnostics: capacitorDiagnostics,
	lifecycle: androidLifecycle,
	credentials: androidCredentialCapability,
	httpTransport: androidHttpRequest,
	request: async (request, signal) => {
		const result = await androidHttpRequest({ ...request, signal });
		return {
			status: result.status,
			text: result.text,
		};
	},
});
