

# Reorganizar fotos antes dos campos de Placa e KM

## Problema atual
As fotos ficam no bloco "Evidências" (último bloco), enquanto os campos de Placa e KM ficam nos blocos "Veículo" e "Operação" (anteriores). O fluxo ideal é: **tirar foto → ver leitura OCR → confirmar/corrigir o valor**.

## Solução

### `portaria-fields-config.ts`
Mover as fotos para os blocos dos seus campos associados, posicionadas **antes** deles:

- `foto_placa_url` → mover do bloco `"evidencias"` para `"veiculo"`, antes do campo `placa`
- `foto_painel_url` → mover do bloco `"evidencias"` para `"operacao"`, antes do campo `km_inicial`

Os demais campos de foto (`foto_documento_url`, `foto_nota_url`) permanecem no bloco "Evidências".

### `RegistroMovimentoDialog.tsx`
Nenhuma mudança necessária na lógica — o OCR já renderiza abaixo de cada foto. Ao mover as fotos para os blocos corretos, o resultado OCR + campo de confirmação ficam naturalmente agrupados.

## Resultado visual (Carga Própria)

```text
🚗 Veículo
  📷 Foto da Placa
  [OCR: Leitura da Placa → ABC1D23 | 95%]
  [Input: Placa ________]
  [Input: Motorista _____]

📊 Operação
  📷 Foto do Painel (KM)
  [OCR: Leitura do KM → 45230 | 88%]
  [Input: Rota ___________]
  [Input: N° Lacre _______]
  ...
```

## Arquivo modificado

| Arquivo | Mudança |
|---------|---------|
| `src/lib/portaria-fields-config.ts` | Alterar `block` de `foto_placa_url` para `"veiculo"` e `foto_painel_url` para `"operacao"`, reordenar posição no array |

