## Problema

O texto copiado no diálogo de Quitação está em formato de tabela e não lista os CT-es de cada grupo — a financeira precisa dos números dos CT-es para dar baixa.

## Solução

Em `src/components/logistica/RegistrarQuitacaoDialog.tsx`, trocar o `texto` por um formato igual ao antigo, usando os grupos já consolidados por OC (`consolidarPorOC`) e o campo `cteNumbers` já carregado em `useAdiantamentos`.

Formato novo gerado pelo "Copiar texto":

```
QUITAÇÃO DO FRETE CIF, FORA DO ESTADO.

1. OC 130755 (30.040,00 KG)  CTE 667/668/669/670   VLR R$ 9.235,20
2. OC 130902 (12.500,00 KG)  CTE 712/713           VLR R$ 3.120,00
...

Valor Total a Quitar R$ 9.235,20
Código 32982 – MOREIRA TRANSPORTES E LOG LTDA
Pix: moreiratransportes21@gmail.com
```

Regras:
- Uma linha numerada por grupo de `consolidarPorOC(adiantamentos)`.
- Rótulo: `OC {ordem_carga}` quando agrupado por ordem; senão usar `Lote {rep.numero}`.
- Peso: soma de `peso_total` do grupo, formatado pt-BR com sufixo "KG".
- CT-es: concatenar todos os `cteNumbers` dos itens do grupo separados por `/`. Quando vazio, omitir o trecho `CTE …`.
- Valor da linha: soma de `valor_saldo` do grupo (`fmtBRL`).
- Rodapé: `Valor Total a Quitar`, `Código X – Nome`, `Pix: …` (mantém dados de `useTransportadorasFinanceiro`).

A tabela visual e o restante do diálogo (data, observações, botão Confirmar Quitação) continuam exatamente como estão — só o texto copiado muda.

Sem alterações em hooks, banco ou em outros componentes.
