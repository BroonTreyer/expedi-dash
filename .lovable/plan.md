## Objetivo

Adicionar uma visão "Rupturas Consolidadas" dentro da página `/consolidado` mostrando, para o dia selecionado:

1. **Por carga**: peso total da carga × peso/quantidade em ruptura × % de ruptura.
2. **Por item (produto)**: ranking de produtos com mais ruptura no dia, somando todas as cargas.

Filtro padrão: dia atual (mesmo seletor de data que o Consolidado já tem — funciona de graça).

## UX

Dentro de `src/pages/Consolidado.tsx`, acima da tabela atual de cargas, adicionar um par de `Tabs` ("Cargas" | "Rupturas"). A aba "Cargas" preserva 100% da tela atual. A aba "Rupturas" mostra:

### Tabela 1 — Ruptura por carga
| Carga | Cliente(s) | Peso planejado (kg) | Peso ruptura (kg) | Qtd ruptura (unid) | Itens em ruptura | % Ruptura |

- Só lista cargas que têm pelo menos 1 item com `ruptura || ruptura_sinalizada` no período.
- Ordenável por % ruptura desc por padrão.
- Clicar na carga abre a tabela atual filtrada (ou navega para `/rupturas?carga=...`, igual ao link que já existe na visão de cargas).
- "% Ruptura" = `peso_ruptura / peso_planejado * 100`.

### Tabela 2 — Ruptura por item (produto)
| Produto | Cód. | Total kg ruptura | Total unid ruptura | Cargas afetadas | Pedidos afetados |

- Agrupa por `codigo_produto` (fallback `nome_produto`).
- Ordenável por kg desc por padrão.
- Linha total no rodapé.

### Métrica usada
Para cada item com ruptura (`temRuptura` de `src/lib/ruptura-utils.ts`):
- **kg ruptura** = `pesoNaoCarregado(item)` (já existe em `src/lib/peso-utils.ts` — devolve `peso_original` para ruptura total e `peso_original - peso` para parcial).
- **unid ruptura** = mesma lógica para `quantidade_original` vs `quantidade`. Adicionar um helper `quantidadeNaoCarregada` espelhando `pesoNaoCarregado` em `src/lib/peso-utils.ts`.
- **peso planejado da carga** = soma de `peso_original ?? peso` de todos os itens da carga.

Produto "PAO DE ALHO" continua sendo exibido em UNID (regra de produto já documentada), mas o número de kg da ruptura ainda vale para a coluna kg — mostro os dois campos, o usuário escolhe o que faz sentido.

## Implementação

Arquivos:
- **`src/lib/peso-utils.ts`**: adicionar `quantidadeNaoCarregada(item)` análogo a `pesoNaoCarregado`.
- **`src/pages/Consolidado.tsx`**: 
  - Envolver o conteúdo principal num `<Tabs defaultValue="cargas">` com 2 trigger.
  - Novo `useMemo` `rupturaPorCarga` derivado das rows já carregadas (sem nova query).
  - Novo `useMemo` `rupturaPorItem` agregando por `codigo_produto`.
  - 2 componentes locais simples reusando `Table`/`SortableTableHead` já presentes.
- **Sem migração de banco. Sem nova query.** Aproveita a mesma data já paginada do hook `useConsolidado`.

## Fora do escopo
- Não vou criar página nova nem mexer em `/rupturas`.
- Não vou alterar a aba "Cargas" atual.
- Sem exportação XLSX nessa entrega (posso adicionar depois se você pedir).

## Pergunta opcional
Quer um botão "Imprimir/PDF" para essa aba também, reaproveitando o estilo do `ConsolidadoPrintDialog`? Se sim, adiciono; se preferir manter simples agora, fica só na tela.