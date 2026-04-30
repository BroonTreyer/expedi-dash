## Problema

Cargas com placa/motorista/transportadora já preenchidos aparecem **simultaneamente** em dois cards na tela de Expedição:

1. **"A Chegar"** — lista todos os `veiculos_esperados` ainda não conferidos.
2. **"Cargas fechadas - aguardando veículo"** — lista cargas fechadas cujo veículo previsto ainda não foi marcado como conferido.

Como existe um trigger automático que cria o `veiculo_esperado` no momento que a Logística fecha a carga (placa/motorista/transportadora preenchidos), a mesma carga acaba listada em ambos os painéis até a Portaria registrar a chegada.

A intenção do produto (regra antiga) é: **se já tem veículo previsto cadastrado, a carga sai de "Aguardando veículo" e passa a viver apenas em "A Chegar"**.

## Causa-raiz (técnico)

Em `src/hooks/useCarregamentos.ts` (linhas 501-505), o filtro `cargasComPrevistoConferido` só remove a carga quando `walk_in === false E conferido === true`. Deveria remover já quando existe um previsto **não walk-in** (com placa preenchida) — porque o caso já está representado em "A Chegar".

Walk-ins (motorista que chegou sem aviso) devem **continuar** aparecendo no card azul como "Motorista já no pátio" — isso é correto e deve ser mantido.

## Mudança proposta

### Arquivo: `src/hooks/useCarregamentos.ts`

Trocar o conjunto `cargasComPrevistoConferido` por `cargasComVeiculoPrevisto`, que captura cargas que **já têm um veículo esperado não walk-in** (independente de já estarem conferidas), porque essas já são geridas pelo card "A Chegar":

```ts
// Antes:
const cargasComPrevistoConferido = new Set(
  ((previstos ?? []) as ...[])
    .filter((v) => v.carga_id && !v.walk_in && v.conferido)
    .map((v) => v.carga_id as string)
);

// Depois:
const cargasComVeiculoPrevisto = new Set(
  ((previstos ?? []) as ...[])
    .filter((v) => v.carga_id && !v.walk_in)
    .map((v) => v.carga_id as string)
);
```

E a checagem dentro do loop de agrupamento passa a ser:

```ts
if (cargasComVeiculoPrevisto.has(c.carga_id)) continue;
```

### Comportamento resultante

| Situação                                                   | A Chegar | Cargas fechadas - aguardando veículo |
|------------------------------------------------------------|:--------:|:------------------------------------:|
| Carga fechada **sem** placa preenchida                     |    —     |          ✅ aparece                   |
| Carga fechada **com** placa (gera previsto automaticamente)|✅ aparece|          ❌ não aparece               |
| Walk-in (motorista chegou sem aviso, vinculado à carga)    |    —     | ✅ aparece como "Motorista no pátio"  |
| Após registrar chegada do veículo                          |    —     |          —                            |
| Após liberar entrada no pátio                              |    —     |  — (vai pra "No pátio")              |

### Arquivos editados

- `src/hooks/useCarregamentos.ts` — ajustar lógica de remoção em `useCargasFechadasAguardando`.

Sem alterações de banco de dados, sem mudanças de RLS, sem mudanças de UI — apenas correção da regra de filtro. O tratamento defensivo já implementado em `Expedicao.tsx` (`cargasTerc` com chave composta `carga_id|placa`) permanece como segunda linha de defesa.
