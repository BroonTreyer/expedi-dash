
Objetivo: corrigir o bug no fluxo “Saída p/ Rota” da Portaria para que os dados vindos da planilha/chegada já apareçam no formulário e continuem editáveis.

O que identifiquei
- A causa principal está em `src/components/portaria/RegistroMovimentoDialog.tsx`.
- Quando o diálogo abre com `prefillEtapa === "saida_rota"`, ele faz `setValues({})` em vez de carregar os dados já existentes do registro (`placa`, `motorista`, `rota`, `carga_id`, etc.).
- Além disso, os campos de Placa e Motorista ficam bloqueados por `disabled={saving || !!prefill}`, então no fluxo de atualização eles não podem ser corrigidos manualmente.
- O banner superior mostra os dados antigos do `prefill`, mas os inputs em si ficam vazios e travados, que é exatamente o comportamento visto no print.

Implementação proposta
1. Ajustar a inicialização do formulário em `RegistroMovimentoDialog`
- No caso `prefillEtapa === "saida_rota"`, preencher `values` com os dados do `prefill`:
  - `placa`
  - `motorista`
  - `rota`
  - `carga_id`
  - `peso`
  - `qtd_entregas`
  - `empresa`
  - `tipo_caminhao`
  - qualquer outro campo útil já existente no registro

2. Desbloquear edição apenas no fluxo “Saída p/ Rota”
- Manter o bloqueio enquanto estiver salvando.
- Remover o bloqueio indevido causado por `!!prefill` para Placa e Motorista nesse fluxo específico.
- Regra:
  - `retorno` e `lacre`: continuam protegidos como hoje
  - `saida_rota`: Placa, Motorista e Rota ficam editáveis

3. Garantir autopreenchimento ao editar
- Aproveitar o comportamento já existente do `PlacaInput` e `MotoristaAutocomplete`.
- Ao alterar a placa, o formulário deve continuar puxando motorista e vínculo relacionado.
- Ao alterar o motorista, o formulário deve continuar puxando placa/vínculo relacionado quando existir.
- Também vou completar o `onSelect` do `MotoristaAutocomplete` nesse diálogo para refletir melhor os campos vinculados no formulário da Portaria.

4. Revisar persistência no save
- Confirmar que no `handleSave`, para `prefillEtapa === "saida_rota"`, o update continue gravando:
  - `placa`
  - `motorista`
  - `rota`
  - `km_inicial`
  - `foto_placa_url`
  - `etapa_carga_propria = "em_rota"`
- Se necessário, alinhar para salvar também algum campo exibido no formulário que esteja sendo carregado mas não persistido.

Arquivos a alterar
- `src/components/portaria/RegistroMovimentoDialog.tsx`
- Possivelmente `src/components/portaria/MotoristaAutocomplete.tsx` apenas se eu precisar completar o retorno do `onSelect` usado nesse fluxo

Resultado esperado
- Ao clicar em “Saída p/ Rota” para um veículo que veio da planilha e já foi marcado como “chegou”:
  - a placa aparece preenchida
  - o motorista aparece preenchido
  - a rota aparece preenchida
  - os campos podem ser ajustados manualmente
  - o registro salva corretamente e muda para a etapa “em_rota”

Detalhe técnico
```text
Problema atual:
chegada (registro salvo com placa/motorista/rota)
   -> abre diálogo saida_rota
   -> setValues({})
   -> inputs vazios
   -> placa/motorista bloqueados por !!prefill

Correção:
chegada (registro salvo com placa/motorista/rota)
   -> abre diálogo saida_rota
   -> setValues(prefill...)
   -> inputs preenchidos
   -> campos editáveis
   -> salva update no mesmo registro
```
