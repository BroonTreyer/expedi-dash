## O que fazer

Inserir 34 clientes novos na tabela `clientes` a partir da planilha `Assai-REGIONAL-SAO-PAULO-7_2_1.xlsx`, considerando somente as linhas que têm valor na coluna **Codigo**.

## Regras aplicadas

- `codigo_cliente` = valor da coluna **Codigo** (como texto, sem `.0`).
- `nome_cliente` = `"ASSAI ATACADISTA " + Nome Loja` (trim, sem acentos alterados).
- `cidade` = coluna **Cidade** (com `trim`).
- `uf` = `SP` para todas.
- `ativo` = `true`, `tipo` = padrão da tabela.
- Uso de `ON CONFLICT (codigo_cliente) DO NOTHING` para não sobrescrever cadastros já existentes (ex.: se alguém já criou "ASSAI ATACADISTA XXX" com esse código, fica como está).
- Depois do insert, rodar `sync_clients_to_orders()` para propagar nome/cidade/UF para pedidos existentes que usem esses códigos.

## Tratamento dos casos especiais

- **34707 duplicado na planilha**: fica com **loja 354 – São José dos Campos JK** (loja 303 "Sorocaba Santa Rosália" é ignorada nesse import; se quiser subir depois, precisa de outro código).
- **34207**: estava na sua lista original mas **não aparece na planilha**, então não entra neste import.
- Códigos que já existem hoje na base (10 dos "ASSAI ATACADISTA XXX" que confirmei antes) passam pelo `ON CONFLICT DO NOTHING` sem alteração.

## Lista final a inserir (34 registros)

```text
34681 Jundiaí | 34682 Rio Claro | 34683 Campinas Amoreiras
34684 Praia Grande Litoral Plaza | 34685 Bauru | 34686 Ribeirão Preto Rotatória
34687 Presidente Prudente | 33951 Praia Grande Glória | 34688 São José dos Campos
34203 São Vicente | 34689 Taubaté | 34690 Piracicaba Centro
34691 Paulinia | 34204 Hortolândia | 34205 Araçatuba
34692 Indaiatuba | 33948 Jundiaí Ferroviários | 34694 Santa Bárbara D'oeste
34696 Ribeirão Preto Castelo Branco | 34697 Piracicaba Nova América
34698 Limeira II | 34699 Sorocaba Campolim | 34206 São José dos Campos Colinas
34700 Araraquara | 33953 Caraguatatuba Serramar | 34701 Itatiba
34702 Ribeirão Preto Vargas | 33949 Campinas Abolição
33950 Santos Ana Costa | 34703 São José do Rio Preto Clube Palestra
34704 São José do Rio Preto Anísio Haddad | 34705 Guarujá Vicente Carvalho
34706 Sumaré JD Primavera | 34707 São José dos Campos JK
```

## Passo técnico único

Um `INSERT ... ON CONFLICT (codigo_cliente) DO NOTHING` na `public.clientes` + chamada à função `sync_clients_to_orders()`. Nenhuma alteração de schema ou de código-fonte.
