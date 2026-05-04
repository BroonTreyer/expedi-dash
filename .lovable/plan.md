O problema ainda existe porque o registro RBY2D00 continua no banco com:

```text
etapa_carga_propria = aguardando_liberacao
horario_entrada = null
```

Enquanto OND0B48 está correto:

```text
etapa_carga_propria = chegou
horario_entrada = preenchido
```

Por isso a tela fica visualmente diferente: o botão aparece como “Saída p/ Rota”, mas a tag “Chegou” não aparece no RBY2D00 porque a etapa dele ainda está antiga.

Plano de correção:

1. Normalizar o dado atual do RBY2D00 e qualquer outro registro recente de Carga Própria que ainda esteja em `aguardando_liberacao` ou sem `horario_entrada`.
   - Definir `etapa_carga_propria = 'chegou'`.
   - Definir `horario_entrada = COALESCE(horario_entrada, horario_chegada, data_hora)`.

2. Corrigir o ponto que ainda gera registros antigos.
   - Em `useRegistrarChegadaPortaria`, a busca por movimentação existente ainda procura Carga Própria como `aguardando_liberacao`.
   - Vou ajustar para tratar Carga Própria como fluxo direto de chegada ao pátio (`chegou`) e evitar reaproveitar/criar registro com estado antigo.

3. Ajustar mensagens de sucesso/comentários da tela.
   - A mensagem atual ainda diz “Aguardando liberação no pátio”, mesmo para Carga Própria.
   - Para Carga Própria, passará a indicar que a chegada foi registrada e o veículo está pronto para “Saída p/ Rota”.
   - Para Terceirizado, permanece o fluxo de aguardar/liberar entrada.

4. Deixar a interface tolerante a dados antigos.
   - Se uma Carga Própria de entrada tiver `horario_entrada` preenchido, a tela deve exibir “Chegou” mesmo se a etapa antiga vier inconsistente.
   - Isso evita diferenças visuais caso algum registro legado escape da normalização.

Resultado esperado:

```text
Esperados -> Registrar Chegada -> Pátio com tag Chegou -> Saída p/ Rota -> Em Rota -> Retorno -> Saída c/ Lacre
```

Depois da correção, RBY2D00 deve aparecer igual aos outros: `Carga Própria` + `Chegou` + botão `Saída p/ Rota`.