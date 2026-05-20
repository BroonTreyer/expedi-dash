
## Diagnóstico da planilha vs. módulo atual

A planilha tem 3 blocos e todos já existem nas tabelas `recebimentos_mp` / `recebimentos_mp_itens`:

| Bloco da planilha | Campo planilha | Onde já está no sistema |
|---|---|---|
| **Recibo (2 vias)** | Fornecedor, Data, Hora | `fornecedor_nome`, `data_chegada`, `hora_chegada` |
| | Quant. (ton) · NF · R$/ton · Total (linhas) | `recebimentos_mp_itens.peso_ton / nota_fiscal / valor_unitario / valor_total_linha` |
| | Total geral | `valor_total` (trigger SQL) |
| | "A Recebedor ==>" | linha de assinatura no PDF |
| **Anexo pagamento** | Motorista, Telefone, CPF, Placa | `motorista`, `telefone`, `cpf`, `placa` |
| **Folha de controle** | Data/Hora chegada, Data recebimento, Data descarga | `data_chegada`, `hora_chegada`, `data_recebimento`, `data_descarga` |
| | Produto (até 6) + N° Nota | itens (já sem limite) |
| | Fornecedor, Conferente, Pallets, Devolveu Pallets | já existentes |

**Conclusão:** nada falta em banco/hooks. O que precisa mudar é (1) o **PDF impresso** para ficar idêntico ao manual e (2) um **importador** opcional do `.xls` para trazer histórico.

## O que vou implementar

### 1. Recibo PDF espelhando a planilha (`ReciboDescargaPrintDialog.tsx`)
Reescrever o template para uma página A4 com 3 seções na mesma ordem do manual:

```text
┌─── A4 ────────────────────────────────────┐
│  Recibo de Descarga         HH:MM   Data  │
│  FORNECEDOR: AURORA                       │
│  ┌──────┬─────┬────────────┬─────┬──────┐ │
│  │Quant │ Ton │ NOTA FISCAL│R$/t │ Total│ │  ← Via 1
│  │ 30,0 │ ton │ 49.994     │35,00│1.050 │ │
│  └──────┴─────┴────────────┴─────┴──────┘ │
│                              TOTAL R$ ... │
│  A Recebedor ==> ________________________ │
│ ─── (corte) ─────────────────────────────  │
│  [Via 2 idêntica – 2ª via para arquivo]   │
│ ───────────────────────────────────────── │
│  DADOS PARA PAGAMENTO DA DESCARGA — ANEXO │
│  MOTORISTA / TELEFONE / CPF / PLACA       │
│  ENTREGAR NA DOCA – Fricó Indústria...    │
└───────────────────────────────────────────┘
```

E página 2 (controle interno) com Data chegada/Hora/Recebimento/Descarga, lista de Produtos, N° Nota, Fornecedor, Conferente, Pallets e checkbox "Devolveu Pallets ( ) Sim ( ) Não".

### 2. Importador de histórico (`ImportarRecebimentosMpDialog.tsx`)
Novo botão "Importar planilha" na página `RecebimentoMp`:
- Aceita `.xls/.xlsx` no formato da planilha enviada (1 arquivo = 1 recebimento, lendo Folha 1 = itens, Folha 2 = motorista/produtos)
- Usa `xlsx` (já instalado) para parsear
- Mapeia para `recebimentos_mp` + `recebimentos_mp_itens` em uma transação
- Pré-visualização antes de salvar (tabela com itens e total calculado)
- Cria/reaproveita `fornecedores_mp` por nome (case-insensitive)
- Status inicial = `aguardando_pagamento` (já chegou, já tem NF) — usuário ajusta se quiser

### 3. Pequenos ajustes UX no `RegistrarChegadaDialog`
Para refletir o fluxo real da folha:
- Agrupar campos na ordem da planilha (Chegada → Motorista/Veículo → Fornecedor → Pallets)
- Botão "Já veio com NF" abre direto a Conferência depois de salvar

### Fora de escopo
- Não mexer no banco (schema já cobre tudo)
- Não mexer em `ConferenciaDescargaDialog` / `PagamentoDialog` (já funcionam)
- Não mexer em outros módulos

## Entregáveis
- `src/components/recebimento-mp/ReciboDescargaPrintDialog.tsx` (reescrito)
- `src/components/recebimento-mp/ImportarRecebimentosMpDialog.tsx` (novo)
- `src/pages/RecebimentoMp.tsx` (botão importar)
- Pequeno ajuste em `RegistrarChegadaDialog.tsx`
