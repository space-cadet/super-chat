import type { DocumentCapability, HostDocument } from "super-chat/contracts";

function createBrowserDocuments(id: string): DocumentCapability {
  return {
    id,
    kind: "documents",
    async readDocument() {
      return null;
    },
    async createDocument(document): Promise<HostDocument> {
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
}

/** Browser-based export used by web and Electron hosts. */
export const browserDocuments = createBrowserDocuments("browser-document-export");
export const desktopDocuments = createBrowserDocuments("desktop-document-export");
