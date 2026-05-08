## Problemas identificados em `/cadastros` → aba **Transportadoras**

Olhando o screenshot e o código de `src/components/cadastros/TransportadorasTab.tsx`:

1. **Botão "Nova" desencaixado** — está flutuando na direita, muito longe do texto "Cadastro com código, PIX e % padrão de adiantamento.", parecendo solto. Deveria estar no topo do card como ação principal, não acima do card.
2. **Cabeçalho "% Adt. padrão" quebra em duas linhas** desnecessariamente, porque o texto não tem `whitespace-nowrap` e a coluna fica sem largura mínima.
3. **Ações (lápis/lixeira) com espaçamento ruim** — célula tem `text-right` mas os botões ficam grudados/centralizados de forma estranha; falta `flex justify-end gap-1`.
4. **Colunas espalhadas demais em desktop** — a tabela ocupa toda a largura do `max-w-5xl` (1024px+) com pouquíssimo conteúdo, fazendo "Código", "CNPJ" etc. ficarem muito afastados. Falta dar `min-w` adequado às colunas longas (Nome, PIX) e deixar as curtas com largura natural.
5. **Sem responsividade real em mobile** — `overflow-x-auto` resolve só o scroll, mas a tabela fica praticamente inutilizável no celular. Deveria virar **lista de cards** abaixo de `md` (padrão já adotado em outras telas — ver `mem://style/responsiveness-standard`).
6. **Status "Ativa" em vermelho** — o `Badge variant="default"` herda a cor primária (vermelho da marca). Pelas regras do projeto (`mem://style/color-palette`), **vermelho é exclusivo de Rupturas**. Status deve ser verde/neutro.
7. **Tabela sem hover** nas linhas (microconforto).
8. **Padding interno do Card zero** (`p-0`) e o cabeçalho "Cadastro com código…" fica fora do card — visualmente o card parece "nu".

## Plano de correção (apenas frontend, arquivo único)

**Arquivo:** `src/components/cadastros/TransportadorasTab.tsx`

1. **Reagrupar header da aba** dentro de um único bloco:
   - Linha 1: título sutil "Transportadoras cadastradas" + descrição.
   - Linha 2 (à direita, alinhada ao topo): botão **+ Nova**.
   - Usar `flex items-center justify-between gap-3 flex-wrap` com a descrição à esquerda e o botão à direita — mas com gap visualmente coeso (não solto como hoje).

2. **Tabela (desktop, ≥ md):**
   - Adicionar `whitespace-nowrap` em todos os `TableHead`.
   - Definir larguras: `Nome` flexível (`min-w-[220px]`), `Código`/`CNPJ` `w-[120px]`, `PIX` `min-w-[200px]`, `% Adt.` `w-[110px] text-right`, `Status` `w-[100px]`, ações `w-[88px]`.
   - Linhas com `hover:bg-muted/40`.
   - Trocar célula de ações para `<div className="flex justify-end gap-1">` envolvendo os dois botões.

3. **Status verde, não vermelho:**
   - Substituir `<Badge variant={t.ativo ? "default" : "outline"}>` por um badge customizado com tokens semânticos:
     - Ativa: `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300` (ou usar token `--success` se existir; caso não exista, manter as classes acima — sem usar vermelho).
     - Inativa: `variant="outline"` em cinza.

4. **Mobile (< md):**
   - Esconder a tabela (`hidden md:block`) e mostrar uma lista de cards (`md:hidden space-y-2`) com os mesmos campos:
     - Linha 1: `Nome` (negrito) + Badge de status à direita.
     - Linha 2: `Código · CNPJ`.
     - Linha 3: `PIX` (truncate).
     - Linha 4: `% Adt: 50%` + ações (lápis/lixeira) à direita.

5. **Diálogo de edição:**
   - O `<input type="checkbox">` nativo está cru — trocar pelo `<Checkbox>` do shadcn (`@/components/ui/checkbox`) para coerência visual.
   - Trocar o `<select>` nativo do "Tipo PIX" pelo `<Select>` do shadcn (já usado em outras partes do projeto), mantendo as mesmas opções.
   - `DialogContent` com `max-w-xl` está OK, mas adicionar `max-h-[85vh] overflow-y-auto` para telas baixas.

6. **Confirmação de exclusão:**
   - Substituir `confirm(...)` nativo por `AlertDialog` do shadcn — alinha com `mem://features/data-safety` (deletions require user confirmation, não usar `window.confirm`).

## Fora do escopo

- Não alterar a aba "Motorista / Caminhão" nem outras telas.
- Não mexer em hooks (`useTransportadorasFinanceiro`) ou no banco.
- Não mudar campos do cadastro (mesma estrutura).

## Validação

- Visualizar `/cadastros` → aba Transportadoras em **desktop (1185px)**: header coeso, colunas com largura proporcional, "% Adt. padrão" em uma linha só, status em verde.
- Reduzir para **mobile (≤ 414px)** via device toolbar: tabela some, lista de cards aparece, sem scroll horizontal.
- Abrir diálogo "+ Nova" e "Editar": Select/Checkbox shadcn renderizam, scroll vertical funciona em viewport baixa.
- Clicar lixeira: `AlertDialog` aparece pedindo confirmação.
