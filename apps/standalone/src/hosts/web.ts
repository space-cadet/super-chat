import { browserDocuments } from "../documents";
import { browserDiagnostics } from "./browserDiagnostics";
import { browserLifecycle } from "./browserLifecycle";
import { createStandaloneHost } from "./createStandaloneHost";
import { fetchStandaloneHttpRequest, fetchWebSearchRequest } from "./fetchTransport";

export const standalonePlatform = "web" as const;
export const standaloneHost = createStandaloneHost(standalonePlatform, {
	documents: browserDocuments,
	diagnostics: browserDiagnostics,
	lifecycle: browserLifecycle,
	httpTransport: fetchStandaloneHttpRequest,
	request: fetchWebSearchRequest,
});
