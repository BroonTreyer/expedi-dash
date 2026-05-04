## Objetivo
Na página `/portaria/registro-entrada`, remover o card "Frota Própria", deixando apenas "Terceirizado".

## Mudanças

**`src/pages/RegistroEntrada.tsx`**
- Remover o card "Frota Própria" e o ícone `Truck` do import.
- Mudar o tipo do estado `grupo` para apenas `"TERCEIRIZADO" | null`.
- Trocar o grid `sm:grid-cols-2` por layout simples (um card centralizado, max-width menor).
- Atualizar texto da descrição se necessário (manter genérico).

## Resultado
A tela mostra apenas o card "Terceirizado" para registro de entrada. Os painéis abaixo (`CargasFechadasAguardandoPanel`, `SolicitacoesPendentesPanel`) permanecem inalterados.
