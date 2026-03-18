

# Corrigir Nº Lacre e renomear Permanência → Tempo Gasto

## Problemas
1. **Nº Lacre não salva**: O campo aparece no formulário (via config), mas na hora do submit (linha 162 de `RegistroMovimentoDialog.tsx`) o `numero_lacre` não é incluído no payload enviado ao banco
2. **"Permanência" deve ser "Tempo Gasto"**: Texto no `MovimentoDetailsDialog.tsx` linha 136

## Mudanças

### 1. `src/components/portaria/RegistroMovimentoDialog.tsx`
- Adicionar `numero_lacre: values.numero_lacre?.trim() || null` no objeto de submit (junto com os outros campos, antes da linha 162)

### 2. `src/components/portaria/MovimentoDetailsDialog.tsx`
- Linha 136: trocar `⏱ Permanência:` por `⏱ Tempo Gasto:`

| Arquivo | Mudança |
|---------|---------|
| `RegistroMovimentoDialog.tsx` | Incluir `numero_lacre` no payload de criação |
| `MovimentoDetailsDialog.tsx` | Renomear "Permanência" → "Tempo Gasto" |

