

# Corrigir câmera no Android e confirmar PWA

## PWA no Android
O PWA já está configurado corretamente para Android:
- Manifest com ícones 192x192 e 512x512, `display: "standalone"`
- Service worker com `autoUpdate`
- Meta tags mobile no `index.html`

No Android, o usuário pode instalar via menu do Chrome → "Adicionar à tela inicial" ou "Instalar app". Funciona igual app nativo.

## Problema da câmera
O componente `CapturaFoto` usa `<input type="file" accept="image/*">` sem o atributo `capture`. No Android, isso abre um seletor que permite escolher entre câmera e galeria. Você quer que abra **somente a câmera**.

## Solução

### Arquivo: `src/components/portaria/CapturaFoto.tsx`

1. Adicionar prop `cameraOnly` (default `true` para manter o comportamento desejado)
2. Adicionar atributo `capture="environment"` no `<input>` — isso força o Android a abrir diretamente a câmera traseira
3. Remover o listener de paste (Ctrl+V) quando `cameraOnly` estiver ativo, já que só deve aceitar fotos da câmera
4. Atualizar o texto do placeholder para "Toque para fotografar"

### Detalhe técnico
```text
Antes:  <input type="file" accept="image/*" />
Depois: <input type="file" accept="image/*" capture="environment" />
```

O atributo `capture="environment"` instrui o navegador mobile a usar a câmera traseira diretamente, sem mostrar opção de galeria.

### Exceção
Campos que aceitam PDF (como `foto_documento_url`) continuarão sem `capture`, pois precisam permitir upload de arquivo. A prop `accept` já controla isso — quando `accept` inclui `application/pdf`, não adicionamos `capture`.

## Arquivos afetados
- `src/components/portaria/CapturaFoto.tsx`

