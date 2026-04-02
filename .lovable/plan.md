

# Simplificar peso — sempre manual, sem recálculo

## Problema
O sistema tem lógica complexa (`inferPesoManual`, `shouldKeepManualPeso`, recálculo no submit) que tenta adivinhar se o peso é manual ou automático. Isso causa corrupção de dados. O peso digitado pelo usuário é **sempre** o valor correto e final.

## Mudanças

### 1. `src/components/dashboard/CarregamentoDialog.tsx`
- **Remover** a função `inferPesoManual` e `shouldKeepManualPeso` completamente
- **Inicialização**: sempre setar `pesoManual: true` ao carregar um pedido existente
- **`handleItemCodigo`**: ao encontrar produto, preencher `pesoPadrao` mas **nunca** sobrescrever o peso se já houver valor > 0. Só preencher peso automaticamente em item **novo** (peso = 0)
- **`handleItemQuantidade`**: nunca recalcular o peso ao mudar quantidade
- **`handleSubmit`**: remover toda a re-inferência. Usar `item.peso` direto e sempre salvar `peso_manual: true`
- **`emptyItem()`**: manter `pesoManual: true` por padrão

### 2. Migration de dados (insert tool)
Marcar todos os registros existentes como `peso_manual = true`:
```sql
UPDATE carregamentos_dia SET peso_manual = true WHERE peso_manual = false;
```

## Resultado
- Peso digitado nunca mais é sobrescrito
- Código mais simples sem funções de inferência
- Todos os registros existentes protegidos

