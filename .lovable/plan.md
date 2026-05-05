## Problema
A tabela `tabela_frete` está vazia no banco — a migração de seed criada anteriormente não foi efetivamente aplicada, por isso a aba "Tabela de Frete" mostra "Nenhum destino cadastrado".

## Solução
Criar uma nova migração que insere os 19 destinos (38 linhas: bitruck + carreta) na tabela `tabela_frete`, usando `ON CONFLICT (destino_cidade, destino_uf, tipo_veiculo) DO UPDATE SET valor_kg = EXCLUDED.valor_kg` para ser idempotente.

### Dados a inserir
Os mesmos 19 destinos da imagem original:
Açailândia/Dom Eliseu/Sta Inês (MA), Maceió (AL), Corrente (PI), Campina Grande (PB), Cuiabá - Sepex (MT), Fortaleza (CE), Luís Eduardo/Barreiras (BA), Serra (ES), Natal (RN), Belém (PA), Pará/Rede Macre (PA), Jequié/Juazeiro (BA), Picos/Teresina/Parnaíba (PI), São Luís (MA), Salvador - 1 entrega (BA), São Paulo (SP), Macapá (AP), Assaí Dickson (PI), Mateus (BA) — cada um com valor para Bitruck e Carreta.

## Validação
Após aplicar, confirmar via consulta que `SELECT COUNT(*) FROM tabela_frete` retorna 38, e a aba "Tabela de Frete" lista todos os destinos com valores editáveis.