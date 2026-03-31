

# Permissões Granulares para Perfil Portaria

## Problema

Atualmente `isReadOnly = role === "portaria"` bloqueia TUDO. O perfil portaria precisa:
- **Registrar entrada/saída** (botão Registrar + registro de saída no pátio + registro a partir de esperados)
- **NÃO pode**: Importar planilha, Exportar CSV

## Solução

**`src/pages/Portaria.tsx`**:

1. Substituir `isReadOnly` por uma flag mais específica:
```typescript
const isPortaria = role === "portaria";
```

2. No bloco de botões do header (linha 235-247), separar os botões:
   - Botão "Registrar" — visível para todos (remover guard)
   - Botões "CSV" e "Importar" — escondidos para portaria (`!isPortaria`)

3. Nas props `readOnly` passadas para `PatioAtualTab` e `VeiculosEsperadosPanel` — mudar para `false` (portaria pode registrar saída e registrar a partir de esperados)

4. Manter `onClear` (limpar lista de esperados) bloqueado para portaria — só admin/logística

5. Os dialogs `RegistroMovimentoDialog` e `ImportarPlanilhaDialog`:
   - `RegistroMovimentoDialog` — renderizar sempre (portaria precisa)
   - `ImportarPlanilhaDialog` — esconder para portaria

6. Remover guard `isReadOnly` das funções `openRegistro` e `openRegistroFromVeiculoEsperado`

| Arquivo | Mudança |
|---|---|
| `src/pages/Portaria.tsx` | Substituir `isReadOnly` por controles granulares: portaria registra mas não importa/exporta/limpa |

