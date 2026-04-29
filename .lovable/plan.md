# Adicionar campos no CSV da Portaria

## O que muda

No botão **"CSV"** das telas de Portaria (Carga Própria e Terceirizado), o arquivo exportado passará a conter duas novas colunas:

1. **Data/Retorno** — data e hora em que o veículo retornou ao pátio (formato `dd/MM/yyyy HH:mm`).
2. **Carga** — identificador/nome da carga vinculada ao veículo.

## Detalhes por tipo

- **Frota Própria**: usa `horario_real_retorno` (chegada de volta da rota). Se já houver `horario_saida_final` (saída definitiva após conferência), também é exibido em uma coluna adicional **"Saída Final"**.
- **Terceirizado**: usa `horario_real_saida` como o horário de "liberação/retorno" (saída do pátio após carregamento), já que terceirizado não retorna.
- **Carga**: prioriza `nome_carga` quando existir (buscando no registro vinculado); caso contrário, mostra `carga_id`.

## Layout final do CSV

```text
Data/Hora | Tipo | Categoria | Placa | Motorista | Empresa |
Carga | Setor | Rota | KM Inicial | KM Final | KM Rodado |
Data/Retorno | Saída Final | Observações
```

## Detalhes técnicos

- **Arquivo**: `src/pages/Portaria.tsx`, função `exportCSV` (linhas 204-252).
- **Headers**: adicionar `"Carga"`, `"Data/Retorno"` e `"Saída Final"` ao array `headers`.
- **Rows**: para cada movimento `m`:
  - `carga`: `m.nome_carga || m.carga_id || ""` (campo `nome_carga` precisa ser lido — atualmente o tipo `MovimentacaoPortaria` não inclui; verificar se já vem do `select("*")` em `useMovimentacoes`. Se não, fazemos lookup pelo `carga_id` em `carregamentos_dia` ou apenas exibimos `carga_id`).
  - `data_retorno`: `m.horario_real_retorno ? format(..., "dd/MM/yyyy HH:mm") : ""`.
  - `saida_final`: `m.horario_saida_final ? format(..., "dd/MM/yyyy HH:mm") : ""`.
- Atualizar dependências do `useCallback`.

## Fora do escopo

- Não altera o CSV dos relatórios em `src/hooks/useRelatorios.ts` (arquivos XLSX separados).
- Não altera a UI da tabela em tela — apenas o arquivo exportado.
