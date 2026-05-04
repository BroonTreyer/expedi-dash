Vou ajustar o comportamento para bater com o que você espera: quando clicar em **Registrar Chegada** em **Esperados** para **Carga Própria**, o veículo já deve ficar como **no pátio**, sem pedir **Liberar Entrada**.

Plano de correção:

1. Corrigir o registro vindo de **Esperados**
   - Em `useRegistrarChegadaPortaria`, para `carga_propria`, gravar `horario_entrada` junto com `horario_chegada`.
   - Definir `etapa_carga_propria = 'chegou'` imediatamente.
   - Manter o fluxo de terceirizado separado se ainda depender de liberação.

2. Corrigir o registro manual vinculado à carga
   - Em `RegistroEntradaDialog`, quando for **Carga Própria** vinculada à carga, também gravar `horario_entrada` e `etapa_carga_propria = 'chegou'` no ato de registrar.
   - Atualizar o texto do diálogo para não dizer que a Carga Própria “só entrará no pátio após liberação”.

3. Remover a ação indevida na aba Pátio para Carga Própria
   - Em `PatioAtualTab`, a condição de “Aguardando Liberação” não deve mais se aplicar à `carga_propria`.
   - Assim, Carga Própria recém-registrada passa a mostrar **Chegou** e o botão correto **Saída p/ Rota**.
   - O botão **Liberar Entrada** ficará apenas para o fluxo que realmente precisar de etapa intermediária, como terceirizado se aplicável.

4. Limpar o caso atual já preso no estado errado
   - O registro atual da placa `OND0B48` está no banco com `etapa_carga_propria = 'aguardando_liberacao'` e `horario_entrada = null`.
   - Farei uma migração/update para converter registros recentes de **Carga Própria** nesse estado para `etapa_carga_propria = 'chegou'` e preencher `horario_entrada` com `horario_chegada`/`data_hora`.

Resultado esperado:
- Clicou em **Registrar Chegada** em Esperados para Carga Própria → aparece no **Pátio** como **Chegou**.
- Não aparece mais **Aguardando Liberação** nem botão **Liberar Entrada** para Carga Própria.
- O próximo botão será **Saída p/ Rota**.