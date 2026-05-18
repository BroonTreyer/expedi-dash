## Resumo do Fechamento — exibir Total + Embarcado + Ruptura

Hoje o cabeçalho do dialog "Fechar Carga" mostra apenas `9.427,76 kg embarcados` e, abaixo, `↳ 50 kg em ruptura (1 item)`. Vou acrescentar o **peso total** (embarcado + ruptura) antes do embarcado.

### Mudança

Arquivo: `src/components/dashboard/FechamentoLoteDialog.tsx` (linha ~594, bloco "Summary").

Resultado esperado:

```
[📦] 39 pedidos · 9.477,76 kg total · 9.427,76 kg embarcados
                                   ↳ 50 kg em ruptura (1 item — não embarcado)
```

- `totalGeral = totalPeso + totalRuptura` (calculado inline a partir das variáveis já existentes).
- Quando `totalRuptura === 0`, oculto o "total" para não poluir (fica só o "embarcados", igual hoje).
- Formatação pt-BR mantida (`toLocaleString("pt-BR")`).
- Sem mudanças em lógica de negócio, persistência ou cálculos — apenas apresentação.

Escopo restrito a esse bloco; nenhum outro componente é afetado.