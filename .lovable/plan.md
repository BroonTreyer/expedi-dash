## Texto diferente no comprovante de "Aguardando Quitação"

Hoje o `ComprovanteAdiantamentoDialog` é usado em três contextos (Pendentes, Aguardando Quitação, Quitados) e sempre monta o mesmo texto começando com `ADIANTAMENTO DE FRETE CIF, FORA DO ESTADO.` mostrando o **valor do adiantamento**. Quando o adiantamento já foi pago (aba *Aguardando Quitação*) o que falta é o **saldo**, então o texto faz sentido virar uma cobrança de quitação — espelhando o que o `RegistrarQuitacaoDialog` já gera.

### Mudança em `src/components/logistica/ComprovanteAdiantamentoDialog.tsx`

Detectar o modo pelo status dos adiantamentos passados:
- **modo `quitacao`**: todos os itens têm `status === "pago"` (ou `"quitado"`)
- **modo `adiantamento`**: caso contrário (mantém o texto atual)

No modo `quitacao`, o `useMemo` do `texto` passa a montar:

```
QUITAÇÃO DO FRETE CIF, FORA DO ESTADO.

1.{transportadora} ({peso} Kg) CTE
{numeros_cte}
*VLR {valor_total_ctes}*
Adt pago: *{valor_adiantamento}* ({percentual}%)
Saldo: *{valor_saldo}*

(... próximos itens ...)

*Valor Total do Frete {totalCtes}*
*Total Adt pago {totalAdt}*
*Saldo a Quitar {totalSaldo}*

Código {codigo} – {nome}
Pix: {pix}
```

`valor_saldo` já existe em `Adiantamento` (usado no `RegistrarQuitacaoDialog`).

### Ajustes auxiliares no mesmo arquivo

- Título do dialog quando em modo quitação: `Quitação — {numero}` / `Quitação — N adiantamentos` em vez de `Comprovante — …`.
- O bloco "Data do pagamento" só aparece quando há pendentes — já é o comportamento atual, então segue.
- O bloco "Pago em: …" (mostrado quando não há pendentes) permanece, agora abaixo do texto de quitação — serve como referência de quando o adiantamento foi pago.

### Sem mudanças

- `RegistrarQuitacaoDialog` segue intacto (é o fluxo de confirmar a quitação, com data + observações).
- Aba *Quitados*: como todos os itens estão com status `quitado`, o novo modo também se aplica e o texto sai como "QUITAÇÃO ...". Se preferir manter "ADIANTAMENTO" nos já quitados, ajustar a condição para `status === "pago"` apenas — me avisa qual prefere.
- `useAdiantamentos.ts` e demais arquivos não mudam.