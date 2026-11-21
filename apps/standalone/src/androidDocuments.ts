import { requireOwnerSession, assertOwnerSession } from './ownerSession';
import { registerPlugin } from "@capacitor/core";
import type { DocumentCapability, HostDocument } from "super-chat/contracts";

const ChatDocuments = registerPlugin<{
	cancel(options: { token: string }): Promise<void>;
 save(options: { filename: string; content: string; token: string }): Promise<{ uri: string }>;
}>("ChatDocuments");

/** Native Android document picker/export capability. */
export const androidDocuments: DocumentCapability = {
	id: "android-document-export",
	kind: "documents",
	async readDocument() {
		return null;
	},
	async createDocument(document): Promise<HostDocument> {
		const owner = requireOwnerSession();
  const token = crypto.randomUUID();
  const cancel = () => { void ChatDocuments.cancel({ token }).catch(() => undefined); };
  owner.signal.addEventListener("abort", cancel, { once: true });
  try {
  const result = await ChatDocuments.save({
   token,
			filename: document.title,
			content: document.content,
		});
		assertOwnerSession(owner);
  return { ...document, uri: result.uri };
  } finally { owner.signal.removeEventListener("abort", cancel); }
	},
};
