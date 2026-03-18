

# Finalizar Controle de Portaria

## Problemas encontrados

1. **Edge function `ocr-portaria` sem config no `config.toml`** — a function existe no código mas não tem a entrada no config, então não será deployada automaticamente.

2. **Hook `useRegistrosPortaria` não filtra por data** — recebe o parâmetro `data` mas a query busca todos os registros sem filtro de data, causando mistura de dados entre dias.

3. **Edge function precisa de deploy explícito** — sem logs indica que nunca foi deployada.

4. **Storage e tabela OK** — bucket `portaria` existe com policies corretas, tabela `registros_portaria` existe com RLS.

5. **Rota, sidebar e componentes OK** — `/portaria` está registrada, sidebar tem o link, todos os componentes existem.

## Correções

### 1. Adicionar config da edge function no `config.toml`
Adicionar:
```toml
[functions.ocr-portaria]
verify_jwt = false
```

### 2. Corrigir filtro por data no hook `useRegistrosPortaria`
Filtrar `created_at` pelo dia selecionado usando `.gte` e `.lt` quando o parâmetro `data` for informado.

### 3. Deploy da edge function
Executar deploy de `ocr-portaria` após corrigir o config.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/config.toml` | Adicionar seção `[functions.ocr-portaria]` |
| `src/hooks/useRegistrosPortaria.ts` | Adicionar filtro por data na query |

