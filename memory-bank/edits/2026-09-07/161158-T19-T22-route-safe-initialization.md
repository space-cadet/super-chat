---
kind: edit_chunk
id: super-chat-2026-09-07-161158-t19-t22
created_at: 2026-09-07 16:11:58 IST
task_ids: [T19, T22]
source_branch: detached-b4b575e
source_commit: b4b575ed4da5403737588f1e6b5a2823e76ec1a9
---

#### 16:11:58 IST - T19/T22: Make shared application initialization route-safe
- Modified `src/react/components/SuperChatApp.tsx` to accept an optional
  stable `cacheKey` and reuse a host-backed engine across route unmounts.
- Split engine construction from persistence hydration so `ChatApp` mounts as
  soon as the engine is ready while session and message loading continues in
  the background.
- Kept session selection after hydration and evicted failed cached
  initializations so transient failures can retry.
- Preserved uncached behavior for hosts that do not provide a cache key.
- Verification: TypeScript, 16 Vitest files / 142 tests, ESM/CJS/type
  declaration build, and `git diff --check` passed.
- Arxivite adapter and device acceptance remain consuming-repository evidence.
