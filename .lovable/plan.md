## Mostrar data dentro do card do comprovante

Adicionar a data de cada adiantamento dentro do bloco `font-mono` do comprovante (o texto que vai para o WhatsApp), em `src/components/logistica/ComprovanteAdiantamentoDialog.tsx`.

### Comportamento

- **1 adiantamento**: adicionar uma linha `Data: dd/MM/yyyy` logo após o cabeçalho `ADIANTAMENTO DE FRETE CIF, FORA DO ESTADO.`, usando `created_at`.
- **N adiantamentos, todos na mesma data**: mesma linha `Data: dd/MM/yyyy` única no topo.
- **N adiantamentos com datas diferentes**: anexar a data ao final da linha de cada item, ex.: `1.TRANSPORTADORA X (1.234 Kg) CTE — dd/MM/yyyy`.

### Detalhes técnicos

- Criar helper `fmtDate(iso)` usando `Intl.DateTimeFormat("pt-BR")` (apenas data, sem hora).
- No `useMemo` que monta `texto`:
  - Calcular `datasDistintas = new Set(adiantamentos.map(a => a.created_at?.slice(0,10)))`.
  - Se `size === 1`: inserir `Data: ${fmtDate(adiantamentos[0].created_at)}` como segunda linha (antes da linha vazia).
  - Caso contrário: na linha do item (`${idx + 1}.${a.transportadora}...`), anexar ` — ${fmtDate(a.created_at)}`.
- Nenhuma mudança em copy/print — a data entra automaticamente no texto copiado.
- Sem alterações em outros arquivos ou lógica de negócio.