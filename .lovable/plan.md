## Auditoria — Rupturas em Pré-cargas vs Painel de Rupturas

### O que verifiquei (DB ao vivo)

| Métrica | Valor |
|---|---|
| Rupturas em pré-cargas (`etapa='pre_carga' AND ruptura=true`) | **45** |
| Rupturas que devem aparecer em **Rupturas › Faltando agora** | **112** (45 pré-carga + 67 vendas) |
| Rupturas em pré-cargas **ausentes** de Faltando agora | **0** ✅ |

Distribuição das 45 rupturas por carga:

| Carga | Rupturas |
|---|---|
| PRE-…CCQ (SP CARRO 2) | 16 |
| PRE-…HW9 (SP CARGA 1) | 14 |
| PRE-…09W (SP CARRO 3) | 6 |
| PRE-…LPN (MAURICEIA FRACIONADO) | 3 |
| PRE-…XU4 (CAROBA) | 2 |
| PRE-…BGD | 2 |
| PRE-…0AT (MATEUS CARRO 7) | 1 |
| PRE-…6VF (CARLOS S. IZABEL) | 1 |

### Lógica das duas telas

| | Painel **Pré-cargas** | **Rupturas › Faltando agora** |
|---|---|---|
| Fonte | `usePreCargas()` — todas linhas com `etapa='pre_carga'` (sem filtro de data) | `useCarregamentos(hoje, hoje)` — `data = hoje` OU carry-over 30 dias com `status ≠ 'Carregado'` |
| Conta como ruptura | `ruptura === true` | `ruptura === true` e (não `carga_id` OU `status ≠ 'Carregado'`) |

Após o revert que fizemos agora há pouco (todas as 135 pré-cargas estão com `data = 28/05`), as 45 rupturas estão dentro do alcance do hook → batem 1:1.

### Conclusão

**A nível de dados, tudo está coerente.** Toda ruptura visível em `/pre-cargas` também aparece em `/rupturas › Faltando agora`. O número total maior (112) em Rupturas é correto porque inclui também 65 pedidos `vendas` ainda não fechados em carga (linhas sem `carga_id`).

### Possíveis causas do que você viu

1. **Cache da página** — A tela `/rupturas` tinha sido aberta antes do revert (quando havia datas futuras). O cache local pode ainda mostrar a contagem antiga. **Basta clicar no botão de refresh ↻** no canto superior direito da aba "Faltando agora" ou recarregar a página (F5).
2. **Comparação de métricas diferentes** — Pré-cargas mostra "qtd de rupturas" por carga; Rupturas › Faltando agora mostra produtos agregados + nº de pedidos únicos. Eles não devem casar visualmente, mas representam o mesmo conjunto.

### Próximo passo

Antes de mexer em código, preciso confirmar se ainda há divergência depois do refresh. Você pode me dizer:

- Qual ruptura específica (nº pedido / produto / carga) você vê em `/pre-cargas` que **não** aparece em `/rupturas`?

Se confirmarmos um caso real, eu investigo o ponto exato (provavelmente um filtro de data, etapa ou agrupamento por produto). Se não houver, o painel já está correto — era só cache.
