
## Diagnóstico

Print mostra: digitando `026` encontra o motorista (CPF `026.168.879-08`); digitando `0261` (sequência real do CPF sem pontos) **não encontra**.

Causa: a busca em `useMotoristas` provavelmente faz `ilike` direto no campo `cpf`, que está armazenado **com máscara** (`026.168.879-08`). Então `0261` não casa porque no banco existe `026.1` (com ponto). Idem para telefone.

## Plano

### 1. Verificar `useMotoristas`
Confirmar como a query busca por CPF/telefone (provável `ilike '%query%'` no campo formatado).

### 2. Normalizar busca por dígitos
Quando o termo digitado for **majoritariamente numérico** (>= 3 dígitos), gerar duas variantes:
- termo cru (busca por nome)
- termo só-dígitos comparado contra CPF/telefone **ignorando máscara**

Como o CPF está salvo com pontos no banco, a forma limpa é usar `regexp_replace(cpf, '\D', '', 'g') ilike '%digitos%'` via RPC, **ou** mais simples: salvar/buscar gerando padrão com curingas entre cada dígito (`0%2%6%1%`) usando `ilike` — funciona com máscara existente sem precisar de RPC.

Abordagem escolhida (sem migration): construir pattern `ilike` intercalando `%` entre dígitos quando termo é numérico. Aplicar em CPF e telefone. Nome continua busca normal.

### 3. Aplicar mesma lógica onde fizer sentido
- `useMotoristas` (CPF + telefone)
- `useCaminhoes` se buscar placa com hífen (verificar)
- `useClientes` se buscar por código/CNPJ formatado (verificar rapidamente)

Escopo desta tarefa: focar em **motoristas** (problema reportado). Outros ficam como sugestão.

### Sem mudanças
Schema, RLS, máscara de exibição, componente `MotoristaAutocomplete`.

## Arquivos
- 🔍 `src/hooks/useMotoristas.ts` — inspecionar e ajustar query de busca para ignorar pontuação em CPF/telefone
