## Problema

No diálogo **"Editar Carga"** (acessado pelo ícone de lápis), ao digitar/alterar a placa (ex: `ROO2C15`), os campos **Motorista**, **Transportadora** e **Tipo Caminhão** **não são auto-preenchidos** a partir do cadastro de caminhões — ficam vazios e o usuário precisa preencher manualmente.

A lógica de busca por placa já existe em outras partes do sistema (cadastro de caminhões + tabela `caminhoes` com link para `motoristas`), mas o `EditarCargaDialog.tsx` usa apenas um `<Input>` de texto livre sem lookup.

Para a placa **ROO2C15** o cadastro já tem: motorista **HERMES TEIXEIRA DA COSTA**, transportadora **GLOG - CEARA**, tipo **Bitruck** — todos prontos para auto-fill.

## Solução

Adicionar lookup automático no `EditarCargaDialog.tsx`:

1. **Ao sair do campo Placa (onBlur)** ou após debounce de digitação, normalizar (uppercase + trim) e consultar `caminhoes` com join em `motoristas`:
   ```sql
   SELECT placa, transportadora, tipo_caminhao, motoristas(nome_completo)
   FROM caminhoes
   WHERE upper(trim(placa)) = <placa digitada> AND ativo = true
   LIMIT 1
   ```
2. Se encontrar, **auto-preencher apenas os campos vazios** (não sobrescrever o que o usuário já digitou) — ou sobrescrever sempre, conforme preferência.
3. Mostrar um indicador discreto (ícone check verde + texto "Caminhão encontrado: HERMES / GLOG - CEARA") abaixo do campo Placa.
4. Se não encontrar, manter os campos como estão e mostrar um aviso suave ("Placa não cadastrada — preencha manualmente").

## Pergunta antes de implementar

Quando a placa for encontrada no cadastro, devo:
- **(A)** Preencher apenas os campos que estiverem **vazios** (preserva edições manuais do usuário), ou
- **(B)** **Sempre sobrescrever** motorista/transportadora/tipo com os dados do cadastro (garante consistência com `caminhoes`)?

Default sugerido: **(B) sobrescrever sempre**, com toast informando "Dados atualizados pelo cadastro do caminhão" — assim corrige automaticamente cargas com transportadora vazia como esta da Hermes/GLOG.

## Arquivos afetados

- `src/components/dashboard/EditarCargaDialog.tsx` — adicionar `useEffect` (debounce ~400ms) que dispara o lookup quando `placa` muda; auto-preencher `motorista`, `transportadora`, `tipoCaminhao`.
