import { describe, expect, it, vi } from "vitest";
import { convertToModelMessages, type UIMessage } from "ai";
import {
  createExternalAttachment,
  resolveAttachment,
} from "./AttachmentEngine";
import { ChatEngine } from "../core/ChatEngine";
import {
  createProviderProfile,
  VercelLLMAdapter,
} from "../adapters/VercelLLMAdapter";
import type {
  Attachment,
  ChatModelMessage,
  ChatSession,
  LLMAdapter,
  PersistenceAdapter,
} from "../core/types";
import { getThinkingProviderOptions } from "../api/thinkingProviderOptions";

const textAttachment: Attachment = {
  id: "text",
  type: "markdown",
  path: "notes.md",
  name: "notes.md",
  data: btoa(String.fromCharCode(...new TextEncoder().encode("中文 and café"))),
  mimeType: "text/plain",
};

describe("ported attachments", () => {
  it("reads UTF-8 external text and supplies actual PDF and image content to the SDK", async () => {
    const external = await createExternalAttachment({
      name: "notes.md",
      type: "text/plain",
      size: 16,
      arrayBuffer: async () => new TextEncoder().encode("中文 and café").buffer,
    } as File);
    expect(
      (await resolveAttachment(external, undefined, "openrouter"))[0],
    ).toMatchObject({
      type: "text",
      text: expect.stringContaining("中文 and café"),
    });
    const adapter = new VercelLLMAdapter({
      profile: createProviderProfile("openrouter", "test", ""),
    });
    const converter = adapter as unknown as {
      toUIMessages(messages: ChatModelMessage[]): Promise<UIMessage[]>;
    };
    const messages = await converter.toUIMessages([
      {
        role: "user",
        content: "Read these",
        attachments: [
          external,
          {
            id: "pdf",
            type: "pdf",
            path: "paper.pdf",
            name: "paper.pdf",
            data: btoa("%PDF-1.4"),
            mimeType: "application/pdf",
          },
          {
            id: "image",
            type: "image",
            path: "image.png",
            name: "image.png",
            data: btoa("png"),
            mimeType: "image/png",
          },
        ],
      },
    ]);
    const modelMessages = await convertToModelMessages(messages);
    expect(modelMessages[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "text",
          text: expect.stringContaining("中文 and café"),
        }),
        expect.objectContaining({ type: "file", mediaType: "application/pdf" }),
        expect.objectContaining({ type: "file", mediaType: "image/png" }),
      ]),
    );
  });

  it("keeps attachment bytes and thinking choice through tool turns, reload, and replay", async () => {
    const stored = new Map<string, ChatSession>();
    const captured: ChatModelMessage[][] = [];
    const persistence: PersistenceAdapter = {
      loadSessions: async () => [...stored.values()],
      saveSession: async (session) => {
        stored.set(session.id, structuredClone(session));
      },
      deleteSession: async (id) => {
        stored.delete(id);
      },
      archiveSession: async () => undefined,
    };
    const llm: LLMAdapter = {
      streamChat: async function* () {
        yield "Read it.";
      },
      streamChatWithTools: vi.fn(
        async function* (messages, _tools, _signal, request) {
          captured.push(structuredClone(messages));
          expect(request?.thinkingMode).toBe("high");
          yield {
            type: "reasoning-delta" as const,
            text: "Inspecting the file.",
          };
          yield { type: "text-delta" as const, text: "Read it." };
          yield { type: "finish" as const, reason: "stop" };
        },
      ),
      getProviders: () => [{ id: "openrouter", name: "OpenRouter" }],
      getModels: () => [],
      testConnection: async () => ({ ok: true, message: "OK" }),
    };
    const options = {
      llmAdapter: llm,
      persistenceAdapter: persistence,
      toolAdapter: {
        getAvailableTools: () => [
          { name: "read", description: "Read", parameters: {} },
        ],
        executeTool: async () => ({ content: "Read" }),
      },
    };
    const engine = new ChatEngine(options);
    const session = engine.createSession("Files");
    await engine.updateSessionMetadata(session.id, {
      thinkingMode: "high",
      draftAttachments: [textAttachment],
    });
    for await (const _event of engine.sendMessage("Read", {
      attachments: [textAttachment],
    })) {
      /* drain */
    }
    expect(
      captured[0].find((message) => message.role === "user")?.attachments,
    ).toEqual([textAttachment]);
    expect(
      engine
        .getActiveSession()!
        .messages.find((message) => message.role === "assistant")?.reasoning,
    ).toBe("Inspecting the file.");
    const originalUser = engine
      .getActiveSession()!
      .messages.find((message) => message.role === "user")!;
    engine.dispose();

    const restored = new ChatEngine(options);
    await restored.loadSessions();
    expect(restored.getActiveSession()?.draftAttachments).toEqual([
      textAttachment,
    ]);
    for await (const _event of restored.replayMessage(originalUser.id)) {
      /* drain */
    }
    expect(captured.at(-1)?.at(-1)?.content).toBe("Read");
    expect(captured.at(-1)?.at(-1)?.attachments).toEqual([textAttachment]);
    restored.dispose();
  });

  it("maps explicit thinking choices into supported provider options", () => {
    expect(
      getThinkingProviderOptions(
        { provider: "openrouter", model: "openai/gpt-5" },
        "high",
      ),
    ).toMatchObject({ openrouter: { reasoning: { effort: "high" } } });
    expect(
      getThinkingProviderOptions(
        { provider: "openai", model: "gpt-5" },
        "none",
      ),
    ).toMatchObject({ openai: { reasoningEffort: "none" } });
  });
  it("preserves supplied system context and rejects a latest attachment that exceeds the model budget", async () => {
    const profile = createProviderProfile("openrouter", "small", "", {
      models: [{ id: "small", name: "Small", contextWindow: 100 }],
    });
    const adapter = new VercelLLMAdapter({
      profile,
      systemPrompt: "Base instructions",
    });
    const prepare = adapter as unknown as {
      prepareRequest(
        messages: ChatModelMessage[],
      ): Promise<{ system?: string; messages: unknown[] }>;
    };
    const prepared = await prepare.prepareRequest([
      { role: "system", content: "Selected resource context" },
      { role: "user", content: "Hello" },
    ]);
    expect(prepared.system).toContain("Base instructions");
    expect(prepared.system).toContain("Selected resource context");
    await expect(
      prepare.prepareRequest([{ role: "user", content: "x".repeat(500) }]),
    ).rejects.toThrow("context budget");
  });
});
