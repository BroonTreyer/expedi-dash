
## Plano para resolver de vez a barra horizontal (sem barra vertical interna)

### Diagnóstico
Hoje a barra horizontal nativa fica no **fim do elemento da tabela** (depois de todas as linhas).  
Como a lista é longa, em tela dividida você precisa descer até o final para conseguir arrastar lateralmente.

### Solução proposta
Implementar uma **barra horizontal auxiliar fixa no topo da área da tabela** (estilo “controlador de scroll”), sincronizada com o scroll real da tabela.

Assim:
- você arrasta lateralmente sem ir ao final da página;
- a tabela continua sem scroll vertical interno;
- o scroll vertical permanece só na página (como você pediu).

---

### Arquivo a ajustar
- `src/components/dashboard/CarregamentoTable.tsx` (somente versão desktop)

---

### Implementação (objetiva)

1. **Criar refs e estado de sincronização**
   - `tableScrollRef` (container real da tabela com `overflow-x-auto`)
   - `proxyScrollRef` (barra horizontal auxiliar)
   - estado para `proxyWidth` e `showProxy`
   - flag `isSyncing` para evitar loop de eventos

2. **Medir overflow horizontal real**
   - calcular `scrollWidth` da tabela e comparar com `clientWidth`
   - se houver overflow, exibir a barra auxiliar
   - atualizar em resize/alteração de dados (via `ResizeObserver` + `useEffect`)

3. **Sincronizar os dois scrolls**
   - ao rolar a barra auxiliar → atualizar `tableScrollRef.scrollLeft`
   - ao rolar a tabela (trackpad/shift+wheel) → atualizar `proxyScrollRef.scrollLeft`

4. **Renderizar barra auxiliar acima da tabela**
   - bloco com `overflow-x-auto overflow-y-hidden`
   - `position: sticky` no topo da seção da tabela para ficar sempre acessível durante rolagem vertical
   - conteúdo interno “fantasma” com largura igual ao `scrollWidth` da tabela

5. **Manter regra de UX pedida**
   - container da tabela continua com `overflow-x-auto overflow-y-visible`
   - **não** reintroduzir `max-height` nem `overflow-y-auto`
   - remover qualquer classe que gere barra vertical na tabela

6. **Ajuste fino do header**
   - se necessário, ajustar `top` do `TableHeader` sticky para não sobrepor a barra auxiliar (ex.: `top-8`)

---

### Critérios de aceite
- Em tela dividida, é possível arrastar horizontalmente **sem** descer ao final da lista.
- Não aparece barra vertical interna na tabela.
- Scroll vertical continua sendo apenas da página.
- Scroll horizontal auxiliar e da tabela permanecem sincronizados em ambos os sentidos.
