## Problema

Os CT-es da **LOS Transportes LTDA** estão sendo importados com `peso_total = 0` em quase todos os casos. O `raw_extracao->peso_total` também é `0`, ou seja, o modelo Gemini **não está conseguindo localizar/interpretar o peso** no DACTE para esta transportadora.

Possíveis causas no DACTE:
- Quadro "QUANTIDADE / TIPO DE MEDIDA / TIPO" com peso em formato brasileiro (`5.490,000`) ou em toneladas.
- Linha "PESO BRUTO" pode estar separada por outras unidades (M3, KG, UNID).
- Uso de um prompt vago: hoje só pedimos `peso_total: peso bruto total da carga em kg`.

## Correção

### 1. `supabase/functions/parse-dacte-pdf/index.ts` — prompt mais robusto para peso
Substituir a regra atual de `peso_total` por instruções explícitas:

```
- "peso_total": peso BRUTO total em QUILOGRAMAS (kg).
  • Procure no quadro "QUANTIDADE / TIPO DE MEDIDA / TIPO" ou "INFORMAÇÕES DA CARGA / QTD. CARGA".
  • Se houver várias linhas, some apenas as linhas cuja unidade seja KG / PESO BRUTO / PESO B. CALCULADO.
  • Ignore linhas em UNID, M3, VOL, CUBAGEM.
  • Se o número estiver no formato brasileiro (ex.: "5.490,500" ou "1.234,56"), interprete o "." como separador de milhar e a "," como decimal — converta para número com ponto decimal (5490.5, 1234.56).
  • Se a unidade indicar TON ou TONELADAS, multiplique por 1000 para converter em kg.
  • Se mesmo após inspeção não encontrar peso bruto em kg, devolva 0.
```

Também acrescentar ao bloco de regras gerais um exemplo curto: `Ex.: "PESO BRUTO 5.490,000 KG" → peso_total = 5490` para ancorar a interpretação.

### 2. Reprocessar os CT-es já importados com peso 0
Adicionar um botão **"Reprocessar peso"** em CT-es zerados? Não — escopo do pedido é só o parser. Ficará disponível ao re-importar o PDF.

Nada mais muda — sem alteração de schema, sem mudanças no frontend.
