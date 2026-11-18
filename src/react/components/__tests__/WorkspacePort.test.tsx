import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatEngine } from "../../../core/ChatEngine";
import type {
  ChatSession,
  ChatWorkspaceState,
  LLMAdapter,
  PersistenceAdapter,
} from "../../../core/types";
import { ChatApp } from "../ChatApp";
import { FuzzySearcher } from "../../../search/fuzzy-search";
import { serializeChatExport } from "../../../utils/exportChat";

function createStoredWorkspace() {
  const first: ChatSession = {
    id: "first",
    title: "Research",
    createdAt: 1,
    updatedAt: 2,
    messages: [
      {
        id: "target",
        role: "user",
        content: "Needle: 中文 content",
        timestamp: 2,
      },
    ],
  };
  const second: ChatSession = {
    id: "second",
    title: "Other",
    createdAt: 1,
    updatedAt: 3,
    messages: [
      {
        id: "other-message",
        role: "user",
        content: "Something else",
        timestamp: 3,
      },
    ],
  };
  const stored = new Map(
    [first, second].map((session) => [session.id, structuredClone(session)]),
  );
  let workspace: ChatWorkspaceState = {
    openSessionIds: ["first", "second"],
    activeSessionId: "second",
  };
  const persistence: PersistenceAdapter = {
    loadSessions: async () =>
      [...stored.values()].map((session) => structuredClone(session)),
    saveSession: async (session) => {
      stored.set(session.id, structuredClone(session));
    },
    deleteSession: async (id) => {
      stored.delete(id);
    },
    archiveSession: async () => undefined,
    loadWorkspace: async () => structuredClone(workspace),
    saveWorkspace: async (value) => {
      workspace = structuredClone(value);
    },
  };
  const llm: LLMAdapter = {
    streamChat: async function* () {
      yield "Reply";
    },
    streamChatWithTools: async function* () {
      yield { type: "finish" as const, reason: "stop" };
    },
    getProviders: () => [{ id: "mock", name: "Mock" }],
    getModels: () => [],
    testConnection: async () => ({ ok: true, message: "OK" }),
  };
  return { persistence, llm, stored };
}

describe("ported conversation workspace", () => {
  it("searches saved message text and opens the matching message", async () => {
    const { persistence, llm } = createStoredWorkspace();
    const engine = new ChatEngine({
      llmAdapter: llm,
      persistenceAdapter: persistence,
    });
    await engine.loadSessions();
    render(<ChatApp engine={engine} loadSessionsOnMount={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Search chats" }));
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search across chats" }),
      {
        target: { value: "Needle:" },
      },
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /Research.*Needle:/ }),
    );
    await waitFor(() => expect(engine.getActiveSession()?.id).toBe("first"));
    expect(
      screen.getByText("Needle: 中文 content").closest("[data-message-id]"),
    ).toHaveFocus();
    engine.dispose();
  });

  it("keeps drafts independent and restores drafts, tags, tab order, and active chat after restart", async () => {
    const { persistence, llm } = createStoredWorkspace();
    const engine = new ChatEngine({
      llmAdapter: llm,
      persistenceAdapter: persistence,
    });
    await engine.loadSessions();
    const view = render(
      <ChatApp engine={engine} loadSessionsOnMount={false} />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: "Other draft" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Research" }));
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("");
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: "Research draft" },
    });
    await act(async () => {
      await engine.updateSessionMetadata("first", {
        title: "Renamed",
        tags: ["physics", "Physics"],
      });
      await engine.saveSession();
    });
    view.unmount();
    engine.dispose();

    const restored = new ChatEngine({
      llmAdapter: llm,
      persistenceAdapter: persistence,
    });
    await restored.loadSessions();
    expect(restored.getOpenSessionIds()).toEqual(["first", "second"]);
    expect(restored.getActiveSession()).toMatchObject({
      id: "first",
      title: "Renamed",
      draft: "Research draft",
      tags: ["physics"],
    });
    expect(
      restored.getSessions().find((session) => session.id === "second")?.draft,
    ).toBe("Other draft");
    restored.dispose();
  });

  it("preserves original text and non-Latin characters in search excerpts and export metadata", () => {
    const { stored } = createStoredWorkspace();
    const sessions = [...stored.values()];
    const searcher = new FuzzySearcher();
    searcher.setSessions(sessions);
    expect(searcher.search("中文")[0]).toMatchObject({
      messageId: "target",
      snippet: "Needle: 中文 content",
    });
    const first = { ...sessions[0], draft: "draft", tags: ["physics"] };
    const exported = serializeChatExport({
      kind: "sessions",
      sessions: [first],
      scope: "single",
      format: "jsonl",
    });
    expect(JSON.parse(exported.trim())._sessionMetadata).toMatchObject({
      id: "first",
      draft: "draft",
      tags: ["physics"],
    });
  });
  it("copies selected messages in transcript order and resets selection on a chat switch", async () => {
    const clipboard = { writeText: vi.fn(async () => undefined) };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });
    const { persistence, llm } = createStoredWorkspace();
    const engine = new ChatEngine({
      llmAdapter: llm,
      persistenceAdapter: persistence,
    });
    await engine.loadSessions();
    render(<ChatApp engine={engine} loadSessionsOnMount={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Select messages" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy selected" }));
    await waitFor(() =>
      expect(clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("Something else"),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Select messages" }));
    fireEvent.click(screen.getByRole("tab", { name: "Research" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("toolbar", { name: "Message selection" }),
      ).toBeNull(),
    );
    engine.dispose();
  });

  it("resubmits an older edited message using only its preceding model history", async () => {
    const { persistence, llm } = createStoredWorkspace();
    const captured: import("../../../core/types").ChatModelMessage[][] = [];
    llm.streamChat = async function* (messages) {
      captured.push(structuredClone(messages));
      yield "Reply";
    };
    const engine = new ChatEngine({
      llmAdapter: llm,
      persistenceAdapter: persistence,
    });
    engine.createSession("Editing");
    for await (const _event of engine.sendMessage("First question")) {
      /* drain */
    }
    const firstUser = engine
      .getActiveSession()!
      .messages.find((message) => message.role === "user")!;
    for await (const _event of engine.sendMessage("Later question")) {
      /* drain */
    }
    for await (const _event of engine.resendMessage(
      firstUser.id,
      "Edited question",
    )) {
      /* drain */
    }
    expect(captured.at(-1)?.map((message) => message.content)).toEqual([
      "Edited question",
    ]);
    expect(
      engine.getActiveSession()!.messages.map((message) => message.content),
    ).toEqual(["Edited question", "Reply"]);
    expect(engine.getActiveSession()!.turns).toHaveLength(1);
    engine.dispose();
  });
});
