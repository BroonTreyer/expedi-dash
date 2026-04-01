

# Corrigir erro de build (esbuild version mismatch)

## Problema
O servidor de desenvolvimento não inicia por causa de um conflito de versão do esbuild: "Host version 0.21.5 does not match binary version 0.25.12". Isso faz o preview ficar branco.

Este é um problema de ambiente, não de código. O binário compilado do esbuild no cache está desatualizado em relação ao pacote instalado.

Sobre o código "33007" do cliente: a foreign key de `codigo_cliente` já foi removida da tabela `carregamentos_dia` (confirmado no schema atual), então esse erro específico não deve mais ocorrer. O sistema de lookup por código de cliente (com debounce de 300ms) está funcionando corretamente no código.

## Correção

### 1. Limpar cache do esbuild e reinstalar
- Remover `node_modules/.cache` e o binário desatualizado do esbuild
- Reinstalar o esbuild para que host e binary fiquem na mesma versão
- Reiniciar o servidor de desenvolvimento

### 2. Validação
- Confirmar que o preview carrega normalmente
- O fluxo de criar pedido com código de cliente deve funcionar sem erro de FK

| Ação | Detalhe |
|---|---|
| Limpar cache | `rm -rf node_modules/.cache` |
| Reinstalar esbuild | `bun install esbuild --force` |
| Reiniciar dev server | Automático após correção |

