---
name: Auth robustness
description: Auth state management with reduced timeouts, retry on role fetch, automatic refresh on 401/403
type: feature
---
- Role fetch: 3 retries com backoffs [0, 500ms, 1500ms], timeout 5s por tentativa.
- Safety timer global de 4s força loading=false caso bootstrap fique preso.
- ProtectedRoute usa grace period de 1,5s antes de declarar role ausente.
- TOKEN_REFRESHED skip role re-fetch se já existe role em ref.
- Refetch automático em window 'online' e document 'visibilitychange' quando role ausente ou fetch falhou.
- Aviso "Acesso não permitido" só dispara quando role realmente carregou e não está na allowlist.
