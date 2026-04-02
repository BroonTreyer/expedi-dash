
# Corrigir de vez o peso manual sendo trocado pelo peso padrão da caixa

## O que aconteceu
O problema não é permissão nem bloqueio de edição no banco. O problema é de lógica no app:

1. O sistema só sabe que o peso é “manual” enquanto o dialog está aberto.
2. Quando um pedido já salvo é reaberto, o item volta com `pesoManual: false`.
3. Ao salvar de novo, o app recalcula `peso = peso_padrao × quantidade` e sobrescreve o peso digitado.
4. Isso explica exatamente o comportamento de “eu coloco um peso e depois ele volta para o peso da caixa”.

Os sinais batem com isso:
- o campo local `pesoManual` existe só no componente
- ele não é persistido no banco
- o submit recalcula o peso sempre que `pesoManual` está falso
- o audit atual nem registra mudança de peso, então fica difícil rastrear depois

## O que vou corrigir

### 1. Persistir no banco se o peso é manual
Arquivo: migration SQL

Adicionar coluna em `carregamentos_dia`:
- `peso_manual boolean not null default false`

### 2. Fazer backfill dos pedidos já existentes
Arquivo: migration SQL

Marcar como manual os registros em que o peso salvo diverge do cálculo esperado do produto:
```text
peso esperado = produtos.peso_padrao × quantidade
```

Usarei uma tolerância pequena para não quebrar casos decimais.

Também vou incluir uma recuperação dos casos recentes em que:
- o audit de criação mostra um peso original manual
- o registro atual ficou igual ao peso padrão recalculado

Assim os pedidos que já foram “estragados” por esse bug podem ser restaurados quando houver evidência confiável no histórico.

### 3. Corrigir o dialog para respeitar peso manual em qualquer reabertura
Arquivo: `src/components/dashboard/CarregamentoDialog.tsx`

Ajustes:
- iniciar `pesoManual` com base em `editing.peso_manual`
- se esse campo ainda não existir no dado carregado, inferir pelo desvio entre `peso` salvo e `peso_padrao × quantidade`
- ao digitar no campo de peso, manter `pesoManual = true`
- ao salvar, enviar também `peso_manual`
- nunca recalcular peso de item manual ao reabrir/editar/salvar outro campo

Resultado:
- se o usuário digitou 504 kg, continuará 504 kg
- se o usuário usa cálculo automático, continua automático normalmente

### 4. Garantir que todas as telas passem o flag corretamente
Arquivos:
- `src/pages/Index.tsx`
- `src/pages/Rupturas.tsx`
- `src/hooks/useCarregamentos.ts` (tipagem)

Vou garantir que create/update/batch create enviem e tipem `peso_manual`, para o dado não se perder entre telas e mutações.

### 5. Melhorar rastreabilidade
Arquivo: migration SQL do trigger de auditoria

Adicionar auditoria para:
- `peso`
- `quantidade`
- `peso_manual`
- `codigo_produto` / `nome_produto` se necessário

Assim, se alguém reclamar de novo, ficará visível quando o peso foi alterado e para qual valor.

## Validação
Vou considerar a correção pronta só depois de validar estes cenários:

1. Criar pedido com peso manual diferente do padrão
2. Salvar e reabrir o mesmo pedido
3. Editar outro campo sem mexer no peso
4. Confirmar que o peso manual permanece igual
5. Editar quantidade em pedido automático e confirmar recálculo normal
6. Editar peso com outro usuário operacional e confirmar persistência
7. Conferir Rupturas, Analytics, impressão e tabelas usando o peso corrigido

## Detalhes técnicos
```text
Antes:
peso manual só existia na memória do dialog

Depois:
peso_manual fica salvo no banco
    -> dialog reabre sabendo se aquele peso é manual
    -> submit preserva o valor digitado
    -> recálculo automático só acontece quando o item não é manual
```

## Arquivos envolvidos
- `src/components/dashboard/CarregamentoDialog.tsx`
- `src/pages/Index.tsx`
- `src/pages/Rupturas.tsx`
- `src/hooks/useCarregamentos.ts`
- `supabase/migrations/...` (nova migration para coluna, backfill e auditoria)

## Resultado esperado
- o sistema para de trocar peso digitado pelo peso da caixa
- pedidos antigos afetados podem ser recuperados onde houver histórico confiável
- novos pedidos e novas edições passam a manter exatamente o peso informado pelo usuário
