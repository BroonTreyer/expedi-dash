

## Publicar alterações para a Portaria

### Situação

O código já está corrigido (foto da placa removida da etapa Saída Final / Lacre em `VISIBILITY_SAIDA`), mas a alteração ainda não está no ar para os operadores. Mudanças de frontend só vão pra produção (`expedi-dash.lovable.app` / `fricotrack.com.br`) depois que você clicar em **Publish → Update**. Sem isso, o PWA continua servindo a build antiga.

### Ação necessária

Clicar em **Publish → Update** no canto superior direito do editor (ou no botão "..." em mobile → Publish).

Após publicar:

1. O PWA detecta o update automaticamente (autoUpdate + skipWaiting já configurados).
2. Em até 5 minutos, ou ao reabrir o app, cada dispositivo recebe o toast "Aplicativo atualizado".
3. A etapa **Saída Final / Lacre** deixa de pedir foto da placa.

### Se algum dispositivo continuar com a versão antiga após publicar

- **Android PWA:** fechar o app nos recentes e reabrir.
- **iOS PWA:** fechar e reabrir; se persistir, Ajustes → Safari → Limpar histórico.
- **Navegador:** Ctrl+Shift+R (hard reload).

### Verificação

Em um dispositivo da portaria, abrir o PWA → Carga Própria → registrar Saída Final / Lacre de um veículo: o campo "Foto da Placa" não deve mais aparecer; só "Nº Lacre" e "Foto do Lacre" como obrigatórios.

### O que NÃO precisa mudar

- Nenhum arquivo. O código já está correto desde a última alteração aprovada.
- Nenhuma migration.
- Nenhum ajuste no PWA — config já é `autoUpdate`.

