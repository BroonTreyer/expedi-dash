# Problema

Na página **Portaria — Varejo** (`/portaria/carga-propria`), o usuário com perfil **Portaria** não vê o botão **"Registrar Chegada"** na aba **Esperados**, então não consegue marcar a chegada do motorista do Varejo.

# Causa

Em `src/pages/Portaria.tsx` (linha 540), o `VeiculosEsperadosPanel` é renderizado com:

```tsx
hideRegistrarChegada={isPortaria}
```

Esse flag esconde o botão "Registrar Chegada" para quem tem role `portaria`. O comentário no componente diz que a Portaria deveria usar os cards do **Pátio Atual** ou do painel azul **"Cargas fechadas aguardando veículo"** — mas esse painel azul só aparece quando uma carga foi fechada com placa vinculada na Logística. Para o **Varejo (carga_propria)**, o fluxo padrão é o motorista chegar pela lista de **Esperados** (planilha importada / vínculo automático), e sem o botão a Portaria fica travada.

No fluxo de **Distribuidores (terceirizado)** isso não afeta porque a aba "Esperados" nem é exibida (`categoria !== "terceirizado"`) e a chegada acontece pelo painel azul.

# Correção

Em `src/pages/Portaria.tsx`, trocar a prop por algo que considere a categoria:

```tsx
hideRegistrarChegada={isPortaria && categoria !== "carga_propria"}
```

Assim:
- **Varejo (`carga_propria`)** → botão **visível** para Portaria, permitindo registrar chegada a partir dos Esperados.
- **Distribuidores (`terceirizado`)** → comportamento atual mantido (a aba sequer aparece).
- **Admin / Logística** → continuam vendo o botão como hoje.

Nenhuma outra mudança é necessária: a função `openRegistroFromVeiculoEsperado` já trata corretamente `categoria === "carga_propria"` (usa `buildCargaPropriaPayload` e entra direto no pátio).

# Validação

1. Logar como Portaria, abrir `/portaria/carga-propria`, aba **Esperados** → conferir botão **"Registrar Chegada"** em cada veículo pendente (mobile e desktop).
2. Clicar e confirmar que o motorista aparece no **Pátio Atual** com etapa "chegou".
3. Em `/portaria/terceirizado` nada muda — fluxo segue pelo painel azul.
