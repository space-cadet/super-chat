# Agentic Tool Runtime

## Purpose

`super-chat` provides the reusable agentic tool-calling runtime extracted from
`obsidian-ai`. Product hosts register tool providers; they do not implement the
turn loop around the shared engine.

## Overall Logic Flow

```text
user turn
   |
   v
shared AgentLoop
   |
   +--> provider/model stream
   |       |
   |       +--> text delta --------------------+
   |       +--> tool call                      |
   |                |                          |
   |                v                          |
   |        policy and approval                |
   |                |                          |
   |                v                          |
   |        ToolProviderRegistry               |
   |                |                          |
   |                v                          |
   |        host tool handler                  |
   |                |                          |
   |                +--> structured result ----+--> next model step
   |                +--> evidence/source ledger
   |                +--> diagnostic event
   |
   +--> final grounded response
           |
           +--> shared UI, persistence, citations, replay
```

## Component Diagram

```text
                 +----------------------+
                 |      SuperChatApp    |
                 +----------+-----------+
                            |
                 +----------v-----------+
                 | ChatEngine / AgentLoop|
                 +--+-------+--------+---+
                    |       |        |
          +---------v+  +---v----+  +v----------------+
          | Tool      |  | Policy |  | EvidenceLedger  |
          | Executor  |  |/Approval|  | + citations     |
          +-----+-----+  +--------+  +-----------------+
                |
        +-------v-----------------------------+
        | ToolProviderRegistry                |
        +-----------+--------------+----------+
                    |              |
             +------v-----+  +-----v------+
             | built-ins  |  | host packs |
             | 31 tools   |  | Arxivite  |
             +------------+  | Obsidian  |
                             +------------+
```

## Dependencies

```text
LLMAdapter --> AgentLoop --> ToolExecutor --> ToolProviderRegistry
                                      |             |
                                      v             v
                              ApprovalPolicy   host handlers
                                      |
                                      v
                              EvidenceLedger
                                      |
                                      v
                          persistence / UI / diagnostics
```

## Rules

- Tool selection is model-driven; hosts do not add a second intent router.
- Tool handlers may be host-specific, but descriptors and lifecycle are shared.
- Mutating tools remain fail-closed and approval-aware.
- Tool results may carry formatted content and structured evidence.
- Cancellation propagates through the entire agent turn.
