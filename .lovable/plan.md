

# Fixar barra de scroll horizontal inferior

## Problema
A barra de scroll nativa no final da tabela só aparece quando você desce até o fim da lista. Já existe uma proxy no topo — agora precisa de uma no rodapé também, fixada na base do viewport.

## Solução
Adicionar uma **segunda barra proxy** fixada no bottom do viewport (`sticky bottom-0`), sincronizada com a tabela e a barra do topo.

## Mudanças em `src/components/dashboard/CarregamentoTable.tsx`

1. **Criar `bottomProxyRef`** — nova ref para a barra inferior
2. **Atualizar sync** — as 3 barras (topo, tabela, rodapé) sincronizam `scrollLeft` entre si
3. **Esconder scrollbar nativa da tabela** — usar CSS `scrollbar-width: none` / `::-webkit-scrollbar { display: none }` no container da tabela, já que as duas proxies substituem a barra nativa
4. **Renderizar barra inferior** após o container da tabela:
   ```
   <div ref={bottomProxyRef} className="sticky bottom-0 z-20 overflow-x-auto overflow-y-hidden bg-muted/30 border-t" style={{ height: 12 }}>
     <div style={{ width: proxyWidth, height: 1 }} />
   </div>
   ```

## Resultado
- Barra horizontal visível no topo E no rodapé do viewport
- Ambas sincronizadas com o scroll real da tabela
- Sem barra vertical interna

