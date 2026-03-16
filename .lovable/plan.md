
Objetivo: corrigir o caso do código **33094** (já existe no cadastro, mas não aparece na busca da tela de Clientes).

Diagnóstico confirmado:
- O cliente **33094** existe no banco (SENDAS DISTRIBUIDORA S/A).
- Ele está na posição ~**3763** da ordenação por nome.
- A tela está carregando só um bloco inicial de clientes em alguns cenários, então a busca local não encontra esse código.

Plano de implementação

1) Tornar o carregamento de clientes realmente completo e resiliente
- Arquivo: `src/hooks/useClientes.ts`
- Ajustar o loop de leitura em lotes para não depender de limite fixo da API:
  - continuar buscando enquanto vierem registros;
  - avançar pelo tamanho real retornado (`from += data.length`);
  - parar apenas quando vier lote vazio.
- Isso evita parar cedo quando o backend devolver menos que 1000 por requisição.

2) Blindar a busca da tela de Clientes
- Arquivo: `src/pages/Clientes.tsx`
- Normalizar busca e campos (`trim + lower + String(...)`) para evitar falhas por tipo/espaço.
- Garantir que a busca por código funcione mesmo com dados heterogêneos.

3) Validar duplicidade diretamente no backend antes de criar
- Arquivo: `src/hooks/useClientes.ts`
- No `useCreateCliente`, consultar por `codigo_cliente` antes do `insert`.
- Se já existir, retornar erro amigável com contexto (ex.: nome/cidade/UF do cliente já cadastrado), evitando tentativa de insert “às cegas”.

4) Melhorar atualização de dados para não ficar com lista parcial em cache
- Arquivo: `src/hooks/useClientes.ts`
- Ajustar estratégia de refetch (ex.: `refetchOnMount`) para reduzir chance de tela ficar com cache antigo após deploy/importações.

5) Validação final (E2E)
- Buscar por `33094` na barra de Clientes e confirmar que aparece.
- Tentar cadastrar `33094` e confirmar mensagem clara de duplicidade.
- Buscar outros códigos altos (>3000ª posição) para confirmar que o problema foi resolvido de forma geral.

Arquivos impactados:
- `src/hooks/useClientes.ts`
- `src/pages/Clientes.tsx`
