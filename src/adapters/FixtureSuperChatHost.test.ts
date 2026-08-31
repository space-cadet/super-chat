import { describe, expect, it } from "vitest";
import { FixtureSuperChatHost } from "./FixtureSuperChatHost";
import { createChatEngineForHost } from "./HostAdapters";
import { validateHostContract } from "../contracts/validation";

async function collectEvents<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const events: T[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

async function collectRemaining<T>(
  stream: AsyncIterator<T>,
): Promise<T[]> {
  const events: T[] = [];
  while (true) {
    const next = await stream.next();
    if (next.done) return events;
    events.push(next.value);
  }
}

describe("FixtureSuperChatHost", () => {
  it("satisfies the host contract and provides a durable engine surface", async () => {
    const host = new FixtureSuperChatHost();
    const report = validateHostContract(host);

    expect(report.valid).toBe(true);
    expect(report.capabilityKinds).toEqual(["identity", "persistence", "tools", "retrieval"]);

    const engine = await createChatEngineForHost({
      host,
      llmAdapter: host.llmAdapter,
    });
    const identity = await host.capabilities.identity!.getIdentity({ requestId: "test" });
    const session = engine.createSession(
      "Fixture test",
      identity ? { namespace: host.id, id: identity.id } : undefined,
    );
    await engine.saveSession();

    const events = await collectEvents(engine.sendMessage("Please read the document"));
    expect(events.some((event) => event.type === "tool-call")).toBe(true);
    expect(events.some((event) => event.type === "tool-result")).toBe(true);
    expect(engine.getActiveSession()?.messages.at(-1)?.content).toBe(
      "The fixture operation completed.",
    );

    const retrievedEvents = await collectEvents(
      engine.sendMessage("Explain the fixture guide", { enableRAG: true }),
    );
    expect(retrievedEvents.some((event) => event.type === "finish")).toBe(true);
    const retrievedMessage = engine.getActiveSession()?.messages.at(-1);
    expect(retrievedMessage?.sources?.[0]).toMatchObject({
      id: "fixture-source-1",
      provenance: {
        capabilityId: "fixture.retrieval",
        sourceId: "fixture-source-1",
      },
    });

    const reloadedEngine = await createChatEngineForHost({
      host,
      llmAdapter: host.llmAdapter,
    });
    await reloadedEngine.loadSessions();
    expect(reloadedEngine.getSessions()).toHaveLength(1);
    expect(reloadedEngine.getActiveSession()?.modelHistory?.length).toBeGreaterThan(0);

    const secondSession = reloadedEngine.createSession("Second fixture session");
    await reloadedEngine.saveSession();
    expect(reloadedEngine.switchSession(session.id)).toBe(true);
    expect(reloadedEngine.getActiveSession()?.id).toBe(session.id);
    await reloadedEngine.archiveSession(session.id);
    expect(reloadedEngine.getActiveSession()?.archived).toBe(true);
    await reloadedEngine.deleteSession(session.id);
    await reloadedEngine.deleteSession(secondSession.id);
    expect(reloadedEngine.getSessions()).toHaveLength(0);

    engine.dispose();
    reloadedEngine.dispose();
  });

  it("keeps write tools pending until the consumer approves them", async () => {
    const host = new FixtureSuperChatHost();
    const engine = await createChatEngineForHost({
      host,
      llmAdapter: host.llmAdapter,
    });
    engine.createSession("Approval test");

    const stream = engine.sendMessage("Please update the document")[Symbol.asyncIterator]();
    const seen: Array<{ type: string }> = [];
    let next = await stream.next();
    while (!next.done) {
      seen.push(next.value as { type: string });
      if (next.value.type === "pending-approval") break;
      next = await stream.next();
    }

    expect(seen.some((event) => event.type === "pending-approval")).toBe(true);
    expect(host.getDocument()).toBe("The fixture document is ready.");
    const approvalWait = stream.next();
    await Promise.resolve();
    expect(engine.getSnapshot().pendingApprovals).toHaveLength(1);

    const callId = engine.getSnapshot().pendingApprovals[0].id;
    expect(engine.approveTool(callId)).toBe(true);
    const firstAfterApproval = await approvalWait;
    const remaining = firstAfterApproval.done
      ? []
      : [firstAfterApproval.value, ...(await collectRemaining(stream))];

    expect(remaining.some((event) => event.type === "tool-result")).toBe(true);
    expect(host.getDocument()).toBe("Updated by fixture host.");
    expect(engine.getSnapshot().pendingApprovals).toHaveLength(0);
    engine.dispose();
  });
});
