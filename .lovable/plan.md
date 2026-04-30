Encontrei a causa real dos sintomas novos: não é só “saída órfã”. Existem registros antigos ainda abertos e várias consultas continuam olhando apenas `carga_id` ou placa, sem separar o ciclo atual do ciclo antigo do motorista/caminhão.

Achados confirmados no banco:
- Fagno / QWE1B20 / `JR MIX`: a carga atual é de 30/04, mas existe ciclo antigo de `JR MIX` em 22/04 já finalizado. Algumas rotinas ainda tratam qualquer movimento com mesmo `carga_id` como se fosse da carga atual.
- Toni / JBM8E58: existe uma entrada antiga aberta de 23/04, por isso aparece com cerca de 161h. Mas depois disso ele teve ciclos mais novos em 24/04 e 29/04-30/04 já finalizados. A entrada de 23/04 está obsoleta e não deveria aparecer como pátio atual.
- Hiago / RZU1A65: mesmo padrão do Toni. Entrada antiga aberta em 23/04, ciclo posterior em 24/04 finalizado. Como ele nem era do dia 29/30, não deve aparecer no pátio atual.
- Jesumar / SMQ3D94: entrada legítima de 29/04 ainda sem saída, deve continuar no pátio.

## Plano de correção

### 1. Corrigir a lógica do “Pátio atual”
Atualizar `useMovimentacoesAtivasPatio` para não considerar simplesmente “entrada sem saída vinculada”.

Nova regra:
- Agrupar movimentos por placa normalizada.
- Considerar o ciclo mais recente da placa.
- Se existe uma movimentação mais nova finalizada/saída para a mesma placa, qualquer entrada antiga aberta fica obsoleta e não aparece.
- Só mostrar no pátio quando o ciclo mais recente estiver realmente ativo (`entrada` em `no_patio`/com `horario_entrada`, sem finalização posterior).

Resultado:
- Toni 161h sai do pátio.
- Hiago sai do pátio.
- Jesumar permanece no pátio.
- Sinomar permanece se ainda não teve saída.

### 2. Corrigir consultas que cruzam carga atual com movimentos antigos
Atualizar `useCargasFechadasAguardando` para relacionar movimentos com carga usando contexto do ciclo, não apenas `carga_id`.

Nova regra:
- Para cada carga fechada, comparar movimentos por `carga_id` e janela operacional ao redor da data da carga, por exemplo de `data - 12h` até `data + 48h`.
- Quando houver placa prevista, priorizar também placa normalizada.
- Ignorar movimentos muito antigos com mesmo nome de carga.

Resultado:
- Fagno / `JR MIX` de 30/04 não herda mais a finalização antiga de 22/04.
- Cargas overnight, como Toni saindo após meia-noite, continuam funcionando.

### 3. Fortalecer `useStatusPortariaPorCarga`
A correção anterior ainda é frágil porque o resultado final é um `Map` por `carga_id`; se o mesmo nome de carga reaparece, pode haver colisão.

Ajuste:
- Expandir `CargaRef` para aceitar também `placa` e/ou `motorista` quando disponível.
- Calcular status por chave de ciclo: `carga_id + data + placa normalizada`.
- Manter compatibilidade com chamadas antigas, mas atualizar `Expedicao` e `Consolidado` para passar placa/motorista.
- Usar janela operacional, não só o dia exato, para não quebrar cargas que entram em um dia e saem no seguinte.

Resultado:
- Status “Expedido” só aparece quando o movimento pertence ao ciclo atual da carga.

### 4. Limpeza pontual dos registros obsoletos
Executar uma limpeza de dados, não migration estrutural, nos registros antigos abertos que já foram superados por ciclos posteriores:
- Toni: entrada aberta antiga de 23/04 (`2f0bed02-5e12-4fbd-815d-7baa8ca9e659`).
- Hiago: entrada aberta antiga de 23/04 (`8e68e4f4-40cc-40b9-a2fd-485835fe99f5`).

Opção segura: marcar como `finalizado` com observação de regularização, em vez de apagar, preservando histórico.

### 5. Prevenir reincidência no registro de saída/entrada
Fortalecer `useCreateMovimentacao`:
- Ao criar nova entrada para uma placa que já tem entrada aberta antiga, fechar/regularizar ou bloquear com aviso claro.
- Ao criar saída, exigir vínculo com a entrada ativa mais recente da mesma placa/carga.
- Invalidar também a query `movimentacoes_portaria_ativas_patio` após criação/edição/exclusão, para a tela atualizar imediatamente.

## Arquivos a alterar
- `src/hooks/useMovimentacoesPortaria.ts`
- `src/hooks/useCarregamentos.ts`
- `src/hooks/useStatusPortariaPorCarga.ts`
- `src/pages/Expedicao.tsx`
- `src/pages/Consolidado.tsx`
- possivelmente `src/components/portaria/PatioAtualTab.tsx`, apenas se precisar ajustar exibição/ordenação após a nova regra

## Resultado esperado
- Fagno volta para estado correto: aguardando/chegada, não “Expedido” sem ter entrado.
- Toni não aparece mais com 161h no pátio.
- Hiago não aparece no pátio/lista de 29/30.
- Jesumar aparece corretamente no pátio enquanto não tiver saída.
- O sistema deixa de puxar informações antigas quando o motorista ou caminhão retorna em outro dia.