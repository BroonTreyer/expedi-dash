## Nova regra de "data efetiva" — terceirizadas

Hoje, em `src/lib/data-efetiva.ts`, uma carga terceirizada sem `horario_saida_final` cai na data planejada original — e some do Consolidado de hoje quando a data planejada está no passado.

### Regra nova

Para cargas **terceirizadas**:
1. Se tem `horario_saida_final` (saiu pela portaria) → data efetiva = data da saída. **Fixa.**
2. Senão (ainda não saiu) → data efetiva = **HOJE**.
3. Se todos os itens estão `Carregado` mas sem saída registrada → continua valendo HOJE (regra 2). Não usa mais `updated_at` como hoje faz.

Cargas **próprias** continuam usando a data original (não muda).

### Implementação

**1) `src/lib/data-efetiva.ts`** — atualizar `computeDataEfetivaTerceirizada`:
- Aceitar parâmetro extra `today: string` (formato `yyyy-MM-dd`) para evitar chamar `new Date()` dentro da função (mantém pura/testável).
- Lógica: se terceirizada e sem `saidaPortariaIso` → retorna `today`. Se tem saída → retorna a data da saída. Se não é terceirizada → retorna `dataOriginal`.

**2) `src/pages/Consolidado.tsx`** — onde chama `computeDataEfetivaTerceirizada`, passar `todayStr` (`new Date().toISOString().slice(0,10)`).

**3) Manter o carry-over** já existente em `useConsolidado` (linhas 82–116) — ele continua sendo o que traz CF FRANGO (data planejada 15/05, status ≠ Carregado) pro `rawData` quando o filtro é "hoje". Com a nova regra de data efetiva, a carga agora **passa** no filtro `dataEfetiva >= dateFromStr && dataEfetiva <= dateToStr` (hoje = hoje ✓).

### Efeito esperado

- CF FRANGO (planejada 15/05, sem saída) → aparece no Consolidado de **19/05** (hoje).
- Quando o motorista for expedido (saída registrada hoje) → continua aparecendo em **19/05** (data da saída).
- Se a saída for registrada amanhã (20/05) → aparece em **20/05**, e some de 19/05 quando a página recarregar.
- Cargas terceirizadas antigas com status `Carregado` mas sem saída registrada — hoje apareciam no dia do `updated_at`. Com a nova regra passam a aparecer "hoje" até alguém registrar a saída. Esse é um efeito colateral aceitável (poucas cargas nessa situação, e o correto é registrar a saída).

### O que NÃO mexer

- Carry-over do `useConsolidado` (já funciona).
- Cargas próprias.
- Outras telas que importam `computeDataEfetivaTerceirizada` (vou conferir e atualizar as chamadas se houver).

### Arquivos

- `src/lib/data-efetiva.ts` (assinatura + lógica)
- `src/pages/Consolidado.tsx` (passa `todayStr`)
- Qualquer outro caller de `computeDataEfetivaTerceirizada` (a verificar)
