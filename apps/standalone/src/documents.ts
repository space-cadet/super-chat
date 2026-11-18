import { Capacitor, registerPlugin } from "@capacitor/core";
import type { DocumentCapability, HostDocument } from "super-chat/contracts";

const ChatDocuments = registerPlugin<{
  save(options: {
    filename: string;
    content: string;
  }): Promise<{ uri: string }>;
}>("ChatDocuments");

export const standaloneDocuments: DocumentCapability = {
  id: "standalone-document-export",
  kind: "documents",
  async readDocument() {
    return null;
  },
  async createDocument(document): Promise<HostDocument> {
    if (Capacitor.getPlatform() === "android") {
      const result = await ChatDocuments.save({
        filename: document.title,
        content: document.content,
      });
      return { ...document, uri: result.uri };
    }
    const blob = new Blob([document.content], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.title;
    window.document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ...document, uri: document.title };
  },
};
