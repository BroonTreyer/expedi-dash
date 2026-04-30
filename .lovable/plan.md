## Diagnóstico

O motorista **JOSE RIDEKS / UIW2H75** tem **3 movimentos** na portaria, e o problema é uma **chegada órfã** que ficou esquecida:

| # | id | tipo | carga_id | etapa | chegada | entrada | saída |
|---|----|------|----------|-------|---------|---------|-------|
| 1 | `09c88a02…` | entrada | **NULL** | `chegada` | 16:51 | **NULL** | NULL |
| 2 | `b6793b44…` | entrada | HEBERT | `finalizado` | 17:18 | 17:20 | 17:30 |
| 3 | `e291d0cc…` | saída (vinculada ao #2) | HEBERT | — | — | — | 17:30 |

O ciclo da carga HEBERT (#2 → #3) está **completo e correto**. O que aparece na Expedição como "Chegou — aguardando liberação" é o registro **#1**: uma chegada feita às 16:51 sem carga vinculada, que ficou pendurada quando o porteiro registrou o motorista novamente (dessa vez direito, vinculado à HEBERT).

O painel `PainelChegou` filtra qualquer entrada terceirizada com `horario_entrada IS NULL` e `etapa=chegada` — não tem como ele saber que essa chegada é "duplicada" de outra que já foi finalizada.

## Plano de correção

### 1. Limpar o registro órfão atual (one-shot)

Apagar o movimento `09c88a02-dc55-4669-bd19-f8465e60b6e6` (chegada sem carga, sem entrada, do JOSE RIDEKS às 16:51). Já existe a chegada vinculada correta às 17:18.

### 2. Prevenir o problema na origem (RegistroEntradaDialog)

Quando o porteiro registra uma chegada **sem vincular carga**, e segundos depois registra **outra chegada para a mesma placa** vinculando uma carga, hoje ficam as duas. Vou ajustar o fluxo:

- Antes de inserir uma nova chegada, checar se já existe outra chegada **da mesma placa** nas últimas 4 horas com `horario_entrada IS NULL` e (`carga_id IS NULL` ou `carga_id = nova carga`).
- Se existir, em vez de criar um novo movimento, **atualizar o existente** com os dados novos (incluindo `carga_id`, motorista, transportadora etc.).
- Mostrar um toast: "Chegada anterior atualizada — não foi criado registro duplicado."

### 3. Botão "Limpar chegada" no painel da Expedição

No `PainelChegou`, adicionar um botão "↻ Descartar chegada" (visível para admin/logística/portaria) que:
- Pede confirmação
- Deleta o movimento se ainda estiver com `horario_entrada IS NULL` (mesma regra do "Desfazer chegada" que já existe na portaria)

Assim, qualquer chegada órfã futura pode ser limpa pela própria expedição sem precisar abrir chamado.

### 4. Filtro defensivo no painel "Chegou"

Esconder do painel chegadas mais antigas que **6 horas** sem entrada — é praticamente certo que são lixo (ninguém espera 6h no portão). Mostrar apenas em modo admin com badge "antiga".

## Detalhes técnicos

Arquivos a editar:
- `src/components/portaria/RegistroEntradaDialog.tsx` — dedup ao criar chegada
- `src/components/expedicao/PainelChegou.tsx` — botão descartar + filtro 6h
- Migração SQL — DELETE do registro `09c88a02-dc55-4669-bd19-f8465e60b6e6`

Sem mudanças de schema. Sem alterações em triggers. Operação reversível (a deleção só atinge esse 1 registro identificado).
