## Consolidar adiantamentos por OC na tabela de Adiantamentos

### Objetivo
Quando vários adiantamentos compartilham a mesma Ordem de Carga + Transportadora, exibir como uma única linha somando valores. Hoje aparecem 3 linhas para OC 129873 e 2 linhas para 129969.

### Onde
`src/components/logistica/AdiantamentosTab.tsx` — componente `ListaAdiantamentos` (linhas ~783-870). Mudança puramente de apresentação, sem alterar dados no banco.

### Como
1. **Função `consolidarPorOC(data)`**: agrupa por chave `transportadora + ordem_carga` (apenas quando `tipo_agrupamento === "ordem"` e há OC). Itens "Lote" ou sem OC ficam como linhas individuais.

2. **Linha agregada** por grupo, somando:
   - `qtd_ctes`, `valor_total_ctes`, `valor_adiantamento`, `valor_saldo`
   - `%` = média ponderada (adiantamento/total)
   - `numero`: se ≥2 adiantamentos, exibir `"N adiantamentos"` com tooltip listando os números; se 1, mantém o original
   - `status`: se todos iguais → mesmo; senão → "misto" (mostra cor neutra)
   - `pago_em` / `quitado_em`: data mais recente do grupo
   - `data`: data mais antiga (ou range "dd/MM – dd/MM" se diferentes)

3. **Expansão (chevron)**: linha agregada com `>1` adiantamento ganha botão para expandir e mostrar as linhas originais embaixo (sub-linhas com indent).

4. **Ações por linha agregada**:
   - **Comprovante**: abre o `ComprovanteAdiantamentoDialog` recebendo todos os adiantamentos do grupo (o dialog já agrega CT-es por transportadora, então só passar o array funciona)
   - **Cancelar**: aparece só dentro da expansão, por adiantamento individual (segurança — evita cancelar 3 de uma vez sem querer)
   - **Checkbox de seleção** (aba Aguardando): marca/desmarca todos os adiantamentos do grupo de uma vez

5. **Aplicar nas 3 abas** que usam `ListaAdiantamentos` (Pendentes, Aguardando, Quitados).

### Fora de escopo
- Não altera schema, hooks, mutations, nem o dialog de comprovante.
- Não mexe na aba "Montar Lote" (já agrupa por OC).
