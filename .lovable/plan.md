## Diagnóstico

Existem dois registros do mesmo motorista/placa (DANILO / TMQ7C81), mas **não são duplicatas reais** — são duas faces do mesmo caminhão que ficaram desconectadas:

1. **Card vermelho (em cima)** — "Vincular a carga"
   - Vem do movimento de portaria `740cde50…` com `carga_id = NULL`, `etapa_terceirizado = 'chegada'`
   - Aparece em vermelho porque chegou na portaria sem carga vinculada

2. **Card azul (Cargas fechadas aguardando veículo)** — EDIVAR
   - Vem da carga `EDIVAR` (4 itens) com placa prevista TMQ7C81 e transportadora LOS TRANSPORTES
   - O painel cruza por placa e enxerga a chegada acima → mostra "Aguardando liberação · 06:05 (309min)"

Ou seja, o porteiro registrou a chegada **sem usar o botão da carga EDIVAR**, então o sistema ficou com a chegada solta + a carga esperando.

Existe também um `veiculos_esperados` antigo (`51e691d5…`) com `status_autorizacao = 'recusado'` para a mesma placa — lixo de tentativa anterior, sem efeito visual, mas convém limpar.

## Plano

Vincular o movimento órfão à carga EDIVAR, exatamente como o botão "Vincular a carga" faria, para que **só o card azul EDIVAR permaneça** (com "Liberar entrada no pátio" verde funcionando normalmente).

### Ações no banco (somente dados, sem mudanças de código)

1. **Vincular o movimento de portaria à carga EDIVAR**
   - `UPDATE movimentacoes_portaria SET carga_id = 'EDIVAR' WHERE id = '740cde50-fe53-4c2a-8b78-36f43a4b10e4'`

2. **Atualizar `veiculos_esperados` para refletir o vínculo**
   - Apagar o registro antigo `recusado` (`51e691d5…`) que ficou órfão
   - Garantir que exista um `veiculos_esperados` para a carga EDIVAR com a placa TMQ7C81, status `aguardando_vinculo`, `conferido = false`, `carga_id = 'EDIVAR'` (criar se não existir; o painel azul EDIVAR continua funcionando porque lê direto de `carregamentos_dia` + movimento)

### Resultado esperado na tela

- Some o card vermelho "TMQ7C81 — Vincular a carga"
- Permanece apenas o card azul **EDIVAR** com:
  - badge "Aguardando liberação · 06:05 (xxxmin)"
  - botões "Desfazer chegada" e "Liberar entrada no pátio"

### Sem mudança de código

Nenhum arquivo TS precisa ser editado — o bug não está no código, está no estado do banco. O fluxo correto (porteiro clicar em "Registrar chegada" dentro do card EDIVAR) já existe e funciona; só precisamos consertar o estado atual.

### Como evitar repetição (opcional, fora deste plano)

Se quiser, num próximo passo posso adicionar uma trava: quando o porteiro registra chegada de uma placa que já está como "placa prevista" em uma carga fechada do dia, sugerir/forçar o vínculo automaticamente em vez de criar movimento órfão. Diga se quer que eu faça isso depois.