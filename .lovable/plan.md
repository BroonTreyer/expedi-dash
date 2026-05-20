## Plano

1. **Corrigir a regra do card azul** em `useCargasFechadasAguardando`
   - Hoje a carga do Raimundo volta porque a consulta só considera movimentos que batem na janela operacional da data da carga.
   - O caso dele tem `data` da carga em 15/05, mas movimentos reais em 19/05; como a saída fica fora da janela, o card não reconhece a expedição.
   - Ajustar a regra para que qualquer movimento finalizador da mesma `carga_id + placa` esconda a carga do card azul, mesmo fora da janela.

2. **Endurecer contra duplicidades e registros órfãos**
   - Tratar como finalizado quando existir:
     - `tipo_movimento = 'saida'` da mesma placa/carga;
     - `etapa_terceirizado = 'finalizado'`;
     - `horario_saida_final` preenchido;
     - sinais equivalentes de carga própria finalizada.
   - Priorizar match por placa para não contaminar outra viagem com mesmo `carga_id`.

3. **Validar o caso específico**
   - Confirmar que `CF FRANGO / RBK7D22 / RAIMUNDO` deixa de aparecer no retorno de `useCargasFechadasAguardando`.
   - Manter visíveis apenas cargas realmente aguardando chegada/liberação.

## Detalhe técnico

A alteração fica concentrada em `src/hooks/useCarregamentos.ts`, na montagem dos sets `finalizadaKey` e `entradaPorKey`. Não precisa alterar layout nem criar tabela nova.