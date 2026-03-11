

# Favicon de Caminhão

## Abordagem

1. **Gerar imagem** via Lovable AI (google/gemini-3-pro-image-preview) — prompt: ícone de caminhão de logística/expedição, estilo flat/minimal, fundo transparente, cores que combinem com o tema vermelho (#c0272d) do sistema, formato quadrado 512x512
2. **Salvar no Storage** e copiar para `public/favicon.png` e `public/apple-touch-icon.png`
3. **Atualizar `index.html`** — referência ao novo favicon

## Implementação

### Edge Function `generate-favicon`
- Chama a API de geração de imagem com prompt detalhado para um ícone de caminhão profissional
- Retorna a imagem base64

### Frontend
- Criar utilitário que chama a edge function, faz upload para Storage, e disponibiliza como favicon
- Alternativa mais simples: gerar direto na edge function e salvar no bucket

### Abordagem simplificada
- Usar um SVG de caminhão bem elaborado como favicon inline, sem necessidade de geração AI
- Criar um SVG customizado com as cores do tema (#c0272d) e colocar em `public/favicon.svg`
- Atualizar `index.html` para referenciar o novo favicon

## Arquivos (2)
1. `public/favicon.svg` — SVG de caminhão estilizado com cores do tema
2. `index.html` — atualizar referências do favicon

