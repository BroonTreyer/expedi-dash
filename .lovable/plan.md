## Bloquear motoristas duplicados

### 1. Schema (migration)
- Criar índice único parcial em `motoristas(cpf)` onde `cpf IS NOT NULL AND ativo = true`.
- Criar índice único em `lower(btrim(nome_completo))` onde `ativo = true`.

### 2. Limpeza dos duplicados existentes (antes dos índices)
- **Alair Algusto do Vale** (CPF 841.878.081-91): manter o registro mais antigo, marcar o outro como `ativo=false`. Se houver `caminhoes.motorista_id` apontando para o duplicado, repontar para o mantido.
- **NILSON RAIMUNDO DIAS** (CPF 586.239.571-72): mesma lógica.
- Migration faz UPDATE de repointagem em `caminhoes` + UPDATE `ativo=false` no duplicado, depois cria os índices únicos.

### 3. Validação no frontend (`src/pages/Motoristas.tsx` — `MotoristaFormDialog`)
- Ao digitar CPF completo (11 dígitos) ou ao salvar, consultar `motoristas` ativos:
  - Por `cpf` exato (se preenchido).
  - Por `lower(btrim(nome_completo))` exato.
- Se já existir e não for o registro em edição: mostrar alerta inline ("Já existe motorista X com este CPF/nome") + botão "Editar existente" que carrega o registro encontrado no formulário.
- No `onError` das mutations, tratar código `23505` (unique violation) com toast: "Já existe motorista com este CPF" / "...com este nome".

### Arquivos
- Nova migration SQL (cleanup + 2 índices únicos).
- `src/pages/Motoristas.tsx` — adicionar checagem de duplicidade no dialog e tratamento de erro 23505.
- `src/hooks/useMotoristas.ts` — melhorar mensagens de erro nas mutations create/update.
