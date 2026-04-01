

# Cadastro de Caminhões com Vínculo a Motorista

## O que será feito

Criar um cadastro completo de caminhões (veículos) com tipo, placa, RENAVAM e motorista vinculado. Quando o usuário selecionar um caminhão nos fluxos de fechamento de carga ou portaria, o sistema puxará automaticamente o motorista e seus dados.

## Mudanças

### 1. Nova tabela `caminhoes` no banco
- Campos: `id`, `tipo_caminhao` (text), `placa` (text, unique), `renavam` (text), `motorista_id` (uuid, referência à tabela `motoristas`, nullable), `ativo` (boolean), `created_at`
- RLS: leitura para authenticated, escrita para admin/logistica/portaria, exclusão para admin

### 2. Hook `useCaminhoes.ts`
- CRUD completo (query com join em `motoristas` para trazer nome/telefone/cpf)
- Busca por placa ou tipo

### 3. Página `src/pages/Caminhoes.tsx`
- Tabela com: Placa, RENAVAM, Tipo, Motorista vinculado, Ações
- Dialog de criação/edição com:
  - Select de tipo (usando `tipos_caminhao` existente)
  - Input de placa (uppercase automático)
  - Input de RENAVAM
  - `MotoristaAutocomplete` para vincular motorista
- Versão mobile em cards
- Busca por placa

### 4. Rota e Sidebar
- Nova rota `/caminhoes` em `App.tsx` (roles: admin, logistica)
- Item no sidebar "Caminhões" com ícone `Truck`

### 5. Autocomplete de Caminhão (`CaminhaoAutocomplete.tsx`)
- Componente similar ao `MotoristaAutocomplete`
- Busca por placa, mostra tipo e motorista vinculado
- Ao selecionar, preenche automaticamente: placa, tipo_caminhao, motorista, e dados do motorista (telefone, CPF)
- Botão de cadastro rápido quando não encontrar

### 6. Integração no `FechamentoLoteDialog`
- Substituir campo de placa simples pelo `CaminhaoAutocomplete`
- Ao selecionar caminhão: preencher placa, tipo_caminhao, motorista automaticamente
- Manter opção de preenchimento manual

---

## Detalhes Técnicos

| Arquivo | Mudança |
|---|---|
| Migration SQL | Criar tabela `caminhoes` com RLS |
| `src/hooks/useCaminhoes.ts` | Novo — CRUD com join em motoristas |
| `src/pages/Caminhoes.tsx` | Nova página de cadastro |
| `src/components/portaria/CaminhaoAutocomplete.tsx` | Novo componente de busca |
| `src/components/dashboard/FechamentoLoteDialog.tsx` | Integrar CaminhaoAutocomplete |
| `src/App.tsx` | Adicionar rota `/caminhoes` |
| `src/components/AppSidebar.tsx` | Adicionar item "Caminhões" |

