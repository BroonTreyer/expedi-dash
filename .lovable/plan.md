

## Restaurar a lista de veículos esperados apagada

Posso restaurar a lista usando um dos snapshots de servidor ("Server-saves") que o sistema cria automaticamente. A tabela `data_snapshots` guarda backups completos da `veiculos_esperados` (entre outras), então dá pra reinserir exatamente os registros que estavam ali antes da exclusão.

### Como vou fazer

1. **Identificar o snapshot certo** — listar os snapshots mais recentes em `data_snapshots`, mostrar a você data/descrição/quantidade de veículos esperados em cada um, e você escolhe qual usar (provavelmente o último de antes da exclusão).
2. **Restaurar só a lista de veículos esperados** — em vez de usar o botão "Restaurar" do painel de Backups (que apaga e reescreve **todas** as tabelas — pedidos, clientes, motoristas, portaria etc., e isso seria destrutivo), vou fazer uma restauração **cirúrgica**: leio `snapshot_data->'veiculos_esperados'` do snapshot escolhido e reinsiro apenas esses registros na tabela `veiculos_esperados`, preservando tudo o que mudou nas outras tabelas desde então.
3. **Evitar duplicatas** — antes de reinserir, comparo por `id` com o que ainda existe na tabela e só insiro os que foram apagados (se nenhum foi apagado em massa, restauro todos os ausentes).
4. **Registrar no audit log** — gravo a operação como `restore_partial` em `audit_log` pra rastreabilidade.

### Etapas concretas

- 🔎 Consultar `data_snapshots` (id, created_at, description, `record_counts->>'veiculos_esperados'`) ordenado por mais recente — apresentar a lista pra você escolher.
- 📦 Após sua escolha, ler `snapshot_data->'veiculos_esperados'` do snapshot.
- ➕ Inserir via `INSERT ... ON CONFLICT (id) DO NOTHING` em `veiculos_esperados` — assim os registros que ainda existem ficam intactos e os apagados voltam idênticos (mesma id, placa, carga_id, peso, motorista, etc.).
- 📝 Inserir 1 linha em `audit_log` descrevendo a restauração parcial (snapshot usado + qtd de registros restaurados).
- ✅ Confirmar pra você o número de veículos esperados que voltaram.

### O que NÃO muda

- Nenhuma migration, nenhuma alteração de schema.
- Outras tabelas (pedidos, portaria, clientes, etc.) ficam intactas — só a `veiculos_esperados` é tocada.
- Sem alteração de código no app — é uma operação pontual de dados.

### Observação

Se por acaso **não houver snapshot** com a lista que você lembra (snapshots são criados manualmente em "Backups" pelo admin), me avise — nesse caso a opção alternativa é recriar via importação de planilha em **Portaria → Veículos Esperados → Importar Planilha**, se você tiver o arquivo original.

