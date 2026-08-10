# Corrigir lista de veículos esperados do Varejo

## Diagnóstico confirmado

Os 16 veículos foram gravados corretamente no banco como `PRÓPRIA`, não conferidos e com datas entre 08/08 e 10/08. A tela consulta todos os históricos em ordem crescente, mas o backend limita cada resposta a 1.000 linhas; assim, somente registros antigos chegam ao navegador e os recém-importados ficam fora da resposta, gerando o falso estado `0/0 conferidos`.

## Ajuste

1. Alterar a busca de veículos esperados para carregar os resultados em páginas, sem depender de uma única resposta limitada a 1.000 linhas.
2. Manter os filtros atuais de grupo, data e situação, garantindo que importações recentes de Varejo apareçam imediatamente.
3. Preservar a invalidação automática após importar e validar na tela que os 16 registros aparecem em **Esperados** com a contagem correta.

## Detalhes técnicos

- Ajustar `useVeiculosEsperados` para consultar com intervalos paginados e combinar as páginas antes de alimentar o React Query.
- Manter a chave de cache e o realtime existentes, evitando mudanças no fluxo de cadastro ou no banco.
- Conferir especificamente os registros `PRÓPRIA` de 08/08 a 10/08 e o estado vazio do painel.