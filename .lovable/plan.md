

# Ajustes no Dialog de Registro de Movimento

## Mudanças

### 1. Remover campo "Motivo"
- Remover do `INITIAL_STATE`, do formulário (linhas 246-249), do prefill sync, e do `handleSave` (setar `motivo: null`)

### 2. Renomear "Carga Vinculada" → "Ordem de Carga"
- Alterar label de "Carga Vinculada (opcional)" para "Ordem de Carga"
- Alterar placeholder de "ID da carga" para "Nº da ordem de carga"
- Remover a condição `state.categoria === "carga_propria"` — mostrar sempre

### 3. Fotos obrigatórias (Placa + Documento)
- Mover os dois `CapturaFoto` para **fora** do Collapsible (seção principal, sempre visível)
- Remover "(opcional)" dos labels → "📷 Foto da Placa" e "📷 Foto de Documento/NF"
- Atualizar `canSave` para exigir ambas as fotos: `state.fotoPlacaPreview && state.fotoDocPreview`
- Adicionar indicador visual vermelho se foto não foi tirada ao tentar salvar

### Arquivo
- `src/components/portaria/RegistroMovimentoDialog.tsx`

