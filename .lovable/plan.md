

# Corrigir peso padrão dos Pães de Alho

## Problema
Os 5 produtos de Pão de Alho (códigos 810-814) estão com `peso_padrao = 4` (peso da caixa 10×400g). Quando o faturamento digita "60 unidades", o sistema calcula 60 × 4 = 240 kg, mas o correto é 60 × 0,4 = 24 kg (peso unitário do pacote).

## Solução
Atualizar o `peso_padrao` de 4 para 0.4 nos 5 produtos de Pão de Alho no banco de dados.

```sql
UPDATE produtos SET peso_padrao = 0.4 WHERE codigo_produto IN ('810','811','812','813','814');
```

Nenhuma mudança de código é necessária — o cálculo automático `peso_padrao × quantidade` já funciona corretamente, só o valor cadastrado que estava errado.

| Produto | Antes | Depois |
|---|---|---|
| PAO DE ALHO TRADICIONAL 10x400g | 4 kg | 0,4 kg |
| PAO DE ALHO PICANTE 10x400g | 4 kg | 0,4 kg |
| PAO DE ALHO COM CALABRESA 10x400g | 4 kg | 0,4 kg |
| PAO DE ALHO MISTO 10x400g | 4 kg | 0,4 kg |
| PAO DE ALHO TRAD E PICANTE 10x400g | 4 kg | 0,4 kg |

