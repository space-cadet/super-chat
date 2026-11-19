import { registerPlugin } from "@capacitor/core";
import type { DocumentCapability, HostDocument } from "super-chat/contracts";

const ChatDocuments = registerPlugin<{
	save(options: { filename: string; content: string }): Promise<{ uri: string }>;
}>("ChatDocuments");

/** Native Android document picker/export capability. */
export const androidDocuments: DocumentCapability = {
	id: "android-document-export",
	kind: "documents",
	async readDocument() {
		return null;
	},
	async createDocument(document): Promise<HostDocument> {
		const result = await ChatDocuments.save({
			filename: document.title,
			content: document.content,
		});
		return { ...document, uri: result.uri };
	},
};
