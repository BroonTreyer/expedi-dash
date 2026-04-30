## Objetivo

Criar uma seção **"Manual Técnico"** dentro do próprio FricoTrack, acessível só para Admin (e Super Admin), explicando o sistema de cima a baixo — em **dois níveis lado a lado**: 

- **"Para entender"** (linguagem simples, com analogias, sem jargão — para sócios, gerentes, sucessores não-técnicos)
- **"Para o desenvolvedor"** (stack, arquivos, tabelas, fluxos, onde mexer — para quem assumir o código)

O resultado é uma "documentação viva": fica dentro do sistema, sempre disponível, e pode ser atualizada conforme o app evolui.

## Como o usuário vai acessar

- Nova rota `/manual-tecnico` protegida por `SuperAdminRoute` (mesma proteção de `/usuarios`, `/backups`).
- Item no menu lateral (`AppSidebar`), seção "Sistema", com ícone `BookMarked`.
- Layout de 2 colunas:
  - **Esquerda:** sidebar interna com capítulos + campo de busca (filtra por título/conteúdo).
  - **Direita:** conteúdo do capítulo selecionado, com toggle no topo `[Para entender] [Para o desenvolvedor] [Mostrar os dois]` (default = "Mostrar os dois", lado a lado em desktop, empilhado no mobile).
- Botão **"Imprimir / Salvar PDF"** no topo (usa `window.print()` com CSS de impressão — gera o manual inteiro num documento).
- Indicador de "Última atualização" (data fixa no código, atualizada quando mexermos no manual).

## Estrutura dos capítulos

```text
1.  Visão geral — o que é o FricoTrack
2.  Quem usa e o quê faz cada perfil (Admin, Logística, Faturamento, Portaria, Vendedor)
3.  O fluxo do pedido (do vendedor até a saída do caminhão)
4.  Tecnologias usadas (stack)
5.  Como o sistema é organizado (estrutura de pastas)
6.  Banco de dados (tabelas principais e o que guardam)
7.  Segurança e permissões (RLS, roles, autenticação)
8.  Tempo real (como as telas atualizam sozinhas)
9.  Módulo Vendas (rascunho → aprovação → faturamento)
10. Módulo Logística (cargas, roteirização, mapa)
11. Módulo Portaria (frota própria vs terceirizado, OCR, fotos)
12. Módulo Expedição (KPIs do dia)
13. Módulo Rupturas (faltas, motivos, propagação)
14. Módulo Analytics e Relatórios
15. Cadastros (clientes, produtos, motoristas, caminhões, vendedores)
16. Integrações externas (OCR de placa, Gemini, ORS/OSRM, ViaCEP, Rota Livre)
17. Backups e Lixeira (snapshots, restauração)
18. Onde mexer no quê — guia "se eu quiser mudar X, abro o arquivo Y"
19. Como subir uma alteração (Lovable + deploy automático)
20. Problemas comuns (FAQ de troubleshooting)
21. Glossário (carga_id, ruptura, peso_manual, etapa, walk-in, etc.)
```

Cada capítulo tem o mesmo template:

```text
┌─ Capítulo X: [Nome] ─────────────────────────────┐
│                                                  │
│  💡 Para entender                                │
│  [3-6 parágrafos em linguagem simples,           │
│   analogias do mundo real, sem jargão]           │
│                                                  │
│  🔧 Para o desenvolvedor                         │
│  • Arquivos: src/pages/X.tsx, src/hooks/useY.ts  │
│  • Tabelas: tabela_z (campos importantes...)     │
│  • Fluxo técnico passo a passo                   │
│  • "Para mudar Y, edite a função Z em ..."       │
│                                                  │
│  📌 Pontos de atenção (regras a NÃO quebrar)     │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Exemplo do estilo "Para entender" (capítulo Rupturas)

> Imagine que o vendedor tirou um pedido de 100kg de carne. Quando o pessoal foi pesar pra carregar, só tinha 70kg em estoque. Esses 30kg que faltaram a gente chama de **ruptura** — é uma "falta de produto". O sistema guarda quanto era pra sair (100), quanto saiu de verdade (70) e o motivo (ex.: "estoque insuficiente"). Isso vira um relatório que mostra quanto a empresa deixou de faturar por falta.

### Exemplo do estilo "Para o desenvolvedor" (mesmo capítulo)

> - Página: `src/pages/Rupturas.tsx` · Hook: `useCarregamentos`
> - Tabela: `carregamentos_dia` — campos `peso_original`, `quantidade_original`, `ruptura`, `motivo_ruptura`, `ruptura_sinalizada` (este é setado por trigger no banco).
> - Helper: `pesoNaoCarregado` em `src/lib/peso-utils.ts` — sempre use este, **nunca calcule peso de ruptura manualmente** (já causou bug no passado).
> - Para adicionar um novo motivo padrão: editar `MOTIVOS_RUPTURA` em `src/lib/ruptura-utils.ts`.

## O conteúdo vai sair de onde?

Tudo já está documentado em três lugares no projeto — vou consolidar:

1. **`mem://index.md` + ~80 arquivos `mem://*`** — toda a memória do projeto (regras, decisões, "porquês"). Já cobre 90% do que precisa.
2. **Código** — leitura dos `src/pages/*`, `src/hooks/*`, `supabase/functions/*` para listar arquivos e tabelas reais.
3. **Schema do banco** — já temos as ~25 tabelas com colunas e RLS no contexto.

Não há invenção: cada afirmação técnica vai apontar para um arquivo/tabela que existe.

## Detalhes técnicos da implementação

**Arquivos novos:**

```text
src/pages/ManualTecnico.tsx          → página principal (layout 2 colunas + busca + toggle + print)
src/components/manual/
  ├── ManualSidebar.tsx              → lista de capítulos + busca
  ├── CapituloView.tsx               → renderiza um capítulo (Leigo / Dev / Ambos)
  ├── ModoToggle.tsx                 → botões "Para entender / Dev / Ambos"
  └── PrintButton.tsx                → window.print()
src/content/manual/
  ├── index.ts                       → array de capítulos { id, titulo, icone, leigo, dev, atencao }
  ├── 01-visao-geral.ts
  ├── 02-perfis.ts
  ├── ... (um arquivo por capítulo, conteúdo em JSX/MDX-like — usaremos JSX puro para evitar dependência nova)
  └── ...
src/index.css                        → adicionar @media print (esconder sidebar, mostrar tudo expandido)
```

**Arquivos editados:**

```text
src/App.tsx                          → adicionar rota /manual-tecnico (SuperAdminRoute)
src/components/AppSidebar.tsx        → adicionar item "Manual Técnico" na seção de admin
```

**Sem mudanças no banco, sem migrações, sem novas dependências.** Conteúdo é estático em TSX (rápido, versionado no git, fácil de atualizar — basta editar o arquivo do capítulo).

**Busca:** filtro client-side simples (lowercase + includes em título + conteúdo serializado em texto). Não precisa de fuzzy/Fuse.

**CSS de impressão:** `@media print { .no-print { display: none } .capitulo { page-break-after: always } }` — já gera um PDF apresentável quando o usuário clica "Imprimir → Salvar como PDF" do navegador.

## Tamanho e tempo

- ~21 capítulos × ~400-600 palavras cada (leigo + dev) = manual de ~80-100 páginas equivalentes em PDF.
- Implementação em **uma única entrega**: estrutura + todos os capítulos preenchidos.
- Pode ser atualizado depois capítulo a capítulo sem mexer na estrutura.

## O que **não** vou fazer (pra alinhar expectativa)

- Não vou gerar vídeo nem áudio.
- Não vou criar um editor WYSIWYG no painel (conteúdo é editado no código — mais seguro, versionado).
- Não vou expor o manual publicamente (só admin logado vê — contém detalhes internos).
- Não vou documentar bibliotecas externas em profundidade (linko a doc oficial — React, Supabase, Tailwind, etc.).

## Pergunta antes de começar

Você quer que o manual seja **apenas em português** (combinando com o resto do sistema), ou quer **PT + EN lado a lado** caso futuramente entre alguém que não fale português? Recomendo só PT — fica mais leve e o público-alvo (sucessor da operação no Brasil) é PT.
