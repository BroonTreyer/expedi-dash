
# Escalar o sistema para 25+ usuários simultâneos sem travar

## Diagnóstico (o que está acontecendo)
Pelo código e pelos dados atuais, o problema deixou de ser só login compartilhado e virou **sobrecarga de leitura/escrita no Painel**:
1. O Painel carrega tabelas grandes em massa (ex.: `clientes` com ~4.776 registros) ao entrar na tela.
2. Criar pedido/fechar carga dispara múltiplas operações individuais (N inserts/updates), gerando tempestade de realtime + refetch.
3. Algumas hooks ainda consultam backend sem proteção de sessão consistente.
4. Resultado prático: UI fica congestionada, autocomplete “para”, e usuários percebem travamento.

## Plano de implementação

1. **Blindar auth para concorrência real**
   - Ajustar `useAuth.ts` para evitar corrida de timeout/refresh em sessão ativa.
   - Garantir que callbacks antigos não derrubem sessão nova.

2. **Tirar carga pesada do Painel**
   - Remover fetch completo de clientes no `Index`.
   - Trocar preenchimento por código no `CarregamentoDialog` para **lookup por código sob demanda** (debounce), em vez de manter lista gigante em memória.
   - Em filtros, usar apenas clientes presentes no período carregado.

3. **Transformar operações em lote**
   - Criar mutations batch em `useCarregamentos.ts`:
     - inserção de múltiplos itens do pedido em 1 requisição;
     - fechamento de carga com múltiplos itens em 1 requisição.
   - `Index.tsx` e `CarregamentoDialog.tsx` passam a usar essas mutations em lote.

4. **Reduzir tempestade de realtime/refetch**
   - Em `useCarregamentos.ts`, trocar invalidate por debounce/throttle no evento INSERT.
   - Ignorar invalidation quando o registro não pertence ao range visível.
   - Manter patch otimista para UPDATE.

5. **Padronizar proteção de sessão nas queries críticas**
   - Aplicar `enabled: !!session` nas hooks que ainda faltam (movimentações, veículos esperados, registros, analytics).
   - Refinar retry de auth no `App.tsx` para não entrar em ciclo agressivo.

6. **Ajustes de banco para escala**
   - Adicionar índices focados em buscas reais de autocomplete e ordenação frequente.
   - Se após otimização ainda houver saturação no pico, aumentar capacidade da instância do backend no Lovable Cloud.

## Detalhes técnicos (arquivos)
- `src/hooks/useAuth.ts`: correções de corrida de sessão/timeout.
- `src/pages/Index.tsx`: remover dependência pesada de clientes no carregamento inicial.
- `src/components/dashboard/CarregamentoDialog.tsx`: lookup de cliente por código sob demanda.
- `src/components/dashboard/Filters.tsx`: opções de cliente derivadas do dataset visível.
- `src/hooks/useCarregamentos.ts`: mutations batch + controle de realtime.
- `src/App.tsx`: retry de auth mais estável.
- `src/hooks/useMovimentacoesPortaria.ts`, `src/hooks/useVeiculosEsperados.ts`, `src/hooks/useRegistrosPortaria.ts`, `src/hooks/useAnalytics.ts`: gating por sessão.
- Migration SQL: índices de suporte para busca/ordenação.

## Critério de sucesso
- Fluxo “Criar pedido” e “Fechar carga” sem travamento com 25+ usuários simultâneos.
- Autocomplete respondendo de forma consistente durante operação pesada.
- Queda clara no volume de requisições por ação (menos refetch redundante e menos eventos em cascata).
