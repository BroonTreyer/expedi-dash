

# Corrigir logo Frico que não aparece na impressão (todos os relatórios)

## Causa raiz

O problema **não é CSS**. O `cloneNode(true)` clona o elemento `<img>` com o atributo `src` apontando para a URL do Vite (ex: `/assets/frico-logo-abc123.png`), mas o navegador precisa recarregar a imagem no clone. Como `window.print()` é chamado imediatamente após a clonagem, a imagem ainda não carregou no elemento clonado e sai em branco na impressão.

## Solução

Nos 3 dialogs de impressão, **aguardar o carregamento de todas as imagens no clone antes de chamar `window.print()`**. Isso garante que a logo esteja pronta quando o navegador renderizar a página de impressão.

### Alteração nos 3 arquivos

**Arquivos:**
- `src/components/dashboard/CargaPrintDialog.tsx`
- `src/components/dashboard/ConsolidadoPrintDialog.tsx`
- `src/components/dashboard/RupturasPrintDialog.tsx`

Em cada `handlePrint()`, após `document.body.appendChild(wrapper)`, substituir a chamada direta a `window.print()` por uma função que:

1. Busca todas as `<img>` dentro do clone
2. Para cada imagem, cria uma Promise que resolve quando `onload` dispara (ou imediatamente se já estiver em cache via `img.complete`)
3. Após todas as Promises resolverem, chama `window.print()`

```typescript
// Exemplo da lógica (aplicada nos 3 arquivos):
const images = wrapper.querySelectorAll("img");
const promises = Array.from(images).map(
  (img) =>
    new Promise<void>((resolve) => {
      if (img.complete) return resolve();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // não travar se falhar
    })
);
Promise.all(promises).then(() => {
  document.body.classList.add("printing-carga");
  window.print();
  setTimeout(cleanup, 2000);
});
```

Nenhuma alteração em CSS necessária.

