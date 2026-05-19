## Data de pagamento — fora do texto do comprovante

O texto dentro do card é o que vai pro WhatsApp, então a data lá não faz sentido. O que o usuário quer é registrar **quando o adiantamento foi pago** — controle externo ao texto.

### Mudanças em `src/components/logistica/ComprovanteAdiantamentoDialog.tsx`

1. **Remover** a linha `Data: dd/MM/yyyy` que foi inserida no `useMemo` do `texto` (mantém só o conteúdo original do WhatsApp).
2. **Adicionar bloco "Data do pagamento"** fora do card `font-mono`, logo acima do `DialogFooter`:
   - Se houver pelo menos um adiantamento `pendente` no diálogo → mostrar um `<Input type="date">` com label "Data do pagamento", default = hoje (formato `yyyy-MM-dd`), estado local `dataPagamento`.
   - Se todos os adiantamentos já estiverem `pago`/`quitado` → mostrar texto readonly "Pago em: dd/MM/yyyy" usando `pago_em` (se diferirem entre itens, listar por item).
3. **Botão "Marcar como pago"**: passar a data escolhida para a mutation (`marcarPago.mutateAsync({ id, pago_em })`).

### Mudanças em `src/hooks/useAdiantamentos.ts`

- `useMarcarAdiantamentoPago.mutationFn` muda assinatura para aceitar `{ id: string; pago_em?: string }`.
- Se `pago_em` vier preenchido, converter `yyyy-MM-dd` → ISO de meio-dia local (`new Date(${pago_em}T12:00:00).toISOString()`) para evitar mudança de dia por fuso.
- Se vier vazio/undefined, usar `new Date().toISOString()` (comportamento atual).

### Sem mudanças

- Texto copiado para WhatsApp permanece igual ao original (sem linha de Data).
- Outras abas e listagens não mudam.