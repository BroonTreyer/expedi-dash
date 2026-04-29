## Plano — corrigir “Faltando agora” para bater com o Painel

Vou corrigir a aba **Rupturas > Faltando agora** para ela deixar de fazer uma varredura própria de 3 meses e passar a usar a mesma regra/fonte do Painel principal.

### O que está errado agora

A tela de Rupturas ainda está buscando **3 meses** de dados:

```text
useCarregamentos(data de 3 meses atrás, hoje)
```

Quando o hook recebe intervalo, ele **não aplica** a regra especial do painel de hoje. Por isso entram rupturas antigas já finalizadas, como:

- 736 Calabresinha — DMA — carga já em logística/carregada
- 3060 Filé de Tilápia — DMA — carga já em logística/carregada
- 751 Mortadela Defumada Fatiada — DMA — carga já em logística/carregada
- 7725 Mortadela Tradicional 1kg — uma linha antiga de ELIAS ROTA com carga já carregada

Essas não devem estar no “Faltando agora”.

Também confirmei no banco que, pelo Painel de hoje, a carne moída em ruptura é:

```text
1080 CARNE MOIDA CONG. 500G
5.000 kg + 6.000 kg + 50 kg = 11.050 kg
```

Então a tela tem que mostrar **11.050 kg**, não 5.000 kg.

### Correção que vou fazer

1. **Trocar a busca da aba “Faltando agora”**
   - Remover a janela de 3 meses.
   - Usar `useCarregamentos(hoje, hoje)`.
   - Isso ativa a regra já existente do Painel:
     - pedidos de hoje;
     - mais carry-over dos últimos 30 dias com `status <> 'Carregado'`;
     - exclui rascunho e aguardando faturamento.

2. **Aplicar exatamente os mesmos filtros de visibilidade do Painel**
   Na aba “Faltando agora”, antes de agrupar, manter apenas:

```text
ruptura = true
etapa != 'logistica'
NÃO (carga_id preenchido E status = 'Carregado')
```

Isso faz sair automaticamente qualquer item que não apareceria no Painel operacional atual.

3. **Manter a soma por peso original para ruptura total**
   - Não vou mudar `pesoNaoCarregado`.
   - Para `ruptura = true`, continua contando `peso_original`.
   - Resultado esperado para carne moída: **11.050 kg**.

4. **Atualizar textos da tela**
   - Trocar o texto que fala “ruptura total ainda em aberto” para deixar claro que é a mesma visão do Painel atual: hoje + pendências carregadas para frente.

### Resultado esperado depois da correção

Na aba **Faltando agora**:

- **Carne moída 1080:** aparece com **11.050 kg**.
- **Filé de Tilápia 3060:** não aparece.
- **Calabresinha 736:** não aparece.
- **Mortadela Defumada Fatiada 751:** não aparece.
- **Mortadela Tradicional 7725:** fica apenas a ruptura atual do Painel, não a linha antiga de carga carregada.

### Arquivo a editar

- `src/pages/Rupturas.tsx`

Sem mudança de banco.