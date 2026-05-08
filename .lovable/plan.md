## Importar clientes a partir de PDFs (IA)

Adicionar na tela **Clientes** um novo botão **"Importar PDF"** que aceita múltiplos arquivos, extrai os dados de cliente via IA e abre uma tela de revisão antes de gravar no cadastro.

### 1. Edge Function nova: `parse-cliente-pdf`

Arquivo: `supabase/functions/parse-cliente-pdf/index.ts` (modelo do `parse-pedido-pdf`, mas focada em cliente).

- Recebe `{ fileBase64, fileName }`.
- Valida JWT via `auth.getUser()`.
- Chama Lovable AI (`google/gemini-2.5-flash`) com tool calling. Schema esperado:
  ```
  { razao_social, nome_fantasia, cnpj, inscricao_estadual,
    endereco, bairro, cidade, uf, cep, telefone, email }
  ```
- System prompt genérico: extrair dados de cliente do PDF, independente do layout (pedido, proposta, cadastro). Campos ausentes → string vazia. CNPJ/CEP só dígitos.
- Trata 429 e 402 com mensagens claras.
- Configurada em `supabase/config.toml` (mantém `verify_jwt` padrão).

### 2. UI — diálogo `ImportarClientesPdfDialog.tsx`

Novo componente em `src/components/clientes/ImportarClientesPdfDialog.tsx`.

**Fluxo em 2 passos:**

**Passo A — Upload e extração**
- `<input type="file" accept="application/pdf" multiple>` (até 10 arquivos por vez).
- Para cada PDF: converte para base64, chama `supabase.functions.invoke("parse-cliente-pdf")` em sequência (com toast de progresso `n/total`).
- Acumula resultados em estado local: `parsed[]`.

**Passo B — Tabela de revisão**
Tabela editável com 1 linha por PDF, colunas:
- **Status** (✓ extraído / ⚠ erro / ✗ duplicado)
- **Código *** (input — usuário digita; pré-sugere CNPJ sem máscara, mas obrigatório editar/confirmar)
- **Nome *** (input, pré-preenchido com `razao_social`)
- **Cidade**, **UF**, **CEP** (inputs)
- **Arquivo** (nome do PDF, somente leitura)
- **Ações:** remover linha

Validações em tempo real:
- Código + Nome obrigatórios.
- Marca duplicidade comparando `codigo_cliente` com a lista atual de `useClientes()` (badge "Já existe").
- Detecta códigos repetidos entre as próprias linhas.

**Botão "Salvar todos":**
- Filtra linhas válidas (não duplicadas, com código+nome).
- Faz `supabase.from("clientes").upsert(batch, { onConflict: "codigo_cliente" })` em lote único.
- Após salvar: dispara `enrich-clientes-viacep` (cursor) e `sync_clients_to_orders` (mesmo padrão do `handleImport` atual).
- Toast: `"X clientes salvos, Y ignorados"`. Invalida queries `clientes` e `carregamentos`.

### 3. Integração em `src/pages/Clientes.tsx`

- Importa o novo diálogo.
- Adiciona botão **"Importar PDF"** (ícone `FileText`) ao lado de "Importar" (Excel), mantendo o mesmo padrão de estilo `variant="outline" size="sm"`.
- Estado `pdfDialogOpen` controla abertura.
- Não altera nenhum fluxo existente (Excel, ViaCEP, sync).

### 4. Detalhes técnicos

- Conversão base64 no client com `FileReader.readAsDataURL` + `split(",")[1]`.
- Limite por arquivo: 10MB (alerta no UI).
- Erros por arquivo não bloqueiam os demais — mostra mensagem na linha.
- Reuso de helpers: `normalizeCep`, `ufFromCep` para preencher UF se vier vazia mas com CEP.
- CNPJ guardado sem máscara em `codigo_cliente` (apenas dígitos) caso o usuário aceite a sugestão.

### 5. Itens fora do escopo

- Não cria pedido/carga a partir do PDF — apenas cliente.
- Não altera o `parse-pedido-pdf` existente.
- Não adiciona novos campos ao schema da tabela `clientes` (usa os campos já existentes: `codigo_cliente`, `nome_cliente`, `cidade`, `uf`, `cep`, `ativo`). Telefone/email/CNPJ extraídos são exibidos para conferência mas não persistidos enquanto não houver colunas — caso queira persistir, abrir tarefa separada para migration.

### Validação após implementação

1. Subir 2-3 PDFs de layouts diferentes — confirmar extração correta.
2. Editar código na tabela de revisão e salvar — conferir cliente no cadastro.
3. Testar PDF com cliente já existente — confirmar badge "Já existe" e que o upsert atualiza sem duplicar.
