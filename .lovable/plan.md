
## Auditoria: por que a Foto do Painel KM (Saída) continua sem aparecer

### Achado principal

O diálogo de detalhes já está preparado para exibir as duas fotos:

- `foto_painel_saida_url` → Painel KM (Saída p/ Rota)
- `foto_painel_url` → Painel KM (Retorno)

O problema real não está mais na tela de detalhes. Está na captura/gravação.

### Evidência encontrada

Nos registros recentes de `movimentacoes_portaria` para `categoria = 'carga_propria'`, a coluna `foto_painel_saida_url` continua vazia (`NULL`) em todos os casos auditados, enquanto:

- `foto_placa_url` está preenchida
- `foto_painel_url` (retorno) está preenchida quando o retorno foi registrado
- `foto_painel_saida_url` permanece vazia

Exemplo auditado:
- `NVP6191` → placa salva, painel retorno salvo, painel saída ausente
- `FFW4J99`, `PRO0D73`, `NKU2C52` → mesmo padrão

Isso confirma que o detalhe mostra só uma foto porque só uma foi realmente salva no banco.

### Causa raiz mais provável

O campo `foto_painel_saida_url` foi adicionado ao backend e ao detalhe, mas o fluxo de **Saída p/ Rota** ainda não está garantindo corretamente a captura completa da evidência no formulário em produção. Há 3 pontos a consolidar:

1. **Formulário da Saída p/ Rota**
   - garantir que `foto_painel_saida_url` apareça sempre no bloco correto da etapa `saida_rota`
   - manter o campo visível e obrigatório para `carga_propria`

2. **Persistência no submit**
   - garantir que o submit de `prefillEtapa === "saida_rota"` não perca `values.foto_painel_saida_url`
   - adicionar log defensivo/validação antes do update para impedir salvar a etapa sem essa URL quando não estiver em regularização

3. **Detalhes do movimento**
   - manter a leitura das duas colunas, mas tornar o builder mais explícito para Carga Própria, exibindo ambas independentemente da etapa atual do registro

### O que vou corrigir

#### 1. Fortalecer o fluxo da Saída p/ Rota em `RegistroMovimentoDialog.tsx`
- confirmar o campo `foto_painel_saida_url` no formulário da etapa `saida_rota`
- reforçar a validação antes do `updateMov.mutateAsync`
- impedir que a etapa avance para `em_rota` sem a foto, exceto quando `regularizar` estiver ativo
- revisar o `reset`/`prefill` para não limpar o valor capturado ao longo da interação

#### 2. Revisar a matriz dinâmica em `portaria-fields-config.ts`
- manter `foto_painel_saida_url` como obrigatório em `saida_rota`
- revisar se a etapa `saida_rota` está usando exatamente a matriz esperada para Carga Própria
- se necessário, separar uma matriz dedicada de `VISIBILITY_SAIDA_ROTA` para evitar ambiguidades futuras

#### 3. Ajustar o detalhe em `MovimentoDetailsDialog.tsx`
- continuar agregando `foto_painel_saida_url` e `foto_painel_url`
- manter labels fixos e separados:
  - `🛞 Painel KM (Saída p/ Rota)`
  - `🛞 Painel KM (Retorno)`
- adicionar fallback claro só para registros antigos sem foto de saída, sem mascarar erro de captura

#### 4. Verificação de consistência do fluxo completo
- auditar o caminho:
  `Chegada -> Saída p/ Rota -> Retorno -> Saída Final`
- confirmar que:
  - a placa continua salvando
  - o painel de saída passa a salvar em `foto_painel_saida_url`
  - o painel de retorno continua salvando em `foto_painel_url`
  - os detalhes passam a mostrar as duas fotos quando existirem

### O que não muda

- sem nova migration, porque a coluna `foto_painel_saida_url` já existe no banco
- sem mudança de RLS
- sem alterar o fluxo de retorno/lacre além do necessário
- registros antigos continuarão sem a foto inicial, porque ela nunca foi capturada

### Arquivos que precisam ser revisados/ajustados

- `src/components/portaria/RegistroMovimentoDialog.tsx`
- `src/lib/portaria-fields-config.ts`
- `src/components/portaria/MovimentoDetailsDialog.tsx`

### Resultado esperado

Após o ajuste, um novo ciclo de Carga Própria deverá gerar no detalhe:

- `📷 Foto da Placa`
- `🛞 Painel KM (Saída p/ Rota)`
- `🛞 Painel KM (Retorno)`
- `🔒 Foto do Lacre` (quando finalizado)

E o caso do print enviado deixará de mostrar apenas a foto do painel de retorno.
