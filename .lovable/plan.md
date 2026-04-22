

## Remover obrigatoriedade da Foto da Placa na Saída Final (Lacre)

### Mudança

Na etapa **Saída Final / Lacre**, a foto da placa não é mais necessária — o veículo já foi identificado nas etapas anteriores (Chegada e Saída p/ Rota), e o foco do Lacre é apenas registrar o número e foto do lacre.

### Ajuste pontual

Em `src/lib/portaria-fields-config.ts`, dentro da matriz `VISIBILITY_SAIDA` (usada para `tipo_movimento = "lacre"` e `"saida"`), alterar o campo `foto_placa_url` de `obrigatorio` → `oculto` para todas as categorias:

```ts
// Antes
foto_placa_url: { carga_propria: "obrigatorio", terceirizado: "obrigatorio", fornecedor: "obrigatorio", ... }

// Depois
foto_placa_url: { carga_propria: "oculto", terceirizado: "oculto", fornecedor: "oculto", visitante: "oculto", prestador: "oculto", outros: "oculto" }
```

### O que NÃO muda

- Foto da placa continua **obrigatória** na Chegada (entrada) e na Saída p/ Rota (Carga Própria).
- Foto do Lacre (`foto_lacre_url`) e Nº do Lacre permanecem obrigatórios.
- Detalhes do movimento continuam exibindo a foto da placa capturada nas etapas anteriores.
- Nenhuma migration ou alteração no banco.

### Arquivo alterado

- `src/lib/portaria-fields-config.ts` (1 linha em `VISIBILITY_SAIDA`)

