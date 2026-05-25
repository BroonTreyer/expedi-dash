
## Problema

Ao clicar **Finalizar Carga** no painel "Pré-cargas" do Dashboard:
- nenhum toast aparece (nem verde, nem vermelho),
- a pré-carga continua no painel laranja,
- o caminhão não aparece na Portaria.

O banco confirma que **a atualização não chegou** — só restou um carga_id colidindo com uma carga antiga homônima ("SEIKOMAR" de 11/05).

## O que vai ser corrigido

### 1. `src/pages/Index.tsx` — `handleLoteSubmit`
- Converter `batchUpdateMut.mutate(...)` em `await batchUpdateMut.mutateAsync(...)`.
- Envelopar em try/catch real:
  - **Sucesso** → `toast.success("Carga {nome} finalizada — {N} pedidos em logística")` e refetch obrigatório de `["carregamentos"]`, `["pre-cargas"]`, `["veiculos_esperados"]`, `["movimentacoes_portaria"]`.
  - **Erro** → o próprio hook já mostra toast vermelho; aqui apenas re-abrir o dialog (manter dados preenchidos) chamando de volta `setLoteDialogOpen(true)` para o usuário poder corrigir/repetir, e logar no console com contexto do payload.
- Só executar o INSERT de `veiculos_esperados` (terceirizado) **após** o batchUpdate ter sucesso (hoje roda em paralelo e pode criar registros órfãos).

### 2. `src/components/dashboard/FechamentoLoteDialog.tsx` — `handleSubmit`
- Gerar `cargaId` sempre **único** quando finalizando a partir de uma pré-carga:
  - Se `existingPreCargaId` (começa com `PRE-`), produzir `cargaId = CG-YYYYMMDD-HHMMSS-XXX` (ignorar `nomeCarga` como id).
  - Manter `nomeCarga` apenas como rótulo amigável em `nome_carga`.
  - Para carga normal (sem pre): manter o comportamento atual mas adicionar **verificação anti-colisão**: se já existir `carga_id` igual no banco com `etapa = logistica`/`finalizado`, sufixar `-2`, `-3`, etc.
- Trocar `submitting` para incluir `await` da promessa de `onSubmit` (passada de cima), e desabilitar botões até a confirmação real do servidor. Hoje a flag é liberada antes do servidor responder.

### 3. `src/hooks/useCarregamentos.ts` — `useBatchUpdateCarregamento`
- Adicionar `onSuccess` opcional via `mutateAsync` (já retorna), sem alterar comportamento dos outros callers que ainda usam `mutate`.
- Nenhuma alteração em RLS, schema ou triggers.

### 4. Validação visual rápida
- Depois das mudanças, a sequência esperada vira:
  1. Usuário clica **Finalizar Carga** → botão fica "Finalizando…" desabilitado.
  2. Server responde → toast verde **"SEIKOMAR finalizada — 7 pedidos em logística"**.
  3. Painel laranja some, carga aparece em "A chegar" da Portaria, `veiculos_esperados` ganha 1 entrada.
- Se algo falhar (RLS, trigger, rede), toast vermelho com a mensagem do hook e o dialog reabre com os dados preenchidos para repetir.

## Fora do escopo

- Não estamos mexendo em triggers do banco nem na lógica de Portaria; o problema é puramente o fluxo do dialog → mutation → feedback.
- Não estamos alterando o painel `/pre-cargas` (a finalização não acontece de lá).
- Não vamos tentar "reaproveitar" a pré-carga SEIKOMAR atual via SQL — depois do deploy você abre o dialog de novo, finaliza, e dessa vez vai funcionar.
