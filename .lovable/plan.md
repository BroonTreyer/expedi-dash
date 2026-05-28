## Objetivo

Exibir o telefone do motorista em dois lugares:

1. **Painéis da tela Portaria** (1º print): "Aguardando vínculo da Logística" e "Cargas fechadas aguardando veículo".
2. **Romaneio de impressão** (2º print): bloco de informações do cabeçalho, ao lado de "Motorista".

Hoje os componentes só recebem o nome do motorista; o telefone existe na tabela `motoristas` (campo `telefone`), mas não está sendo buscado.

## Como buscar o telefone

Criar um hook leve `useTelefonesMotoristas()` em `src/hooks/useMotoristas.ts` (ou arquivo novo) que:

- Faz `select('nome_completo, telefone')` em `motoristas` (uma única vez, com cache do React Query).
- Retorna um `Map<string, string>` indexado pelo nome normalizado (uppercase + trim).
- Helper `getTelefone(nome)` faz o lookup; retorna `null` se não encontrar.

Telefone exibido com a máscara já existente em `src/lib/masks.ts` (formato `(99) 99999-9999`).

## Mudanças nos arquivos

### 1. `src/components/portaria/SolicitacoesPendentesPanel.tsx`
Linha ~219, no bloco `Motorista: {v.motorista}`, acrescentar após o nome:
```
{telefone && <> • <span className="text-muted-foreground">Tel.:</span> {telefone}</>}
```

### 2. `src/components/portaria/CargasFechadasAguardandoPanel.tsx`
Linha ~302, mesma adição depois de `Motorista: {c.motorista}`.

### 3. `src/components/dashboard/CargaPrintDialog.tsx`
- Adicionar campo opcional `telefoneMotorista?: string` em `CargaPrintData`.
- Linha 165: renderizar abaixo do motorista:
  ```
  <div><span className="font-semibold">Telefone:</span> {data.telefoneMotorista || "—"}</div>
  ```
- Em `src/pages/Index.tsx` (linha ~644) e `src/pages/Consolidado.tsx` (linha ~599): preencher `telefoneMotorista` usando o mesmo lookup.

### 4. (Bônus, mesmo padrão) `PainelChegou.tsx` e `PainelCargasFechadas.tsx` (Expedição)
Se o usuário quiser que apareça também na tela Expedição, podemos aplicar a mesma lógica. **Por padrão não inclui** já que o pedido foi sobre os dois prints — confirmar se quer estender.

## Sem mudanças

- Sem alteração de schema.
- Sem alteração nas mutações de criação/edição.
- Telefone é só exibição (lookup pelo nome).

## Caso o motorista não exista no cadastro

Mostra apenas o nome (sem o sufixo de telefone) — silencioso, sem "—" nos painéis.
No romaneio, mostra "—" para deixar o campo visível ao motorista de plantão.
