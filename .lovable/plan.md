

# Adicionar Tipo de Caminhão no Cadastro de Terceirizado

## Problema

O cadastro de terceirizado na portaria não possui campo para informar o tipo de caminhão (Bitruck, Truck, Carreta, etc.).

## Solução

A tabela `movimentacoes_portaria` não tem coluna `tipo_caminhao`. Precisamos adicionar a coluna no banco e o campo no formulário dinâmico. Os tipos serão puxados da tabela `tipos_caminhao` já existente (cadastro dinâmico), mas o campo será um select com as opções cadastradas.

### 1. Migration — adicionar coluna

```sql
ALTER TABLE movimentacoes_portaria ADD COLUMN tipo_caminhao text;
```

### 2. `src/lib/portaria-fields-config.ts`

- Adicionar campo `tipo_caminhao` no array `FIELDS` (bloco `veiculo`, tipo `text` — será tratado como select dinâmico no dialog)
- Adicionar entrada na `VISIBILITY`: terceirizado → `"obrigatorio"`, carga_propria → `"oculto"`, demais → `"oculto"`
- Adicionar entrada na `VISIBILITY_SAIDA`: todos `"oculto"`

### 3. `src/components/portaria/RegistroMovimentoDialog.tsx`

- Importar `useTiposCaminhao` para buscar os tipos cadastrados
- No render dos campos, quando `field.key === "tipo_caminhao"`, renderizar um `<Select>` com as opções vindas do hook ao invés de um input de texto
- No `handleSave`, incluir `tipo_caminhao: values.tipo_caminhao || null`

### 4. `src/components/portaria/EditMovimentoDialog.tsx`

- Adicionar `tipo_caminhao` nos `EDITABLE_FIELDS` como select com opções dinâmicas (ou texto simples)

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar coluna `tipo_caminhao` em `movimentacoes_portaria` |
| `src/lib/portaria-fields-config.ts` | Adicionar campo e visibilidade (obrigatório para terceirizado) |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Renderizar select dinâmico com tipos da tabela `tipos_caminhao` |
| `src/components/portaria/EditMovimentoDialog.tsx` | Incluir `tipo_caminhao` nos campos editáveis |

