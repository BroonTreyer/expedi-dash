
## Diagnóstico

User quer ver, ao lado do item "Registro de Entrada" no menu lateral, um **contador de veículos** (badge numérico) para visibilidade rápida do backlog sem precisar abrir a página.

A pergunta é qual contador faz mais sentido. Olhando o fluxo atual:
- `SolicitacoesPendentesPanel` mostra dois grupos: **Aguardando vínculo da Logística** e **Liberados aguardando porteiro liberar entrada**.
- O hook `useVeiculosWalkInAtivos` já retorna ambos os conjuntos.

O contador mais útil para a Portaria é a soma dos dois (total pendente de ação na tela de Registro de Entrada) — preferencialmente com destaque visual quando há "Liberados" (ação imediata do porteiro).

## Plano

### 1. Hook leve de contagem (`useVeiculosEsperados.ts`)
Criar `useWalkInPendentesCount()` — query enxuta que retorna `{ aguardando, liberados, total }` com mesmo filtro do panel (status `aguardando_vinculo` + `autorizado` ainda sem movimentação). Cache curto (10s) + invalidação realtime já existente.

### 2. AppSidebar — badge ao lado do item
- No `NavNodeRenderer` (modo expandido): renderizar um badge numérico à direita do label "Registro de Entrada" quando `total > 0`.
  - Cor: amber se só "aguardando", verde-pulsante se há "liberados" (ação para o porteiro).
- No modo colapsado: pequeno dot indicador no canto do ícone `LogIn` (verde se há liberados, amber caso contrário).
- Tooltip estendido: "X aguardando vínculo · Y liberados".

### 3. Implementação mínima
- Adicionar campo opcional `badge?: () => ReactNode` em `NavLeaf` para permitir render customizado sem acoplar lógica de Portaria ao sidebar genérico.
- Passar componente `<RegistroEntradaBadge />` que consome o hook só onde aplicável.

### Sem mudanças
Schema, RLS, fluxo de Registro de Entrada, demais itens do menu.

## Arquivos
- ✏️ `src/hooks/useVeiculosEsperados.ts` — novo `useWalkInPendentesCount`
- ✨ `src/components/portaria/RegistroEntradaBadge.tsx` — badge consumindo o hook
- ✏️ `src/components/AppSidebar.tsx` — suporte a `badge` em `NavLeaf` + render expandido/colapsado
