
## Atualizar Manual da Portaria — alinhar 100% com o sistema

### Objetivo
Reescrever `ManualTab.tsx` para refletir fielmente o que existe hoje no sistema, incluindo as 15 lacunas identificadas na análise anterior.

### O que será corrigido / incluído

**1. KPIs (corrigir)**
- Remover menção a "Tempo médio".
- Documentar apenas os 3 reais: **Entradas hoje**, **Saídas hoje**, **No Pátio agora**.
- Para Terceirizado, adicionar o KPI extra **Aguardando Entrada**.

**2. Fluxo Terceirizado (corrigir)**
- Trocar "3 etapas" por **2 etapas**: Entrada (com nota fiscal, doca, tipo carga) → Saída c/ Lacre (foto + OCR do lacre).

**3. Fluxo Carga Própria (refinar)**
- Manter as 4 etapas (Chegada → Saída p/ Rota → Retorno → Saída Final c/ Lacre).
- Esclarecer que tudo fica em **um único registro** atualizado a cada etapa (corrige a confusão antiga).

**4. OCR (expandir)**
- Documentar que o OCR funciona em **3 tipos**: Placa (Plate Recognizer), KM do painel (Gemini) e Número do Lacre (Gemini).
- Explicar o indicador de confiança (verde ≥ 85%, amarelo 60–84%, vermelho < 60%) e como confirmar/corrigir manualmente.

**5. Alertas visuais de tempo no pátio (incluir)**
- 🟢 até 4h • 🟡 4–8h • 🔴 mais de 8h.

**6. Aba Pátio Atual (incluir)**
- Lista de quem está dentro, busca por placa, ação "Registrar Saída" rápida, indicadores de tempo.

**7. Aba Histórico (incluir)**
- Paginação de **25 por página**, ordenação por colunas (clicar no cabeçalho), filtros, busca, exportação.
- **Deletar selecionados** (somente admin) e botão **Limpar filtros**.

**8. Aba Esperados (incluir)**
- Janela de ±3 dias, autorização/recusa, marcar como conferido, importar planilha.

**9. Saída Rápida (incluir)**
- Fluxo simplificado para Visitante / Fornecedor / Prestador / Outros (entrada → saída em 1 clique).

**10. Categorias adicionais (incluir)**
- Seções dedicadas para **Fornecedor, Visitante, Prestador, Outros** com campos obrigatórios de cada um (pessoa visitada, motivo, serviço, responsável interno, etc.).

**11. Autocomplete & Cadastros (incluir)**
- Como o sistema sugere motorista/empresa ao digitar a placa (vinculação Placa↔Motorista↔Transportadora) e quando criar cadastro novo.

**12. Evidências fotográficas (incluir)**
- Fotos suportadas: placa, documento, painel (KM), nota fiscal, lacre. Suporte também a PDF. Visualizador com zoom.

**13. Permissões (incluir)**
- Tabela rápida: o que **Portaria**, **Logística** e **Admin** podem fazer (registrar, editar, deletar, autorizar).

**14. Solução de problemas (incluir)**
- "OCR leu errado?" → confirmar manualmente.
- "Veículo não aparece em Esperados?" → usar walk-in.
- "Preciso apagar registro duplicado?" → pedir admin.
- "Foto não abre?" → URL assinada renovada automaticamente.

**15. Layout didático**
- Cards numerados com ícones, blocos coloridos "💡 Dica", "⚠️ Atenção", "✅ Resultado esperado".
- Diagramas ASCII dos fluxos dentro de `<pre>` com `font-mono`.
- Linguagem simples (criança de 8 anos), passos curtos, exemplos reais.

### Arquivos
- ✏️ `src/components/portaria/ManualTab.tsx` — reescrita completa com todas as seções acima, condicional por `categoria` (carga_propria | terceirizado), mais blocos comuns (KPIs, Pátio, Histórico, Esperados, Saída Rápida, OCR, Permissões, FAQ).

### Resultado
O Manual passa a descrever exatamente o sistema que está no ar — sem etapas inventadas, sem KPIs inexistentes — e cobre todos os fluxos, alertas, atalhos administrativos e categorias suportadas.
