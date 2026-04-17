
User wants:
1. Sub-grupo "Cadastros" no menu já agrupa as 3 páginas (já está feito) — mas agora ele quer **unificar tudo numa única página de Cadastros** com:
   - Um campo de busca global (pesquisa motorista OU caminhão OU tipo)
   - Um único formulário/card que coleta dados de Motorista + Caminhão + Tipo, mas grava nas 3 tabelas separadas no backend.

Vou propor uma página nova `/cadastros` que substitui a navegação para 3 páginas separadas.

## Plano

### 1. Nova página `src/pages/Cadastros.tsx`

Página única com:

**(a) Barra de busca no topo**
- Input "Buscar por nome, CPF, placa ou tipo..."
- Debounce 300ms
- Resultados em 3 listas colapsáveis:
  - Motoristas encontrados (nome, CPF, telefone)
  - Caminhões encontrados (placa, tipo, motorista vinculado)
  - Tipos de caminhão encontrados (nome)
- Ao clicar num resultado → abre o card preenchido em modo edição
- Mensagem clara "Já cadastrado" / "Nenhum cadastro encontrado — preencha abaixo para criar"

**(b) Card único "Novo Cadastro" com 3 seções visuais separadas**

```text
┌─ Cadastro Unificado ────────────────┐
│                                     │
│ ▸ Motorista                         │
│   Nome*, CPF, Telefone, Foto Doc    │
│                                     │
│ ▸ Caminhão                          │
│   Placa*, RENAVAM, Transportadora,  │
│   Tipo (select dos tipos existentes │
│         + opção "+ Criar novo tipo")│
│                                     │
│ ▸ Tipo de Caminhão (opcional)       │
│   Nome do tipo (só preenche se      │
│   estiver criando um tipo novo)     │
│                                     │
│         [ Cancelar ] [ Salvar ]     │
└─────────────────────────────────────┘
```

**Comportamento ao salvar:**
1. Se "Tipo de caminhão" preenchido e não existir → INSERT em `tipos_caminhao` primeiro
2. Se "Motorista" preenchido → INSERT/UPDATE em `motoristas` (incluindo upload da foto se houver)
3. Se "Caminhão" preenchido → INSERT/UPDATE em `caminhoes`, vinculando ao `motorista_id` recém-criado
4. Cada seção é independente: usuário pode salvar só motorista, só caminhão, ou os 3 juntos
5. Validação: pelo menos uma seção precisa ter os campos obrigatórios preenchidos

### 2. Roteamento (`src/App.tsx`)
- Adicionar rota `/cadastros` apontando para `Cadastros.tsx` (lazy + ProtectedRoute com roles `admin, logistica, portaria`)
- Manter `/motoristas`, `/caminhoes`, `/tipos-caminhao` funcionando (não remover — apenas escondê-los do menu)

### 3. Sidebar (`src/components/AppSidebar.tsx`)
- Substituir o sub-grupo "Cadastros" (que tinha 3 filhos) por **um único item folha** chamado "Cadastros" → `/cadastros`
- Estrutura final:
  ```text
  Portaria
    • Carga Própria
    • Terceirizados
    • Cadastros            ← agora é um link direto
  ```

### 4. Reuso de hooks existentes
- `useMotoristas` (busca/create/update) — já tem busca por nome+CPF
- `useCaminhoes` (busca/create/update) — já tem busca por placa
- `useTiposCaminhao` (list/create) — já existe
- Sem migrations necessárias.

### Detalhes técnicos
- Estado local do form gerencia 3 sub-objetos: `{ motorista, caminhao, novoTipo }`
- Busca dispara 3 queries paralelas filtradas pelo termo
- Após salvar com sucesso: limpa o form, mostra toast resumindo o que foi criado/atualizado, invalida queries
- Mantém upload de foto do motorista (storage `portaria/motoristas/{id}/`)
- Sem alterações em RLS / tabelas / edge functions

### Arquivos alterados
- ➕ `src/pages/Cadastros.tsx` (novo)
- ✏️ `src/App.tsx` (nova rota lazy)
- ✏️ `src/components/AppSidebar.tsx` (Cadastros vira folha em vez de grupo)
