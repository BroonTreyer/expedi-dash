## Correção manual: lacres trocados na portaria

A portaria registrou os lacres invertidos entre dois motoristas na saída. Vou aplicar a troca de `numero_lacre` e `foto_lacre_url` entre os dois registros, mantendo placa, motorista, empresa e horários intactos.

### Operação

**2 UPDATEs em `movimentacoes_portaria`:**

| ID | Motorista / Placa | Antes (lacre / foto) | Depois |
|---|---|---|---|
| `196adb61-...` | ANTONIO / SMU6F31 | `0006654` / `joyes3ewgh9.jpg` | `0006658` / `261afvjr83d.jpg` |
| `1979b373-...` | MARCIO / QDN4F76 | `0006658` / `261afvjr83d.jpg` | `0006654` / `joyes3ewgh9.jpg` |

### Auditoria

O trigger `audit_movimentacoes` já registra automaticamente a alteração de `numero_lacre` no `audit_log`. Vou complementar com um `log_audit` explícito marcando a ação como `CORRECAO_MANUAL_LACRE_TROCADO` em ambos os registros, para deixar a justificativa clara no histórico.

### Sem impacto em outros campos

Placa, motorista, empresa, `movimento_vinculado_id`, `etapa_carga_propria`, `horario_saida_final` e demais campos permanecem inalterados.