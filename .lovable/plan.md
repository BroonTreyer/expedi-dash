

# Suporte a Ctrl+V (colar imagem) no CapturaFoto

## Mudança

Adicionar um listener de `paste` no componente `CapturaFoto` que captura imagens coladas da área de transferência (print screen) e as trata como upload.

## Implementação

### `src/components/portaria/CapturaFoto.tsx`

1. Adicionar um `ref` no container div e um `onPaste` handler
2. No handler, extrair o primeiro item de `clipboardData` que seja imagem, converter para `File`, e chamar `onCapture`
3. Tornar a área de drop/paste focável (`tabIndex={0}`) para receber eventos de teclado
4. Atualizar o texto de instrução para incluir "ou cole (Ctrl+V)"
5. Também adicionar um listener global `paste` no `useEffect` para funcionar mesmo sem foco direto no componente (mais prático para o usuário)

```typescript
// No useEffect:
const handlePaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      if (localPreview) URL.revokeObjectURL(localPreview);
      setIsPdf(false);
      setLocalPreview(URL.createObjectURL(file));
      onCapture(file);
      break;
    }
  }
};
document.addEventListener("paste", handlePaste);
return () => document.removeEventListener("paste", handlePaste);
```

| Arquivo | Mudança |
|---|---|
| `CapturaFoto.tsx` | Adicionar listener de paste global + texto "ou cole (Ctrl+V)" |

