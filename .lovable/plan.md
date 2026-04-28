Entendi. Fiz uma primeira auditoria técnica nos pontos mais críticos e encontrei sinais claros de fragilidade estrutural que explicam sintomas como “apaguei um item e sumiu outro”, “editei um pedido e bagunçou outro”, “clone duplicou coisa indevida” e pesos sendo alterados em massa.

## Diagnóstico inicial

### 1. Agrupamento errado de pedidos na tela principal
Hoje a tabela agrupa registros por:

```text
data + codigo_cliente
```

Isso é perigoso porque o mesmo cliente pode ter vários pedidos no mesmo dia. Encontrei vários casos assim no banco. Exemplo: um cliente no dia 27/04 aparece com dezenas de números de pedido diferentes no mesmo grupo visual.

Consequência prática:
- A tela mostra vários pedidos diferentes como se fossem um único “pedido completo”.
- O botão de lixeira do grupo pode excluir vários produtos/pedidos que o usuário não pretendia excluir.
- O botão de editar grupo pode aplicar alterações em itens que só estavam agrupados por cliente/data, não por pedido real.

Correção necessária: agrupar por uma chave de pedido real, no mínimo:

```text
data + numero_pedido + codigo_cliente
```

E idealmente criar um identificador interno imutável de pedido, como `pedido_grupo_id`.

---

### 2. Cascata de edição usa uma chave muito frágil
No fluxo de edição, quando um item é editado, o sistema propaga alguns campos para os “irmãos” usando principalmente:

```text
numero_pedido + data
```

Encontrei pelo menos um caso de mesmo número de pedido na mesma data com clientes diferentes. Nesse cenário, editar um pedido pode atingir outro pedido por engano.

Correção necessária:
- Trocar a lógica de “irmãos” para usar `pedido_grupo_id` ou, enquanto isso, `data + numero_pedido + codigo_cliente`.
- Nunca aplicar cascata baseada só em `numero_pedido + data`.

---

### 3. Operações em lote não são transacionais
Várias ações importantes fazem múltiplos updates/inserts/deletes em sequência no frontend, por exemplo:

- editar pedido completo;
- fechar carga;
- adicionar pedido a carga;
- desfazer carga;
- editar vários produtos;
- excluir vários itens;
- importar veículos esperados.

Se uma parte falha no meio, o sistema pode ficar em estado parcial: alguns itens mudam, outros não. Isso gera a sensação de que “bagunçou tudo”.

Correção necessária:
- Criar operações transacionais no backend para as ações críticas.
- O frontend deve chamar uma única operação segura, e o banco confirma tudo ou nada.

---

### 4. Proteção de `peso_original` ainda permite corrupção
O histórico recente mostrou exatamente isso: alguns pesos foram “achatados” para valores como 33,6 kg e depois o `peso_original` também acabou refletindo valores errados. Existe trigger de proteção, mas ela ainda permite que `peso_original` seja alterado em fluxos normais.

Consequência:
- Rupturas parciais falsas.
- Peso real sendo limitado por um `peso_original` corrompido.
- Cargas ficando com peso totalmente errado.

Correção necessária:
- Tornar `peso_original` e `quantidade_original` praticamente imutáveis após criação.
- Atualização normal de pedido não deve conseguir sobrescrever original.
- Correção de original deve acontecer apenas por função administrativa auditada.

---

### 5. Clone tem proteção parcial, mas ainda pode duplicar em retry/falha parcial
O sistema já tem `row_op_key`, mas no diálogo existe uma lógica que muda parte da chave a cada tentativa. Isso reduz colisão, mas também permite duplicidade se uma tentativa falhar parcialmente e o usuário tentar de novo.

Correção necessária:
- Usar chave idempotente estável por sessão de criação/clonagem.
- Se o mesmo envio chegar duas vezes, o banco deve reconhecer como a mesma operação, não criar cópia nova.

---

### 6. Portaria também tem operações amplas demais
Na área de veículos esperados/registro de entrada encontrei operações como:

```text
marcar conferido por data + placa
importar planilha apagando todos os veículos de uma data
limpar lista por intervalo de datas
```

Essas ações são arriscadas se houver placa repetida, veículo manual, walk-in, ou carga já vinculada.

Correção necessária:
- Atualizações de conferência devem usar `id`, não placa/data.
- Importação de planilha não deve apagar walk-ins, conferidos ou veículos vinculados.
- “Limpar lista” precisa ser mais restrito e confirmar o escopo exato.

---

### 7. Segurança e funções do banco
A auditoria automática encontrou 42 avisos de funções privilegiadas executáveis publicamente. Nem todos viram bug imediatamente, mas é uma superfície de risco e fragilidade.

Correção necessária:
- Revogar execução pública de funções internas.
- Manter públicas apenas funções realmente necessárias para portal/link público.
- Exigir usuário autenticado nas demais.

---

## Plano de correção

### Fase 1 — Correções imediatas dos bugs de edição/exclusão/clonagem

1. Corrigir o agrupamento da tabela principal e da visualização mobile:
   - trocar agrupamento de `data + codigo_cliente` para `data + numero_pedido + codigo_cliente`;
   - exibir claramente “Pedido X” no cabeçalho;
   - impedir que pedidos diferentes do mesmo cliente apareçam como um único grupo.

2. Corrigir os botões de ação:
   - lixeira do grupo: “Excluir pedido completo” somente para itens do mesmo pedido real;
   - lixeira do item: excluir somente aquele produto/linha;
   - confirmação deve mostrar cliente, pedido, quantidade de produtos e peso afetado;
   - bloquear exclusão em lote se os IDs selecionados não pertencerem ao mesmo pedido/carga esperada.

3. Corrigir a cascata de edição:
   - remover propagação baseada apenas em `numero_pedido + data`;
   - aplicar cascata apenas ao grupo exato do pedido;
   - em edição de item individual, não alterar produtos irmãos sem intenção clara.

4. Corrigir clone:
   - limpar todos os campos operacionais no clone;
   - manter uma chave idempotente estável;
   - impedir duplo envio/retry de criar duplicatas.

---

### Fase 2 — Blindagem estrutural no banco

1. Criar um identificador interno de pedido:

```text
pedido_grupo_id uuid
```

Backfill:
- registros existentes serão agrupados por `data + numero_pedido + codigo_cliente + vendedor_id`;
- pedidos sem número receberão grupo próprio;
- não vou apagar dados nesse processo.

2. Criar funções transacionais para operações críticas:

```text
editar_pedido_completo
excluir_pedido_completo
fechar_carga
adicionar_itens_a_carga
desfazer_carga
corrigir_peso_original_admin
```

Cada função deve:
- validar permissões;
- validar se todos os IDs pertencem ao mesmo escopo;
- executar tudo em uma transação;
- registrar auditoria;
- falhar por completo se algo estiver inconsistente.

3. Tornar `peso_original` protegido:
- updates normais não podem reduzir/sobrescrever `peso_original`;
- `peso_original` só muda via função administrativa auditada;
- impedir novamente casos como Santa Inês/Santa Lúcia, onde o peso original corrompido derruba o peso atual.

4. Criar índices/guards para robustez:
- índice em `pedido_grupo_id`;
- índice para `carga_id` + `data` quando aplicável;
- validações para lote misturado;
- monitoramento de linhas suspeitas, como peso atual maior/menor incoerente, duplicatas exatas, carga com múltiplos clientes inesperados etc.

---

### Fase 3 — Portaria e importações mais seguras

1. Conferência de veículo:
- trocar atualização por placa/data para atualização por `id`;
- se houver duplicidade de placa, pedir escolha explícita.

2. Importação de veículos esperados:
- não apagar tudo da data;
- preservar walk-ins, conferidos e vinculados;
- usar upsert seguro por chave controlada;
- mostrar resumo antes de confirmar: novos, atualizados, preservados e ignorados.

3. Limpeza de lista:
- bloquear limpeza de registros já conferidos/vinculados por padrão;
- exigir confirmação com quantidade exata afetada.

---

### Fase 4 — Auditoria visual e ferramenta de diagnóstico

Adicionar uma página/aba de saúde do sistema para administradores, com:

- pedidos agrupados incorretamente;
- produtos duplicados suspeitos;
- cargas com mesmo nome em datas diferentes;
- pesos com diferença suspeita entre `peso` e `peso_original`;
- registros com `peso_original` menor que o peso criado no audit log;
- operações em massa recentes;
- exclusões recentes;
- botão para abrir histórico do item/pedido/carga.

Isso deixa o sistema mais “inteligente”: ele passa a apontar inconsistências antes de virarem bagunça operacional.

---

## Ordem recomendada de implementação

1. Corrigir agrupamento e cascata no frontend.
2. Corrigir exclusão/edição/clone com validações fortes.
3. Criar `pedido_grupo_id` e backfill seguro.
4. Migrar operações críticas para funções transacionais.
5. Blindar `peso_original`.
6. Corrigir operações amplas da Portaria.
7. Restringir funções privilegiadas e revisar avisos de segurança.
8. Criar painel de auditoria/saúde.

## Garantias durante a correção

- Não apagar dados sem confirmação.
- Criar snapshot antes de qualquer migração de dados sensível.
- Não mexer manualmente nos arquivos gerados da integração do backend.
- Manter logs/auditoria para cada correção estrutural.
- Priorizar primeiro os bugs que podem causar perda/corrupção de dados.

Se aprovado, começo pela Fase 1 e Fase 2 inicial, porque são as que atacam diretamente os sintomas que você descreveu: apagar item errado, editar e afetar outro, clone duplicar, e peso original/peso atual ficarem corrompidos.