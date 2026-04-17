
## Diagnóstico

Hoje, na aba **Pátio Atual** → card de terceirizado, ao clicar no botão **"Saída"** o sistema usa `handleSaidaRapida` (PatioAtualTab.tsx:151) — uma confirmação inline rápida que **só cria o registro** sem coletar lacre, foto do lacre e foto da placa.

Já existe o `RegistroMovimentoDialog` com `VISIBILITY_SAIDA` configurado para terceirizado:
- ✅ `numero_lacre`: **obrigatório**
- ✅ `foto_lacre_url`: **obrigatório**
- ❌ `foto_placa_url`: **oculto** (precisa virar `obrigatorio`)
- ✅ `conferente`/`observacoes`: opcional

## Plano

### 1. `src/lib/portaria-fields-config.ts`
Em `VISIBILITY_SAIDA`:
- `foto_placa_url`: `terceirizado: "obrigatorio"`, `fornecedor: "obrigatorio"`, `carga_propria: "obrigatorio"` (saída final c/ lacre).

### 2. `src/components/portaria/PatioAtualTab.tsx`
- Remover o fluxo `handleSaidaRapida` para **terceirizado** (manter para fornecedor/visitante/prestador/outros que não exigem lacre).
- Botão "Saída" do terceirizado deve disparar `onRegistrarSaida(m)` (abre o dialog completo), igual ao fluxo da carga própria.
- Mesma mudança no layout mobile e desktop (linhas 302-321 mobile + bloco equivalente na tabela).

### 3. `src/components/portaria/RegistroMovimentoDialog.tsx`
Quando for saída de terceirizado a partir de `prefill` (com entrada vinculada):
- Garantir que ao salvar, o registro use os campos `numero_lacre`, `foto_lacre_url`, `foto_placa_url` (já estão no payload de CREATE — linhas 264, 294, 298).
- Após criar a saída de terceirizado, **atualizar a entrada vinculada** com `etapa_terceirizado="finalizado"` e `horario_real_saida=now()` (mesma lógica do `handleSaidaRapida` linhas 183-188), pois hoje o dialog cria a saída mas não fecha o ciclo da entrada terceirizado.
- Ajustar título/descrição do dialog quando `prefill?.categoria === "terceirizado"` para **"Registrar Saída — Terceirizado"** com o nome do veículo.

### 4. Texto do botão na ação do dialog
- `getSaveButtonLabel()`: quando `prefill?.categoria === "terceirizado"` retornar **"Finalizar Saída c/ Lacre"**.

## Sem mudanças em
- Schema, RLS, triggers, fluxo de Carga Própria, Registro de Entrada, Veículos Esperados.

## Arquivos
- ✏️ `src/lib/portaria-fields-config.ts` (visibilidade `foto_placa_url` na saída)
- ✏️ `src/components/portaria/PatioAtualTab.tsx` (terceirizado abre dialog em vez de saída rápida)
- ✏️ `src/components/portaria/RegistroMovimentoDialog.tsx` (fechar ciclo da entrada terceirizado + título/botão)
