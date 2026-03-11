

# Remover fundo da logo Frico

## Problema
A logo da Frico tem um fundo residual que aparece na sidebar e na tela de login. O usuário quer transparência total, mantendo a linha branca central.

## Abordagem
Não é possível editar imagens binárias diretamente no código. Duas opções:

### Opção 1: CSS (rápido, aproximado)
Aplicar `mix-blend-mode` na imagem para misturar com o fundo. Limitação: pode afetar a linha branca dependendo do contraste.

### Opção 2: Imagem reprocessada (recomendado)
O usuário faz upload de uma versão com fundo 100% transparente usando uma ferramenta como [remove.bg](https://remove.bg) ou editor de imagem, e eu substituo o arquivo.

## Recomendação
A melhor solução é o usuário fornecer a imagem já com fundo transparente. Se preferir a solução CSS imediata, posso aplicar `mix-blend-mode: multiply` na sidebar (fundo escuro) e ajustar o contraste.

