# Padronizar o texto dos comprovantes (quitação e adiantamento)

## O que está acontecendo hoje

Existem **duas rotinas diferentes** gerando o texto de quitação:

1. **"Registrar Quitação"** (botão verde) — já sai no formato do modelo (print 3): `OC 132371 (30.000,00 KG) CTE 1424/1425/1423 VLR R$ 6.300,00`, total a quitar, código e Pix. Confirmei no banco que os números do print 3 batem com esta rotina (peso = soma dos adiantamentos da OC; VLR = saldo).
2. **"Ver comprovantes"** (print 2) — usa outra lógica e sai fora do padrão:
   - Mostra o **nome da carga** (`SE - SOLISMAR`, `CG-20260814-174307-0LI`) em vez de `OC 133145`.
   - Repete o nome da transportadora dentro do texto.
   - Insere linhas extras por adiantamento (`Adt pago: ... — Saldo: ...`) e três totais (`Valor Total do Frete`, `Total Adt pago`, `Saldo a Quitar`) em vez de um único `Valor Total a Quitar`.
   - Peso vem do romaneio (`28.008 KG`) e sem duas casas decimais.
   - Ignora a seleção: com 20 selecionados, o comprovante sai com os **96** adiantamentos da transportadora.
   - Uma mesma OC pode aparecer em mais de uma linha (agrupa por carga, não por OC).

O texto de **adiantamento** (pendentes) sofre dos mesmos problemas, pois usa a mesma rotina.

## O que será feito

### 1. Um único gerador de texto, no formato do modelo
Criar uma função compartilhada usada por todos os diálogos. Saída:

```text
QUITAÇÃO DO FRETE CIF, FORA DO ESTADO.

1. OC 132371 (30.000,00 KG) CTE 1424/1425/1423 VLR R$ 6.300,00
2. OC 132357 (29.512,80 KG) CTE 1398/1397 VLR R$ 6.222,74

Valor Total a Quitar R$ 17.279,57
Código 32982 – MOREIRA TRANSPORTES E LOG LTDA
Pix: moreiratransportes21@gmail.com
```

Para adiantamento, mesma estrutura, mudando só cabeçalho e rodapé:

```text
ADIANTAMENTO DO FRETE CIF, FORA DO ESTADO.

1. OC 133197 (28.000,00 KG) CTE 1541/1542/... VLR R$ 21.500,00

Valor Total do Frete R$ 21.500,00
80% de Adiantamento
Valor Total do Adiantamento R$ 17.200,00
Código 32982 – MOREIRA TRANSPORTES E LOG LTDA
Pix: moreiratransportes21@gmail.com
```

Regras:
- Uma linha por **OC** (ou `Lote ADT-...` quando não houver OC), ordenada por OC; todos os adiantamentos da mesma OC somados.
- Peso = soma do `peso_total` dos adiantamentos da OC, sempre com 2 casas (`30.000,00 KG`).
- CT-es concatenados com `/`.
- VLR = **saldo** na quitação; **frete total** no adiantamento.
- Sem nome da transportadora no meio do texto e sem linhas por adiantamento. Se houver mais de uma transportadora selecionada, o texto é separado em blocos, um por transportadora, cada um com seu total/código/Pix.
- Percentuais diferentes no mesmo lote: em vez de `80% de Adiantamento`, mostra `Valor Total do Adiantamento` apenas.

### 2. "Ver comprovantes" respeita a seleção
Se houver adiantamentos marcados na transportadora, o comprovante sai só com os marcados (ex.: os 20 do print 1); sem marcação, sai com todos. Título passa a informar `Quitação — 20 adiantamentos · 4 OCs`.

### 3. Mesmo texto em todas as telas
"Registrar Quitação", "Ver comprovantes" (pendentes e pagos) e a impressão passam a usar o gerador único, então o texto copiado para o WhatsApp é sempre idêntico ao modelo.

## Detalhes técnicos
- Novo `src/lib/comprovante-texto.ts` exportando `gerarTextoComprovante({ adiantamentos, modo: "adiantamento" | "quitacao", transportadoras })`, construído sobre `consolidarPorOC` (mover essa função de `AdiantamentosTab.tsx` para `src/lib/adiantamentos-consolidar.ts` para evitar import circular) e `resolveTranspInfo`.
- `ComprovanteAdiantamentoDialog.tsx`: substituir `agregarPorTransportadora`/`useMemo texto` pelo gerador; remover as consultas de `nome_carga` e peso do romaneio (não são mais usadas no texto). Os CT-es continuam vindo de `adiantamentos_frete_ctes` para preencher `cteNumbers` quando o registro não os tiver.
- `RegistrarQuitacaoDialog.tsx`: trocar o `useMemo texto` pelo gerador (mesmo resultado atual, garantindo paridade).
- `AdiantamentosTab.tsx` (~linha 1249 e equivalente na aba Pendentes): `setComprovantesAdt(selDaTransp.length ? selDaTransp : lista)`.
- Sem alterações de banco.
