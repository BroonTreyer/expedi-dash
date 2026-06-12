## Problema

No painel **Cargas fechadas aguardando veículo** (mobile, 390px), o badge laranja "Aguardando liberação · Chegou 12/06 04:17 (há 10 horas 40 minutos)" concentra texto demais dentro de uma única pílula. Resultado:

- A pílula quebra em várias linhas mantendo borda arredondada errada (formato "amassado").
- Texto longo "10 horas 40 minutos" + data + hora num só badge força largura > card.
- Causa overflow horizontal sutil da página inteira.

Não é problema de fonte — é o conteúdo dentro do `<Badge>`. O ajuste anterior em `index.css` não resolve porque a estrutura do componente é que está errada.

## Solução (apenas UI)

Arquivo: `src/components/portaria/CargasFechadasAguardandoPanel.tsx` (linhas 265–276)

Separar em duas peças:

1. **Badge compacto** (mantém a pílula limpa):
   `[Hourglass] Aguardando liberação`

2. **Linha de texto auxiliar** logo abaixo do título (fora do badge), em `text-[11px] text-muted-foreground`:
   `Chegou 12/06 04:17 · há 10h 40min`

E encurtar o `formatDuration` para o formato abreviado pt-BR:
- `10 horas 40 minutos` → `10h 40min`
- `1 dia 3 horas` → `1d 3h`

Implementado via helper local que pega `intervalToDuration` e monta string curta (sem depender de `formatDuration`/locale verboso).

## Mudanças

- 1 arquivo alterado: `src/components/portaria/CargasFechadasAguardandoPanel.tsx`
- Badge "Aguardando liberação" volta a ser compacto (cabe na linha do nome da carga).
- Info de chegada vira linha discreta abaixo, com wrap natural.
- Nenhuma alteração em lógica, hooks, banco ou `index.css`.

## Resultado visual esperado

```text
EDIVAR JM  [⌛ Aguardando liberação]  [📦 3 pedidos]  [28.160,00 kg]
Chegou 12/06 04:17 · há 10h 40min
🚛 Placa prevista: SE06H14
Motorista: THIAGO SANTANA DA SILVA
…
```

Card respeita largura do mobile, pílula não quebra, e nada de scroll horizontal.
