## Problema
Quando um motorista aparece e a carga não pode ser executada (espera demais, ele vai embora, ocorre algum problema), hoje não existe forma de cancelar/abortar a carga registrando o motivo. A carga fica "pendurada" como fechada aguardando veículo, e o problema operacional desaparece sem rastro.

## Objetivo
1. Permitir **cancelar uma carga fechada** (abortar a expedição) direto do painel "Cargas fechadas aguardando veículo", informando **motivo obrigatório**.
2. Devolver os pedidos da carga para a etapa de logística (sem `carga_id`/`nome_carga`), liberando-os para serem refeitos em outra carga.
3. Registrar o cancelamento no **audit_log** + criar um histórico próprio de "Ocorrências de carga" para visualização rápida.
4. Criar uma **tela "Ocorrências"** para Admin/Logística verem todos esses problemas (motorista foi embora, carga cancelada por X, etc.) com filtros por data e motivo.

## Fluxo de uso
1. Na portaria (e no painel da logística), no card de cada carga fechada aguardando veículo, aparece um botão `Cancelar carga` (vermelho, ghost).
2. Abre dialog: motivo (obrigatório, com sugestões: "Motorista foi embora", "Atraso operacional", "Veículo recusado", "Cliente cancelou", "Outro") + observação livre.
3. Confirma → cria registro em `ocorrencias_carga` + reverte os pedidos (remove `carga_id`, `nome_carga`, volta `etapa = 'vendas'`, limpa placa/motorista/transportadora/tipo_caminhao) + remove `veiculos_esperados` daquela carga + apaga movimentação de chegada se existir e ainda não entrou no pátio.
4. Toast de sucesso + invalidate.
5. Aparece nova entrada `/ocorrencias` no menu (Admin/Logística), com tabela: data, carga, motorista, placa, motivo, observação, quem registrou, peso/qtd da carga cancelada.

## Mudanças técnicas

**Banco (migração):**
- Nova tabela `public.ocorrencias_carga`:
  - `id uuid pk`, `created_at timestamptz`, `tipo text` (default `'carga_cancelada'`), `motivo text not null`, `observacao text`, `carga_id text`, `nome_carga text`, `placa text`, `motorista text`, `transportadora text`, `peso_total numeric`, `qtd_pedidos int`, `data_carga date`, `registrado_por uuid`, `registrado_por_email text`.
- RLS:
  - SELECT: admin/logística/portaria/faturamento.
  - INSERT: admin/logística/portaria.
  - UPDATE/DELETE: somente admin.
- Índice em `created_at desc` e `carga_id`.

**Frontend:**
- `src/components/portaria/CancelarCargaDialog.tsx` — novo. Recebe a `CargaFechadaAguardando`, faz: insert em `ocorrencias_carga`, batch update dos pedidos (`useBatchUpdateCarregamento` aplicando `etapa: 'vendas'`, `carga_id: null`, `nome_carga: null`, `placa: null`, `motorista: null`, `transportadora: null`, `tipo_caminhao: null`, `horario_inicio: null`, `horario_fim: null`), delete em `veiculos_esperados` por `carga_id`, delete da movimentação `tipo_movimento='entrada'` com `horario_entrada is null` para essa `carga_id`. Tudo seguido de `log_audit('carga','<carga_id>','cancelada', {...})`.
- `CargasFechadasAguardandoPanel.tsx` — adicionar botão `Cancelar carga` (variant ghost, texto vermelho) ao lado dos botões de ação atuais, abre o dialog acima. Visível para `admin/logistica/portaria`.
- `src/hooks/useOcorrencias.ts` — `useOcorrencias()` (lista com filtros opcionais data/motivo) + `useCreateOcorrencia()`.
- `src/pages/Ocorrencias.tsx` — tabela responsiva (cards em mobile) com filtros: período (default últimos 30 dias) e busca livre (motivo/placa/motorista/carga). Mostra contador no topo. Sem ações de edição (apenas leitura para auditoria).
- `App.tsx` — rota `/ocorrencias` (admin, logistica).
- `AppSidebar.tsx` — entrada `Ocorrências` (ícone `AlertOctagon`) sob "Painel"/após "Rupturas", roles admin/logística.

**Tabela `carregamentos_dia`:** apenas updates (sem schema change). O cascade lógico já é coberto pelo `useBatchUpdateCarregamento` existente.

## Fora do escopo
- Não vamos cancelar carga depois que o veículo já entrou no pátio (o card só aparece no painel "aguardando" — após `horario_entrada` o registro some dele). Para casos pós-entrada usaremos o fluxo de portaria normal.
- Não estamos criando notificação push automática — pode ser próxima iteração.
