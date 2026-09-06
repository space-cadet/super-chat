# Attachments and Model Context

## Resolution Flow

```text
attachment reference
       |
       v
host document/file capability
       |
       +--> Markdown/text --> text model part
       +--> PDF -----------> extracted text or file part
       +--> image ----------> image model part
       |
       v
shared size/type validation
       |
       v
budgeted model message + persisted provenance
```

## Component Dependencies

```text
ChatInput --> AttachmentResolver --> HostDocuments
                              |
                              v
                    ContextBudget / TokenEstimator
                              |
                              v
                         LLMAdapter
```

Hosts provide access and decoding where platform-specific. Super-chat owns
normalization, limits, persistence, and UI state.
