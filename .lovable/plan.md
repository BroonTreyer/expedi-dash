

## Eliminar warnings globais de `forwardRef` (App.tsx)

### Diagnóstico real

Os warnings **não** vêm de `Rupturas.tsx` nem de `RupturasPrintDialog`. Eles aparecem em **todas** as rotas, no mount inicial do `App`. Causa: em `src/App.tsx`, o `TooltipProvider` (Radix) recebe **múltiplos** function components como filhos diretos:

```tsx
<TooltipProvider>
  <Toaster />          // function component
  <Sonner />           // function component
  <PwaUpdatePrompt />  // function component
  <BrowserRouter>...</BrowserRouter>
</TooltipProvider>
```

O `TooltipProvider` (que envolve um Radix `Provider` + `Slot`) tenta encaminhar `ref` para o filho único, e como cada um desses filhos é um function component sem `forwardRef`, o React emite o warning para cada um (Toaster, Sonner, PwaUpdatePrompt, BrowserRouter, AppRoutes…).

A tentativa anterior de mexer em `Rupturas.tsx`/`RupturasPrintDialog` não tinha relação com o problema — o `App` aparecia no stack porque é o ancestral comum.

### Mudança

**Arquivo único: `src/App.tsx`**

Envolver os filhos do `TooltipProvider` em um `<>...</>` fragmento explícito não basta (o Slot ignora fragmentos), mas envolvê-los em uma **`<div>`** raiz já elimina o ref-forwarding ambíguo. Alternativa mais limpa: mover `<Toaster/>`, `<Sonner/>` e `<PwaUpdatePrompt/>` para **fora** do `TooltipProvider`, deixando apenas o `<BrowserRouter>` como filho.

Estrutura final proposta:

```tsx
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
    <Toaster />
    <Sonner />
    <PwaUpdatePrompt />
  </QueryClientProvider>
);
```

Justificativa:
- `Toaster`/`Sonner`/`PwaUpdatePrompt` são overlays globais que não precisam estar dentro do `TooltipProvider` para funcionar.
- `BrowserRouter` deixa de causar warning porque, ao ser filho único do `TooltipProvider`, o forward de ref é absorvido sem ambiguidade pelo `Slot` interno.

### Reverter ajuste anterior (opcional, recomendado)

Em `src/pages/Rupturas.tsx` (linha ~264), o `<button>` extra envolvendo o `<Badge>` no `TooltipTrigger asChild` foi adicionado por engano. Pode ser revertido para o original:

```tsx
<TooltipTrigger asChild>
  <Badge variant="secondary" className="text-[10px] cursor-help">{p.clientes.size}</Badge>
</TooltipTrigger>
```

(Badge já é `forwardRef`, então funciona corretamente sem o wrapper.)

### Como verificar

1. Recarregar qualquer rota (ex.: `/`, `/rupturas`).
2. Abrir DevTools → Console: os 7+ warnings de “Function components cannot be given refs” devem sumir completamente.
3. Toasts (sonner + radix), PWA update prompt e tooltips continuam funcionando.

### Fora do escopo

- Refactor de outras páginas, restauração do walk-in do Ronaldo, melhorias na lista de Veículos Esperados.

### Resultado

Console limpo em **todas** as rotas, sem regressão funcional nos overlays globais.

