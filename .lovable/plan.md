

# Adicionar campo "Nome da Carga" no dialog Completar Logística

## O que será feito

Adicionar um campo de texto **"Nome da Carga"** (que preenche o `carga_id`) dentro do dialog "Completar Logística" em `src/components/dashboard/CarregamentoDialog.tsx`. Assim o usuário pode informar o identificador/nome da carga ao completar os dados de transporte.

## Alteração

### `src/components/dashboard/CarregamentoDialog.tsx`

Na seção `{showLogistica && (...)}`, adicionar um campo `Input` para `carga_id` antes ou junto dos campos existentes (Tipo Caminhão, Placa, Motorista, etc.):

```tsx
<div className="space-y-1.5">
  <Label className="text-xs">Nome da Carga</Label>
  <Input
    value={form.carga_id ?? ""}
    onChange={(e) => set("carga_id", e.target.value)}
    placeholder="Ex: CG-20260318-001"
  />
</div>
```

Nenhuma alteração no banco de dados — o campo `carga_id` já existe na tabela `carregamentos_dia`.

