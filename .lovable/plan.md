

# Corrigir Responsividade da Página Motoristas

## Problema

No mobile, a tabela de motoristas transborda horizontalmente — colunas "Documento", "Cadastro" e "Ações" ficam cortadas. Falta padding no container e a página não segue o padrão de cards usado nas outras páginas (ex: TiposCaminhao).

## Solução

Refatorar `src/pages/Motoristas.tsx` seguindo o padrão de `TiposCaminhao.tsx`:

1. **Adicionar padding** ao container (`p-4 md:p-6`)
2. **Usar `useIsMobile()`** para alternar entre visualizações
3. **Mobile — Cards**: Cada motorista renderizado como `<Card>` com:
   - Nome (título)
   - CPF e Telefone em texto menor
   - Botão "Ver Documento" (se houver foto)
   - Data de cadastro
   - Botões Editar/Excluir
4. **Desktop — Tabela**: Manter a tabela atual com `rounded-lg border bg-card`
5. **Header responsivo**: `flex-col sm:flex-row` para título + botão

| Arquivo | Mudança |
|---|---|
| `src/pages/Motoristas.tsx` | Adicionar `useIsMobile`, card view no mobile, padding, header responsivo |

