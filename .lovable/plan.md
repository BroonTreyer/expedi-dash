## Reverter entrada de Carlos André (SJM9D95)

A portaria liberou a entrada por engano. Voltar para o estado "Aguardando liberação" (chegada registrada, mas ainda fora do pátio).

**Registro:** `98314a9b-7920-4b9e-a6c5-00acf30ca286` — SJM9D95, CARLOS ANDRE BEZERRA DA SILVA, MOREIRA TRANSPORTES, carga `CG-20260526-142907-S20`.

### Ação

`UPDATE` em `movimentacoes_portaria`:
- `etapa_terceirizado = 'chegada'`
- `horario_entrada = NULL`
- Mantém `horario_chegada` (15:29).

Sem alterações de código.