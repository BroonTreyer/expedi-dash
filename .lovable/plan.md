Vou corrigir o erro na expansão de rupturas sem alterar a regra de negócio:

1. Adicionar um helper local em `src/pages/Rupturas.tsx` para transformar `vendedores` em texto seguro, aceitando estes formatos:
   - string simples;
   - array de strings;
   - array de objetos como `{ nome_vendedor }`;
   - objeto único com `nome_vendedor`;
   - valor vazio/nulo.

2. Substituir os dois pontos que ainda renderizam `c.vendedores` diretamente:
   - card mobile, na linha de pedido/carga;
   - tabela desktop, coluna “Vendedor”.

3. Validar no preview clicando para expandir um produto em ruptura e confirmar que a lista de clientes abre sem quebrar a tela.