

# Configurar saída por categoria

## Regras de negócio
1. **Terceirizado**: não precisa de saída (sai do pátio automaticamente ou não aparece no pátio)
2. **Carga Própria**: saída requer apenas `km_final` (obrigatório) + foto do painel KM com OCR
3. **Demais categorias** (fornecedor, visitante, prestador, outros): saída é apenas "dar baixa" — sem campos adicionais

## Mudanças

### 1. `src/lib/portaria-fields-config.ts`
- Tornar `km_final` visível como `"obrigatorio"` para `carga_propria` (já está `"oculto"`)
- Adicionar campo `foto_painel_url` como `"obrigatorio"` para `carga_propria` na saída (já existe, mas precisamos diferenciar entrada vs saída — ver item 3)

### 2. `src/lib/portaria-fields-config.ts` — suporte a contexto entrada/saída
- Criar uma segunda matriz de visibilidade `VISIBILITY_SAIDA` (ou expandir a lógica) para campos específicos de saída:
  - `carga_propria`: mostrar apenas `foto_painel_url` (obrigatório) + `km_final` (obrigatório) + `observacoes` (opcional)
  - Todas as outras categorias (exceto terceirizado): nenhum campo — saída rápida direto
- Exportar `getVisibleFields` com parâmetro opcional `tipoMovimento`

### 3. `src/components/portaria/PatioAtualTab.tsx`
- **Terceirizado**: esconder o botão de saída (não precisa registrar saída)
- **Carga Própria**: botão "Saída" abre o `RegistroMovimentoDialog` com prefill (já funciona via `onRegistrarSaida`)
- **Demais**: manter "Saída Rápida" como está (apenas dar baixa sem formulário)

### 4. `src/components/portaria/RegistroMovimentoDialog.tsx`
- Quando `tipo === "saida"` e `categoria === "carga_propria"`: usar campos de saída (foto painel + km_final)
- Quando `tipo === "saida"` e outras categorias: não deveria chegar aqui (saída rápida direto)
- No `handleFotoCapture` para saída: OCR do painel preenche `km_final` em vez de `km_inicial`

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/portaria-fields-config.ts` | Adicionar `VISIBILITY_SAIDA`, tornar `km_final` obrigatório para carga_propria na saída, atualizar `getVisibleFields` |
| `src/components/portaria/PatioAtualTab.tsx` | Esconder botão saída para terceirizado, manter saída rápida para categorias simples |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Usar visibilidade de saída quando `tipo === "saida"`, OCR preenche `km_final` na saída |

