// Adapted from obsidian-ai AttachmentEngine.
export interface AttachmentReader {
  readBinary(path: string): Promise<ArrayBuffer>;
  readText(path: string): Promise<string>;
}

import type { Attachment } from "../core/types";

/** Maximum image dimension before resizing (px) */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1024;

/** Supported image MIME types */
const IMAGE_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};

/** Check if a file extension is a supported image type */
function isImageFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ext in IMAGE_MIME_TYPES;
}

/** Check if a file extension is PDF */
function isPdfFile(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

/** Check if a file extension is markdown */
function isMarkdownFile(path: string): boolean {
  return path.toLowerCase().endsWith(".md");
}

/**
 * Resize an image to fit within maxDimension while maintaining aspect ratio.
 * Uses HTML Canvas API (available in Obsidian's Electron environment).
 */
async function resizeImage(
  dataUrl: string,
  maxDimension: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(dataUrl); // No resize needed
        return;
      }
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Failed to load image for resizing"));
    img.src = dataUrl;
  });
}

/** Convert ArrayBuffer to base64 data URL */
function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}

/** Extract base64 string from data URL */
function extractBase64FromDataUrl(dataUrl: string): string {
  return dataUrl.split(",")[1] ?? "";
}

async function readFileAsArrayBuffer(
  reader: AttachmentReader | undefined,
  path: string,
): Promise<ArrayBuffer> {
  if (!reader)
    throw new Error("This host cannot read the attached file: " + path);
  return reader.readBinary(path);
}

async function readMarkdownFile(
  reader: AttachmentReader | undefined,
  path: string,
): Promise<string> {
  if (!reader)
    throw new Error("This host cannot read the attached file: " + path);
  return reader.readText(path);
}

/** Convert a File (from file input or drag-and-drop) to an Attachment with inline data. */
export async function createExternalAttachment(
  file: File,
): Promise<Attachment> {
  if (file.size > MAX_ATTACHMENT_BYTES)
    throw new Error("Files must be 20 MB or smaller: " + file.name);
  const arrayBuffer = await file.arrayBuffer();
  let base64 = arrayBufferToBase64(arrayBuffer);
  const name = file.name;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  let type: Attachment["type"] = "file";
  let mimeType = file.type || "application/octet-stream";

  if (ext in IMAGE_MIME_TYPES) {
    type = "image";
    mimeType = IMAGE_MIME_TYPES[ext];
  } else if (ext === "pdf") {
    type = "pdf";
    mimeType = "application/pdf";
  } else if (ext === "md" || ext === "txt") {
    type = "markdown";
    mimeType = "text/plain";
  }

  if (type === "image") {
    const resized = await resizeImage(
      arrayBufferToDataUrl(arrayBuffer, mimeType),
      MAX_IMAGE_DIMENSION,
    );
    mimeType = resized.slice(5, resized.indexOf(";"));
    base64 = extractBase64FromDataUrl(resized);
  }

  if (type === "file")
    throw new Error("Attach an image, PDF, Markdown, or text file: " + name);
  return {
    id: crypto.randomUUID(),
    type,
    path: name, // original filename as path
    name,
    data: base64,
    mimeType,
  };
}

/** Convert ArrayBuffer to base64 string (no data URL prefix). */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Resolve an attachment to AI SDK content parts.
 *
 * Returns an array of content parts compatible with Vercel AI SDK v6:
 * - Markdown → text parts
 * - Image → image parts (base64)
 * - PDF → file parts (supported providers) or text placeholder
 * - External files → use inline data if present, else read from vault
 */
export async function resolveAttachment(
  attachment: Attachment,
  app: AttachmentReader | undefined,
  provider: string,
): Promise<
  Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string }
    | { type: "file"; data: string; mediaType: string }
  >
> {
  const { path, name, type, data } = attachment;

  // ─── External file with inline data ───
  if (data) {
    // Image with inline data
    if (type === "image") {
      return [
        {
          type: "image",
          image:
            "data:" + (attachment.mimeType ?? "image/png") + ";base64," + data,
        },
      ];
    }
    // PDF with inline data
    if (type === "pdf") {
      if (
        provider === "gemini" ||
        provider === "google" ||
        provider === "azure" ||
        provider === "openai" ||
        provider === "codex" ||
        provider === "anthropic" ||
        provider === "openrouter"
      ) {
        return [{ type: "file", data, mediaType: "application/pdf" }];
      }
      return [
        {
          type: "text",
          text: `[PDF attached: ${name}]\n\nNote: PDF content extraction is not yet supported for ${provider}.`,
        },
      ];
    }
    // Markdown/text with inline data
    if (type === "markdown" || type === "file") {
      try {
        const text = new TextDecoder().decode(
          Uint8Array.from(atob(data), (character) => character.charCodeAt(0)),
        );
        return [
          {
            type: "text",
            text: `---\nFile: ${name}\n---\n\n${text}`,
          },
        ];
      } catch {
        return [
          {
            type: "text",
            text: `[Attached file: ${name}]\n\nNote: Could not decode file content.`,
          },
        ];
      }
    }
  }

  // ─── Markdown (vault file) ───
  if (type === "markdown" || isMarkdownFile(path)) {
    const content = await readMarkdownFile(app, path);
    const header = `---\nFile: ${name}\nPath: ${path}\n---\n\n`;
    return [{ type: "text", text: header + content }];
  }

  // ─── Image (vault file) ───
  if (type === "image" || isImageFile(path)) {
    const ext = path.split(".").pop()?.toLowerCase() ?? "png";
    const mimeType = IMAGE_MIME_TYPES[ext] ?? "image/png";
    const buffer = await readFileAsArrayBuffer(app, path);
    let dataUrl = arrayBufferToDataUrl(buffer, mimeType);

    // Resize if needed (canvas-based)
    try {
      dataUrl = await resizeImage(dataUrl, MAX_IMAGE_DIMENSION);
    } catch (e) {
      console.warn(`[AttachmentEngine] Image resize failed for ${path}:`, e);
    }

    return [{ type: "image", image: dataUrl }];
  }

  // ─── PDF (vault file) ───
  if (type === "pdf" || isPdfFile(path)) {
    const buffer = await readFileAsArrayBuffer(app, path);
    const base64 =
      arrayBufferToDataUrl(buffer, "application/pdf").split(",")[1] ?? "";

    // Providers with native FilePart support
    if (
      provider === "gemini" ||
      provider === "google" ||
      provider === "azure" ||
      provider === "openai" ||
      provider === "codex" ||
      provider === "anthropic" ||
      provider === "openrouter"
    ) {
      return [
        {
          type: "file",
          data: base64,
          mediaType: "application/pdf",
        },
      ];
    }

    // Other providers: return placeholder text
    return [
      {
        type: "text",
        text: `[PDF attached: ${name}]\n\nNote: PDF content extraction is not yet supported for ${provider}. The PDF is available at: ${path}`,
      },
    ];
  }

  // ─── Unknown ───
  return [
    {
      type: "text",
      text: `[Attached file: ${name}]\nPath: ${path}\nType: ${type}\n\nNote: This file type is not directly supported.`,
    },
  ];
}

/**
 * Resolve multiple attachments to a flat list of content parts.
 */
export async function resolveAttachments(
  attachments: Attachment[],
  app: AttachmentReader | undefined,
  provider: string,
): Promise<
  Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string }
    | { type: "file"; data: string; mediaType: string }
  >
> {
  const parts: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string }
    | { type: "file"; data: string; mediaType: string }
  > = [];

  for (const attachment of attachments) {
    parts.push(...(await resolveAttachment(attachment, app, provider)));
  }

  return parts;
}

/**
 * Detect attachment type from file path.
 */
export function detectAttachmentType(path: string): Attachment["type"] {
  if (isMarkdownFile(path)) return "markdown";
  if (isImageFile(path)) return "image";
  if (isPdfFile(path)) return "pdf";
  return "markdown"; // Default fallback
}

/**
 * Create an Attachment from a vault file path.
 */
export function createAttachment(path: string): Attachment {
  const name = path.split("/").pop() ?? path;
  return {
    id: crypto.randomUUID(),
    type: detectAttachmentType(path),
    path,
    name,
  };
}
