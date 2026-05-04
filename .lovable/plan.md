## Diagnóstico

O erro **"Não há entrada ativa para esta placa nas últimas 72h. Registre a entrada primeiro ou use 'Saída' a partir do pátio"** que aparece em quase tudo da Portaria não é um problema de banco, permissão ou Lovable Cloud. Os logs do servidor estão totalmente limpos.

É um **bug lógico introduzido recentemente** em `src/pages/Portaria.tsx` no handler `openRegistroFromVeiculoEsperado` (botão "Registrar Chegada" do painel de Esperados):

- Para **Carga Própria**, ele está enviando `tipo_movimento: "saida"` ao registrar a CHEGADA do veículo.
- Isso faz disparar a trava anti-órfão de `useCreateMovimentacao` (que existe para impedir saídas sem entrada correspondente) e devolve a mensagem de erro vermelha.
- Como Carga Própria é a maioria do fluxo da empresa, a sensação é "tudo está quebrado".

O fluxo correto (visto no hook `useRegistrarChegadaPortaria` que usa esse mesmo dado) trata chegada de Carga Própria como `tipo_movimento: "entrada"` + `categoria: "carga_propria"` + `etapa_carga_propria: "aguardando_liberacao"` + `horario_entrada: null`.

## Correção

### 1. Arquivo: `src/pages/Portaria.tsx` — função `openRegistroFromVeiculoEsperado`

Trocar o bloco de Carga Própria para usar `tipo_movimento: "entrada"` (como já é feito para Terceirizado), com a etapa correta e `horario_entrada: null`:

```text
ANTES (bug):
  tipo_movimento: "saida",
  categoria: "carga_propria",
  etapa_carga_propria: "chegou",

DEPOIS (correto):
  tipo_movimento: "entrada",
  categoria: "carga_propria",
  etapa_carga_propria: "aguardando_liberacao",
  horario_entrada: null,
  empresa: (nome próprio da frota / null)
```

Assim a chegada cria o cartão laranja "aguardando liberação" igual ao Terceirizado, e o porteiro libera no pátio depois (fluxo já existente em `CargasFechadasAguardandoPanel` / `useRegistrarChegadaPortaria`).

### 2. Tratamento de erro: mostrar a mensagem real

Linha 178: `toast.error("Erro ao registrar chegada")` está engolindo a mensagem real do servidor. Trocar para `toast.error(e?.message || "Erro ao registrar chegada")` para que erros futuros fiquem visíveis (igual ao padrão usado nos outros hooks).

### 3. Verificação pós-correção

Após o deploy, validar manualmente:
- Carga Própria: clicar "Registrar Chegada" no painel de Esperados → deve aparecer o cartão laranja "aguardando liberação", sem o toast vermelho.
- Terceirizado: continua funcionando igual (não muda).
- Saída de fato (botão "Saída" do Pátio Atual): continua bloqueando placa sem entrada ativa (a trava anti-órfão segue valendo, é correta).

## Escopo

Mudança pequena, cirúrgica, em **1 arquivo** (`src/pages/Portaria.tsx`), apenas no handler `openRegistroFromVeiculoEsperado` (linhas 140-179). Sem migração de banco, sem mexer em RLS, sem alterar hooks. Não afeta dados existentes — apenas conserta o comportamento de novas chegadas.
