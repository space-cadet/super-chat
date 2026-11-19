import { desktopDocuments } from "../documents";
import { capacitorDiagnostics } from "./capacitorDiagnostics";
import { browserLifecycle } from "./browserLifecycle";
import { createStandaloneHost } from "./createStandaloneHost";
import { fetchStandaloneHttpRequest, fetchWebSearchRequest } from "./fetchTransport";

/** Desktop currently uses browser file downloads; OS keychain support is pending. */
export const standalonePlatform = "desktop" as const;
export const standaloneHost = createStandaloneHost(standalonePlatform, {
	documents: desktopDocuments,
	diagnostics: capacitorDiagnostics,
	lifecycle: browserLifecycle,
	httpTransport: fetchStandaloneHttpRequest,
	request: fetchWebSearchRequest,
});
