Plano de correção do painel de pedidos dos vendedores

Problemas confirmados
- A base de clientes tem cerca de 32 mil registros, mas o diálogo de Novo Pedido está carregando todos os clientes de uma vez com paginação de 1000 em 1000 e só depois faz o preenchimento local. Isso explica a demora grande para puxar o cliente.
- O código 33011 existe na base e deveria preencher imediatamente: DMA DISTRIBUIDORA S A D178, Nova Viçosa/BA. O problema não é falta de cadastro; é a forma pesada de buscar.
- O layout do modal está usando colunas fixas e largura interna maior que a tela. No print, isso gerou barra horizontal, campos cortados e botão final saindo da área visível.
- O popover de produto tem largura fixa de 320px, o conteúdo do item não se adapta bem ao celular/tablet, e o rodapé do modal também não está otimizado para telas pequenas.

O que vou corrigir

1. Busca rápida de cliente por código
- Parar de carregar a lista completa de clientes dentro do Novo Pedido.
- Implementar busca sob demanda com debounce curto, igual ao padrão já previsto para bases grandes:
  - vendedor digita o código;
  - após alguns milissegundos, o sistema consulta direto `codigo_cliente`;
  - se encontrar, preenche cliente, cidade e UF automaticamente.
- Exibir estados claros:
  - “Buscando cliente...” durante a consulta;
  - “Cliente não encontrado” quando não existir;
  - manter botão “Novo” para cadastro quando necessário.
- Normalizar o código digitado com `trim()` para evitar falha por espaço antes/depois.

2. Corrigir layout do modal Novo Pedido
- Transformar o modal em layout responsivo real:
  - celular: tela quase cheia, sem barra horizontal, campos empilhados;
  - tablet: campos em grade equilibrada;
  - desktop: largura maior e harmonizada.
- Remover larguras rígidas que causam estouro.
- Ajustar o cabeçalho e espaçamentos para ficar mais limpo.
- Organizar os blocos:
  - Cliente;
  - Itens do pedido;
  - Observações;
  - Total;
  - Ações.

3. Melhorar o bloco de itens do pedido
- Em vez de uma linha “espremida” com 5 colunas fixas, cada item vira um card compacto e responsivo.
- Campos em ordem correta conforme regra do projeto:
  - Produto;
  - Peso (kg);
  - Qtd/Unidades;
  - Preço unitário.
- Em celulares, cada campo ocupa largura adequada e não corta texto.
- O total por item ficará alinhado e legível, sem quebrar o layout.
- O botão de remover item ficará posicionado de forma consistente.

4. Produto pesquisável e responsivo
- Manter a busca por código ou nome.
- Ajustar o popover para usar a largura disponível, sem largura fixa que estoura no celular.
- Melhorar truncamento/legibilidade do produto selecionado.
- Limitar a altura da lista para não invadir a tela em mobile.

5. Rodapé e botões no mobile
- Ajustar os botões “Cancelar”, “Salvar rascunho” e “Enviar para faturamento”:
  - no celular, ficam empilhados ou em largura total sem cortar texto;
  - em tablet/desktop, ficam alinhados à direita.
- Corrigir o aviso de console relacionado ao `DialogFooter` recebendo ref indevido, substituindo por uma estrutura simples quando necessário.

6. Página Meu Painel / Meus Pedidos responsiva
- Ajustar o cabeçalho da seção “Meus Pedidos” para empilhar no celular.
- Ajustar as colunas Rascunhos / Aguardando / Aprovados:
  - celular: uma coluna;
  - tablet: layout fluido sem cards espremidos;
  - desktop: três colunas.
- Remover rolagem interna rígida dos cards quando prejudicar mobile, mantendo listas expandindo naturalmente conforme padrão do projeto.
- Ajustar abas do Meu Painel para não quebrar ou estourar em telas pequenas, usando scroll horizontal controlado quando necessário.

7. Manter a lógica comercial já feita
- Preservar o cálculo Peso x Quantidade.
- Preservar preço unitário e total do pedido.
- Preservar criação de rascunho e envio para faturamento.
- Preservar cadastro rápido de cliente.

Detalhes técnicos
- Alterar principalmente:
  - `src/components/vendedor/NovoPedidoDialog.tsx`
  - `src/components/vendedor/MeusPedidos.tsx`
  - se necessário, pequenos ajustes em `src/pages/MeuPainel.tsx`
- Não editar arquivos gerados automaticamente da integração com backend.
- Usar a tabela `clientes` com consulta direta por `codigo_cliente`, aproveitando o índice já existente.
- Manter consultas protegidas por sessão (`enabled: !!session`).
- Não criar nova tabela para isso; a base já tem os dados e o índice necessário.

Resultado esperado
- Ao digitar 33011, o cliente deve aparecer rapidamente sem esperar carregar 32 mil clientes.
- O modal não deve ter barra horizontal no celular/tablet.
- Campos e botões não devem ficar cortados.
- A experiência do vendedor em celular e tablet deve ficar limpa, harmonizada e operacional.