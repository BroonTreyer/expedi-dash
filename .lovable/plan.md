# Excluir os nove registros do print

## Escopo confirmado
Excluir definitivamente somente os movimentos mostrados no print, sem movê-los para o Histórico:

| Motorista | Placa | Rota no print |
|---|---|---|
| FREDERICO | ONS5733 | Dia dia df |
| ANDERSON SOUSA | PAN9961 | GOIAS |
| CAIO | EWJ9D30 | Anapolis |
| JONHATAS | NKK9877 | APARECIDA 2 |
| REYLLER | JHU6H31 | Alexânia |
| Sebastião | NWN7975 | Quero |
| JULIO | NWN3375 | Quero |
| Antônio Gomes | NKG0H70 | Brasília |
| LUZIMAR RODRIGUES DE SOUZA | ONN3J75 | COSTA BL |

## Execução
1. Identificar os nove movimentos por placa, motorista, rota, horário e etapa do print. Há várias viagens das mesmas placas no banco; não apagar por placa nem selecionar automaticamente a viagem mais recente. Se algum registro não puder ser identificado com segurança, preservá-lo e informar a pendência.
2. Conferir os movimentos vinculados a cada registro selecionado. Excluir somente os vínculos indispensáveis à remoção e os movimentos identificados, em uma única transação.
3. Preservar cadastros de motoristas, veículos, pedidos, cargas e outras viagens, inclusive das mesmas placas.
4. Verificar no banco e na Portaria que os registros selecionados foram removidos e que outras viagens permaneceram intactas.

## Detalhes técnicos
- Usar IDs explícitos e validar os dados novamente antes da exclusão; interromper a operação se houver divergência.
- Conferir dependências de `movimento_vinculado_id` para evitar referências quebradas.
- Não alterar telas, permissões ou regras de operação para esta limpeza pontual.

**Atenção:** a exclusão é definitiva; a aprovação autoriza apagar os movimentos identificados do print e seus vínculos necessários, não o histórico inteiro desses veículos.