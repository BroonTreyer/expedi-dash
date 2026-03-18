

# Plano de Responsividade Global

## Problemas Identificados

Analisando todas as páginas e componentes na viewport 390x844 (mobile), encontrei os seguintes problemas:

### 1. Portaria - Tabelas sem versão mobile
- `PatioAtualTab` e `HistoricoTab` usam `<Table>` padrão com `overflow-x-auto` no mobile -- força scroll horizontal, ilegível
- `PortariaKpiCards` usa `grid-cols-2 md:grid-cols-5` -- a 5a card fica sozinha numa linha no mobile
- `EntradaExpressForm` usa grid de 3 colunas que colapsa corretamente mas o Select de categoria pode ficar apertado
- Botões do header (Data + Rápida + Registrar) podem transbordar

### 2. Index (Painel) - Parcialmente OK
- `CarregamentoTable` já tem `MobileCardView` -- OK
- `Filters` usa `grid-cols-2 sm:grid-cols-3 md:flex` -- funcional mas os selects ficam muito estreitos no mobile
- Header com botões (Tabela/Kanban + Novo Pedido + Ver Finalizados) pode transbordar
- Selection summary bar text pode quebrar

### 3. Consolidado - Tabela sem versão mobile
- Tabela expandível com 10+ colunas sem nenhuma adaptação mobile -- totalmente ilegível no celular
- Filtros usam `flex-wrap` sem larguras mínimas -- funcional

### 4. Rupturas - Tabela sem versão mobile  
- Usa `CarregamentoTable` que já tem mobile cards -- OK
- Resumo por Produto: tabela sem adaptação mobile
- KPIs `grid-cols-2 md:grid-cols-3` -- OK

### 5. CRUD Pages (Clientes, Produtos, Vendedores, TiposCaminhao)
- Todas usam `<Table>` com `overflow-x-auto` -- scroll horizontal no mobile
- Não têm versão card/mobile

### 6. Usuários
- Já tem `useIsMobile()` com cards -- OK

## Solução

Converter todas as tabelas que ainda não têm versão mobile para **card view no mobile**, seguindo o padrão já estabelecido em `CarregamentoTable` e `Usuarios`.

### Arquivos a modificar:

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PatioAtualTab.tsx` | Card view mobile com timer, badge, botão saída |
| `src/components/portaria/HistoricoTab.tsx` | Card view mobile com tipo/categoria badges |
| `src/components/portaria/PortariaKpiCards.tsx` | Grid `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` para acomodar 5 cards |
| `src/pages/Portaria.tsx` | Header buttons wrap, filtros responsivos |
| `src/pages/Consolidado.tsx` | Card view mobile para cargas (placa, motorista, peso, status) |
| `src/pages/Clientes.tsx` | Card view mobile |
| `src/pages/Produtos.tsx` | Card view mobile |
| `src/pages/Vendedores.tsx` | Card view mobile |
| `src/pages/TiposCaminhao.tsx` | Card view mobile |
| `src/pages/Rupturas.tsx` | Resumo por Produto: card view ou tabela compacta no mobile |
| `src/pages/Index.tsx` | Header buttons wrap, selection summary responsivo |
| `src/components/dashboard/Filters.tsx` | Melhorar larguras mínimas no mobile |
| `src/components/portaria/EntradaExpressForm.tsx` | Garantir empilhamento correto no mobile |

### Padrão a seguir:
- Usar `useIsMobile()` hook existente
- Mobile: cards empilhados com layout de grid 2 colunas para dados (label + valor)
- Desktop: tabela como está
- Botões e headers: `flex-wrap` com `gap-2` para quebrar naturalmente
- KPIs: `grid-cols-2` no mobile, expandir conforme tela
- Dialogs: já usam `w-[calc(100vw-2rem)] sm:w-full` -- OK

