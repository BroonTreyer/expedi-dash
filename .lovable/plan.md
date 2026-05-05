## Objetivo

Trocar a base de cálculo de **Gastos por Vendedor** de "CT-es importados" para **Cargas Fechadas + Tabela de Frete**. CT-e passa a ser etapa de **conferência** (realizado vs previsto), não a fonte do gasto.

## Lógica nova

Para cada carga fechada (`etapa = 'logistica'`):

1. Agrupar pedidos por **destino** (`cidade` + `uf`).
2. Para cada destino, buscar valor em `tabela_frete` por `(destino_cidade, destino_uf, tipo_veiculo)` da carga.
3. **Frete previsto do destino** = `peso_total_destino × valor_kg`.
4. **Rateio por vendedor** dentro do destino: `peso_vendedor_destino / peso_total_destino × frete_destino`.
5. Soma por vendedor em todas as cargas do período = **gasto previsto**.

Se a carga já tem CT-e vinculado (via `ordem_carga`), também mostra **realizado** (valor do CT-e) e **divergência %** ao lado do previsto. Se não tem, mostra só previsto.

## Mudanças

### 1. Hook `useGastosVendedor.ts` (reescrita)

Trocar consulta principal:

- **Antes:** parte de `ctes_dacte`.
- **Depois:** parte de `carregamentos_dia` onde `etapa = 'logistica'` e `data BETWEEN di AND df`, agrupando por `carga_id`.

Algoritmo:

```text
Para cada carga:
  carga_meta = { tipo_caminhao, transportadora, ordem_carga, nome_carga, data }
  destinos = group_by(pedidos, cidade+uf)
  para cada destino:
    valor_kg = lookup tabela_frete(cidade, uf, tipo_caminhao_normalizado)
    frete_destino = peso_total_destino * valor_kg
    para cada vendedor no destino:
      share = peso_vend / peso_total_destino
      rateio = share * frete_destino
      acumula em vendedor
  cte = ctes_dacte where carga_id = carga.id (opcional)
  carga.realizado = sum(cte.valor_frete) se houver
```

Normalização `tipo_caminhao` → `tipo_veiculo` da tabela: `bitruck`, `carreta` (regex/lookup; default `bitruck` se não bater).

Detalhe por carga passa a mostrar:
- `previsto` (calculado), `realizado` (CT-e se existir), `divergencia` em R$ e %.
- Quebra por destino com `valor_kg`, `peso`, `frete`.
- Aviso se algum destino não tem tarifa cadastrada (frete = 0, badge laranja).

### 2. Tipos

`GastoDetalhe` ganha:
- `previsto: number`, `realizado: number | null`, `divergencia_pct: number | null`
- `destinos: Array<{ cidade, uf, peso, valor_kg, frete, sem_tarifa }>`

`GastoVendedor` ganha:
- `frete_previsto: number`, `frete_realizado: number`, `cobertura_cte_pct: number` (% das cargas com CT-e).

### 3. UI `GastosVendedorTab.tsx`

- KPIs no topo: **Previsto**, **Realizado**, **Divergência** (R$ e %), **Peso total**.
- Tabela: coluna "Frete rateado" vira **"Previsto"**; nova coluna **"Realizado"** + **"Divergência"** (verde se realizado ≤ previsto, vermelho se >).
- Linha expandida por carga mostra:
  - `Tipo: Bitruck/Carreta · OC: ABC123 · Status CT-e: vinculado/sem CT-e`
  - Tabela de destinos: cidade/UF · peso · R$/kg · frete · ⚠ se sem tarifa
  - Pedidos do vendedor (mantém atual).
- Filtro extra: **"Apenas cargas sem tarifa"** (destaca lacunas na `tabela_frete`).

### 4. Edge case — sem `tabela_frete`

Se nenhuma tarifa bater para um destino, `previsto` daquela parcela = 0 e a UI mostra um alerta com link "Cadastrar tarifa" (vai para aba `Tabela de Frete` já filtrada por aquele destino).

### 5. Sem migração de schema

Não precisa mexer no banco — toda lógica é client-side baseada em tabelas existentes (`carregamentos_dia`, `tabela_frete`, `ctes_dacte`).

## Comportamento esperado

```text
Carga MG-Norte (Bitruck, OC-1234)
├── Uberlândia/MG  600kg × R$0,45 = R$ 270,00
│   ├─ Vendedor A  400kg → R$ 180,00
│   └─ Vendedor B  200kg → R$  90,00
└── Patos/MG       400kg × R$0,60 = R$ 240,00
    └─ Vendedor A  400kg → R$ 240,00

Total previsto: R$ 510,00
CT-e vinculado: R$ 530,00
Divergência: +R$ 20,00 (+3,9%)
```

Vendedor A acumula R$ 420 previsto nessa carga; B acumula R$ 90.

## Fora de escopo

- Editar `ordem_carga` retroativa em cargas antigas (tema separado).
- Regras especiais por forma de pagamento ou cliente.
