## Por que sumiu a opção

A função **"Regularizar sem foto"** (checkbox + motivo obrigatório que dispensa fotos travando o fluxo) existe no código e nunca foi removida. O problema é que ela está restrita **só à Carga Própria** desde a implementação original — porque o caso de uso inicial era destravar o fluxo de saída p/ rota / retorno / lacre da frota própria.

Como você está em **/portaria/terceirizado**, a checkbox **nunca aparece**, mesmo sendo admin/logística. E o terceirizado também tem fotos obrigatórias que travam o registro:
- **Entrada**: `foto_placa_url` (obrigatória)
- **Saída** (lacre): `foto_lacre_url` (obrigatória)

Mesmo problema vale para **Fornecedor** (`foto_placa_url`, `foto_documento_url`, `foto_nota_url`, `foto_lacre_url` — todas obrigatórias) e **Prestador / Visitante / Outros**.

## Solução

Estender a opção "Regularizar sem foto" a **todas as categorias** que tenham fotos obrigatórias travando o fluxo, mantendo a restrição de perfil (só admin/logística vê a checkbox).

### Mudança em `src/components/portaria/RegistroMovimentoDialog.tsx`

1. **Liberar a checkbox em mais categorias** (linha ~174-177):
   - Substituir a regra `categoria === "carga_propria" && (saida_rota|retorno|lacre)` por uma regra genérica: mostrar sempre que a categoria tiver pelo menos um campo de foto marcado como `obrigatorio` na config (`portaria-fields-config.ts`).
   - Na prática isso libera para: `carga_propria`, `terceirizado`, `fornecedor`, `prestador`, `visitante`, `outros`.

2. **Ampliar `REGULARIZAR_SKIP`** (linha ~163) para incluir as fotos que hoje não estão na lista:
   - Adicionar: `foto_documento_url`, `foto_nota_url`.
   - Lista final: `foto_placa_url`, `foto_painel_url`, `foto_painel_saida_url`, `foto_lacre_url`, `foto_documento_url`, `foto_nota_url`.

3. **Manter `km_inicial` obrigatório** (regra anterior do plano original — sem KM não dá pra calcular KM rodado).

4. **Manter o prefixo de auditoria** em `observacoes`: `[REGULARIZADO por <user> em <data>: <motivo>]` — já implementado, não muda.

5. **Manter o badge "Regularizado"** no `MovimentoDetailsDialog` — já implementado, não muda.

### Por que não estender também para `numero_lacre`

O número do lacre é texto curto que o operador consegue digitar mesmo sem foto. A obrigatoriedade dele continua, só a foto vira opcional via checkbox.

## Arquivos afetados

- `src/components/portaria/RegistroMovimentoDialog.tsx` — ajustar `showRegularizarOption` e ampliar `REGULARIZAR_SKIP`.

Sem migration, sem mudança de banco. Correção pontual de escopo da feature que já existe.

## Observação sobre "implementa e some"

Verifiquei e **nenhuma das duas funções foi removida**:
- `regularizar` / motivo / badge "Regularizado" → existe (linhas 65, 164-172, 262-263, 560-574 do `RegistroMovimentoDialog.tsx`).
- `allowFileUpload` (botão "Enviar arquivo") → existe e está ativo para admin/logística em todas as categorias (linha 662).

O que aconteceu foi que a regularização nasceu restrita a Carga Própria e nunca foi ampliada — você cruzou com o caso em terceirizado e parecia que tinha sumido.