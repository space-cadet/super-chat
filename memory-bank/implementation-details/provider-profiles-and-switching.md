# Provider Profiles and Fast Model Switching

## Switching Flow

```text
profile picker
      |
      v
shared profile state --> credential reference --> host credential store
      |
      v
next turn uses selected provider/model
      |
      +--> active stream: cancel or defer safely
      +--> session: persist profile ID and model history
```

## Dependencies

```text
ProviderProfileStore --> LLMAdapter factory --> selected model
          |                    |
          v                    v
     session state       diagnostics/usage
```

Secrets remain in host credential stores. Sessions contain identifiers and
provider-neutral history, never raw API keys.
