## Mostrar fotos no painel do motorista

Hoje o drawer de detalhe do motorista mostra horários, KM, observações e ocorrências de cada rota — mas **não mostra as fotos** capturadas pela portaria (placa, painel KM saída/retorno, lacre, nota, documento). Vou adicionar essas evidências visuais no drawer e no relatório impresso.

### O que será exibido por rota

Para cada rota no histórico do motorista, uma faixa de miniaturas com as fotos disponíveis:

- 📷 Placa
- 🛞 Painel KM — saída (carga própria)
- 🛞 Painel KM — retorno (ou único registro de KM em terceirizado)
- 🔒 Lacre
- 📋 Nota fiscal
- 📄 Documento do motorista

Se um campo não tiver foto, simplesmente não aparece (sem placeholders vazios).

### Comportamento

**No drawer (`MotoristaDetalheDrawer`)**
- Nova seção "Fotos" dentro de cada card de rota, após observações.
- Miniaturas quadradas (~64px) em grid responsivo, com legenda curta abaixo.
- Clique abre a foto em tela cheia usando o `PhotoViewerDialog` já existente (suporta imagem e PDF, com fallback automático e botão "abrir em nova aba").
- Badge no topo do card "📷 N fotos" para indicar disponibilidade rápida.

**No relatório impresso (`MotoristaPrintDialog`)**
- Adicionar até 4 thumbnails por rota (placa, painel saída, painel retorno, lacre) em layout de grade compacta (CSS print-friendly).
- Cada foto com legenda em texto pequeno.
- Mantém quebras de página existentes; CSS `@media print` garante que fotos não cortem entre páginas (`break-inside: avoid`).

### Detalhes técnicos

- **Sem mudança de schema**: os campos `foto_placa_url`, `foto_painel_url`, `foto_painel_saida_url`, `foto_lacre_url`, `foto_nota_url`, `foto_documento_url` já existem em `movimentacoes_portaria` e já chegam no hook `useMotoristasPainel` (faz `select("*")`).
- **Tipo**: estender o tipo de movimento usado no drawer para incluir esses campos (já estão em `MovimentacaoPortaria`).
- **Storage**: as URLs vêm já assinadas do bucket privado `portaria` (mesmo padrão do `MovimentoDetailsDialog`). Sem novo signing necessário no painel — reutilizar URLs como já estão no objeto.
- **Componente novo**: `MotoristaFotosRota` (pequeno, dentro de `MotoristaDetalheDrawer.tsx`) que recebe um movimento e renderiza a grade de thumbnails + abre `PhotoViewerDialog` no clique.
- **Reuso**: `PhotoViewerDialog` já trata PDF, erro de imagem e link externo — não precisa duplicar lógica.

### Arquivos a editar

- `src/components/motoristas/MotoristaDetalheDrawer.tsx` — nova seção de fotos por rota + badge de contagem.
- `src/components/motoristas/MotoristaPrintDialog.tsx` — grade de thumbnails por rota no relatório.
- `mem/features/drivers-panel.md` — atualizar nota do feature mencionando exibição de fotos.

Sem migrações, sem novas queries, sem mudanças de RLS.