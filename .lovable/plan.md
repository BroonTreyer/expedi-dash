
# Rollback real dos dados afetados

## O problema real
O que voltou foi só parte da lógica do app. Os números do banco não voltaram por completo.

Pelo que revisei:
- a tela está mostrando os valores que estão gravados hoje no banco, então não é só problema visual
- ainda existem pedidos recentes com `peso = 20` e `peso_manual = false` em produtos que deveriam estar com peso total digitado
- o dialog ainda recalcula peso para itens não marcados como manuais no envio, então dado parcialmente restaurado continua vulnerável

As imagens confirmam isso: os totais de grupo batem com a soma das linhas erradas, então a tabela está refletindo dados ainda corrompidos.

## O que vou fazer
Vou tratar isso como **rollback de dados**, não como simples correção de código.

### 1. Congelar a referência correta para rollback
Definir um **ponto seguro anterior ao incidente** e usar esse ponto como verdade para restauração.

Importante:
- voltar versão pelo History ajuda no código
- mas **não restaura números do banco**
- então o rollback precisa ser feito diretamente nos registros afetados

### 2. Reconstruir o último estado bom de cada pedido afetado
Como você pediu **“tudo afetado”**, não vou restaurar só peso.

Vou reconstruir, para cada pedido impactado, o **último estado confiável antes da alteração ruim**, usando o histórico de auditoria:
- snapshot do `criado`
- sequência dos `alterado`
- parar no instante anterior ao incidente
- o resultado vira o “estado bom” daquele pedido

Isso evita o erro das tentativas anteriores, que usavam só o peso de criação e não respeitavam mudanças legítimas feitas depois.

### 3. Restaurar todos os campos alterados nos pedidos impactados
A restauração vai considerar os campos operacionais afetados, especialmente:
- `peso`
- `peso_manual`
- `quantidade`
- `codigo_produto`
- `nome_produto`
- `status`
- `etapa`
- `cliente`
- `codigo_cliente`
- `cidade`
- `uf`
- `tipo_frete`
- `transportadora`
- `tipo_caminhao`
- `placa`
- `motorista`
- `carga_id`
- `nome_carga`
- `ordem_entrega`
- `observacoes`
- horários relacionados, quando divergirem do último estado bom

### 4. Aplicar o rollback só nos registros realmente atingidos
O alvo não será “todo o banco”.
Será:
- todos os pedidos alterados dentro da janela do incidente
- com prioridade para pedidos abertos / não consolidados / sem carga fechada
- incluindo históricos onde o valor atual diverge do estado reconstruído

Isso reduz risco de desfazer alterações legítimas feitas depois por usuários.

### 5. Blindar a edição para não estragar de novo
Depois do rollback dos dados, vou manter uma proteção no app para que:
- se o peso salvo divergir do cálculo padrão, o item abra como manual
- salvar edição não recalcule peso restaurado
- abrir pedido, salvar e reabrir preserve exatamente o mesmo valor

## Arquivos/partes envolvidos
- `src/components/dashboard/CarregamentoDialog.tsx`
- `src/pages/Index.tsx` (fluxo de submit, se necessário)
- dados de `carregamentos_dia`
- histórico de `audit_log`

## Abordagem técnica
```text
audit_log (criado + alterado até antes do incidente)
        ↓
reconstrução do último estado bom por pedido
        ↓
comparação com estado atual em carregamentos_dia
        ↓
rollback somente dos registros divergentes
        ↓
validação em tabela principal, rupturas e edição
```

## Validação obrigatória
Depois da restauração, a validação precisa confirmar:

1. Tabela principal:
   - pesos individuais corretos
   - total do grupo correto
   - contagem de produtos coerente

2. Rupturas:
   - mesmos pesos da tabela principal
   - sem divergência entre lista e resumo

3. Edição:
   - abrir pedido com peso restaurado
   - salvar sem mexer no peso
   - reabrir e confirmar que nada mudou

4. Casos históricos:
   - pedidos abertos que estavam sem carga fechada
   - registros antigos que hoje ainda aparecem alterados

## Observação importante
Se você quer “voltar exatamente como estava antes”, o caminho correto é em duas partes:

1. **Código/UI**: voltar para uma versão estável pelo History
2. **Dados**: restaurar os registros do banco para o último estado bom anterior ao incidente

Só o passo 1 não resolve os números.

## Resultado esperado
- os pedidos voltam para os valores corretos anteriores ao incidente
- não apenas o peso, mas todos os campos comprovadamente afetados
- tabela principal, rupturas e edição passam a bater entre si
- o sistema para de sobrescrever novamente os valores restaurados
