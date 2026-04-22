
## Aba "Manual" na Portaria

### Objetivo
Adicionar uma nova aba **📖 Manual** dentro das páginas de Portaria (Carga Própria e Terceirizado) com um guia completo, didático e ilustrado de todas as funcionalidades — explicado de forma tão simples que qualquer pessoa entenda na primeira leitura.

### Onde aparece
- `/portaria/carga-propria` → nova aba "Manual" ao lado de Pátio, Histórico e Esperados
- `/portaria/terceirizado` → mesma aba, com conteúdo adaptado ao fluxo de terceirizados

A aba se adapta automaticamente à categoria (`carga_propria` ou `terceirizado`) mostrando apenas o conteúdo relevante para aquele time.

### Estrutura do Manual

O manual será organizado em **seções colapsáveis** (accordion), para o usuário abrir só o que precisa sem ficar com muito texto na tela. Cada seção tem:
- 🎯 **O que é** — explicação em 1 frase simples
- 👣 **Passo a passo** — numerado, com palavras simples
- 💡 **Dica** — atalhos e boas práticas
- ⚠️ **Atenção** — erros comuns a evitar

### Seções do Manual

**1. 🚪 Bem-vindo à Portaria**
- O que essa tela faz (controlar quem entra e sai)
- Tour rápido: cabeçalho, KPIs, abas, botões

**2. 📅 Filtro de Datas**
- Como escolher um dia, uma semana ou um mês
- Atalhos "Hoje", "Últimos 7 dias", "Este mês"

**3. 📊 Os Cartões de Resumo (KPIs)**
- O que cada número significa (Entradas, Saídas, No Pátio, etc.)

**4. ➕ Registrar uma Movimentação** (conteúdo varia por categoria)

  **Carga Própria** (4 etapas explicadas com diagrama ASCII):
  ```
  🟠 Chegada → 🔵 Saída p/ Rota → 🟡 Retorno → 🔒 Saída Final c/ Lacre
  ```
  - Etapa 1: Como registrar a chegada do caminhão (pela aba Esperados ou botão Registrar)
  - Etapa 2: Saída para rota — preencher rota, KM inicial, foto do painel
  - Etapa 3: Retorno — KM final, foto do painel
  - Etapa 4: Saída final — número e foto do lacre

  **Terceirizado** (3 etapas):
  ```
  🟠 Chegada → 📦 Carregamento → 🚛 Saída
  ```
  - Como vincular a uma carga fechada
  - Quando preencher cada campo

**5. 🅿️ Aba Pátio**
- O que mostra (veículos que ainda estão dentro)
- Como dar baixa (registrar a próxima etapa)
- Cores e badges (o que cada cor quer dizer)

**6. 📜 Aba Histórico**
- Lista completa do período
- Como filtrar por tipo (entrada/saída)
- Como ver detalhes de um registro
- Como exportar para Excel/CSV

**7. 🔍 Detalhes de um Registro**
- O que aparece no popup de detalhes
- Linha do tempo (Carga Própria mostra 4 marcos)
- Como ver e baixar fotos (placa, painel, lacre, documento, nota)

**8. 📋 Aba Esperados**
- O que é a planilha de esperados
- Como importar (botão Importar — só admin/logística)
- Como marcar um veículo como "chegou" (1 clique na carga própria)
- Janela de ±3 dias

**9. 🔔 Solicitações Pendentes & Cargas Aguardando**
- Painéis acima das abas
- Como aprovar uma solicitação walk-in
- Como dar entrada numa carga já fechada

**10. 📷 Fotos e Documentos**
- Como tirar foto pelo celular
- Como anexar PDF (nota fiscal)
- O que o OCR faz automaticamente (lê a placa)

**11. 🔎 Busca**
- Campo de busca: o que ele procura (placa, motorista, empresa, nome)

**12. 🆘 Problemas Comuns / FAQ**
- "Não consigo achar um caminhão"
- "Tirei foto errada, e agora?"
- "Esqueci de registrar a chegada"
- "Apareceu erro vermelho"
- Quem chamar (admin/logística)

**13. 🎨 Legenda de Cores e Ícones**
- Tabela com todos os badges, cores de etapa, ícones e o que significam

### Design

- Mesmo padrão visual do resto do app (Card, Accordion, Badge do shadcn)
- Ícones grandes (lucide-react) em cada seção para escaneabilidade
- Blocos coloridos suaves para Dica (azul), Atenção (amarelo), Passo (cinza)
- Diagramas ASCII em `<pre>` com fundo `bg-muted` para os fluxos
- Totalmente responsivo (mobile-first, igual às outras abas)
- Sem necessidade de banco de dados — conteúdo estático em JSX

### Arquivos
- 🆕 `src/components/portaria/ManualTab.tsx` — componente da aba com todo o conteúdo, recebe `categoria` como prop e mostra blocos condicionais por fluxo
- ✏️ `src/pages/Portaria.tsx` — adicionar `<TabsTrigger value="manual">` e `<TabsContent value="manual">` renderizando `<ManualTab categoria={categoria} />`

### Resultado
Qualquer porteiro novo (ou veterano com dúvida) abre a aba **Manual** na própria tela onde trabalha e encontra a resposta sem precisar pedir ajuda — explicado com palavras simples, passos numerados e diagramas visuais.
