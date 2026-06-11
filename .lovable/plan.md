# Editar fotos e informações em Detalhes do Movimento

Hoje, ao abrir "Detalhes do Movimento" (Portaria), só dá para visualizar as fotos e editar um conjunto limitado de campos. Vamos permitir:

1. Trocar / enviar / remover cada foto do registro (placa, documento, painel KM, painel KM saída/retorno, nota fiscal, lacre).
2. Editar todos os campos relevantes do movimento, inclusive os que hoje só aparecem como leitura.

Restrito a Admin e Logística (mesma regra já usada para Editar / Excluir e para o botão "Foto via upload" no `CapturaFoto`). Portaria continua só visualizando.

## O que vai mudar (UX)

Dentro do `MovimentoDetailsDialog`, na seção "Fotos do Movimento":

- Cada foto ganha 2 botões no canto: **Substituir** e **Remover** (apenas Admin/Logística).
- Onde a foto está ausente (placeholders de "Não capturada"), aparece um botão **Enviar foto** para registrar a evidência tardiamente.
- Ambos os fluxos permitem câmera ou upload de arquivo (PDF/imagem para nota; imagem para placa/painel/lacre/documento), reaproveitando o componente `CapturaFoto` com `allowFileUpload`.
- Após upload com sucesso, marca automaticamente o registro com o sufixo `[FOTO via upload por <email> em <data/hora>]` em `observacoes` (igual ao fluxo já existente de regularização), para manter o badge "Foto via upload" coerente.
- Remoção pede confirmação ("Remover esta foto? A evidência será apagada do storage.").

Na seção de informações:

- Adicionar um botão **"Editar dados"** já existe, mas vamos expandir o `EditMovimentoDialog` para incluir os campos hoje ocultos quando vazios (ex.: `pessoa_visitada`, `motivo_visita`, `servico_executar`, `descricao`, `tipo_operacao`, `tipo_carga`, `numero_lacre`), permitindo preencher informações que faltaram no registro original.
- Categoria continua read-only (regra A10 já documentada no código).

## Como funciona por trás (técnico)

### 1. Upload / substituição de foto
- Novo helper `uploadFotoMovimento(file, movimentoId, campo)` em `src/lib/portaria-foto-upload.ts`:
  - Path: `movimentos/{movimentoId}/{campo}-{timestamp}.{ext}` no bucket `portaria` (já existe, privado).
  - `supabase.storage.from("portaria").upload(path, file, { upsert: false })`.
  - Retorna a `path` (não URL pública) — armazenamos a path no campo correspondente (`foto_placa_url`, `foto_documento_url`, `foto_painel_url`, `foto_painel_saida_url`, `foto_nota_url`, `foto_lacre_url`). Hoje o sistema já trata esses campos como path/URL via signed URL no viewer, então mantemos o mesmo formato observado nos registros atuais (checar pelo registro existente; se for URL assinada, gerar signed URL de 1 ano via memória `storage-access`).
- `UPDATE movimentacoes_portaria SET <campo> = ?, observacoes = COALESCE(observacoes,'') || ' [FOTO via upload por <email> em <ts>]' WHERE id = ?`.

### 2. Remoção de foto
- `supabase.storage.from("portaria").remove([path])` (se a coluna guarda path) e `UPDATE ... SET <campo> = NULL`.
- Se a coluna guardar URL assinada antiga (sem path acessível), apenas zera o campo no banco e ignora o storage (loga warn).

### 3. Permissão
- Reaproveitar `role === "admin" || role === "logistica"` do hook `useAuth` (já usado em `MovimentoDetailsDialog`).

### 4. Edição expandida
- Em `EditMovimentoDialog`, ampliar `EDITABLE_FIELDS` com os campos faltantes citados acima e o `coreKeys`/`visibleFields` continua filtrando para mostrar os mais relevantes — mas agora também mostra os campos da categoria do movimento mesmo quando vazios (pequena heurística por categoria: `visitante` mostra `pessoa_visitada` e `motivo_visita`; `prestador_servico` mostra `servico_executar`; `outros` mostra `descricao`; `terceirizado` mostra `numero_lacre`).
- Continua usando o mutation `useUpdateMovimentacao`.

### 5. Invalidação de cache
- Após upload/remoção, invalidar `["movimentacoes-portaria"]`, `["mov-related-photos", ...]` e `["movimentacao", id]` para o dialog refletir na hora.

## Arquivos afetados

- `src/components/portaria/MovimentoDetailsDialog.tsx` — adicionar controles de Substituir/Remover/Enviar em cada `ClickablePhoto` e nos placeholders `cpMissing`.
- `src/components/portaria/EditMovimentoDialog.tsx` — ampliar lista de campos editáveis e regra de exibição por categoria.
- `src/lib/portaria-foto-upload.ts` — novo helper de upload/remoção e marcação em `observacoes`.
- (Opcional) pequeno componente `PhotoEditActions.tsx` para encapsular os botões — só se simplificar a leitura.

## Fora de escopo

- Não mexer no fluxo de captura inicial (RegistroMovimentoDialog) nem na FSM do Carga Própria.
- Não alterar políticas RLS do bucket `portaria` — já permite Admin/Logística (validar; se não permitir UPDATE/DELETE de objetos por essas roles, adiciono migration mínima com policy).
- Não tocar no caso do Gustavo / hook `useCarregamentos` (já resolvido na rodada anterior).
