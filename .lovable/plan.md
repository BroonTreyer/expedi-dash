

# Sistema de Acompanhamento de Carregamentos e Expedição

## Visão Geral
Painel logístico operacional para acompanhamento diário de carregamentos — simples, visual e focado em desktop.

---

## Páginas e Funcionalidades

### 1. Painel Principal — Acompanhamento do Dia
- **Indicadores no topo**: Total de cargas, peso total, peso carregado, peso em carregamento, peso pendente, total de veículos — em cards visuais com ícones
- **Alternância entre visualização Tabela e Kanban** (botão toggle)
- **Filtros**: Status, vendedor, tipo de caminhão, cidade, data e busca por produto
- **Tabela principal** com todas as colunas especificadas, com status colorido (cinza, azul, amarelo, verde, vermelho) editável diretamente via dropdown na célula
- **Kanban**: Colunas por status, cards arrastáveis com resumo do carregamento
- **Regras automáticas**: Ao mudar status para "Carregando" → registra horário início; "Carregado" → registra horário fim
- **Autocomplete de produto**: Ao digitar código, preenche nome automaticamente
- **Botão para adicionar novo carregamento** via modal/formulário rápido

### 2. Cadastro de Produtos
- Tela simples com listagem, busca e formulário para adicionar/editar produtos (código, nome, peso padrão, ativo)

### 3. Cadastro de Vendedores
- Listagem com busca e formulário para adicionar/editar vendedores (código, nome, ativo)

### 4. Cadastro de Tipos de Caminhão
- Listagem simples com formulário para adicionar/editar tipos

### 5. Navegação
- Sidebar ou top nav com links: Painel, Produtos, Vendedores, Tipos de Caminhão

---

## Banco de Dados (Lovable Cloud / Supabase)
- **produtos**: id, codigo_produto, nome_produto, peso_padrao, ativo
- **vendedores**: id, codigo_vendedor, nome_vendedor, ativo
- **tipos_caminhao**: id, nome_tipo
- **carregamentos_dia**: id, data, vendedor_id, codigo_produto, nome_produto, quantidade, peso, tipo_caminhao, placa, motorista, cidade, uf, horario_previsto, horario_inicio, horario_fim, status, observacoes, created_at, updated_at

---

## Design
- Layout limpo e moderno com tema claro
- Cores de status bem definidas nos badges
- Cards de indicadores com destaque visual
- Foco em desktop, responsivo básico

