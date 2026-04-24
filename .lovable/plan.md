
## Mostrar CIF/FOB no romaneio impresso + transportadora no card do motorista

### Diagnóstico

Dois ajustes pequenos, em arquivos distintos:

**1) Romaneio impresso (`CargaPrintDialog`) não mostra Tipo de Frete (CIF/FOB).**
O cabeçalho do romaneio (linhas 174-188) lista Data, Caminhão, Placa, Motorista, Transportadora e Horário Previsto — mas o campo `tipo_frete` da carga não aparece. O dado existe no banco (`carregamentos_dia.tipo_frete`) e já é agregado por carga no Consolidado (`g.tipoFrete`, linha 459 e 516), porém **não é repassado** ao `CargaPrintData` quando o usuário clica em "Imprimir Romaneio" (`abrirRomaneio` em `Consolidado.tsx`, linhas 400-413). Também precisa ser repassado a partir do `FechamentoLoteDialog.tsx` (linhas 200-215) quando o romaneio é exibido logo após fechar a carga.

**2) Card do motorista no `FechamentoLoteDialog` não mostra transportadora.**
No `MotoristaAutocomplete.tsx` (linhas 238-262), depois que o motorista é selecionado, aparece um pequeno card abaixo do input com apenas **telefone** (e botão de editar). A transportadora vinculada ao caminhão do motorista já é buscada (`handleSelect`, linhas 127-138) e propagada via `onSelect`, mas **não é exibida visualmente** no card. O usuário quer ver essa info ali, próximo do nome.

---

### Mudança 1 — `src/components/dashboard/CargaPrintDialog.tsx`

a) **Interface `CargaPrintData`**: adicionar campo opcional
```ts
tipoFrete?: string | null;  // "CIF" | "FOB" | múltiplos separados por "/" caso a carga tenha mix
```

b) **Cabeçalho de info do romaneio** (grid de linhas ~174-188): incluir nova linha quando `data.tipoFrete` existir:
```tsx
{data.tipoFrete && (
  <div><span className="font-semibold">Tipo de Frete:</span> {data.tipoFrete}</div>
)}
```
Posicionar logo após "Transportadora" para ficar próximo dos dados de transporte.

### Mudança 2 — `src/pages/Consolidado.tsx`

No `abrirRomaneio` (linha ~400), adicionar ao `CargaPrintData`:
```ts
tipoFrete: group.tipoFrete ?? undefined,
```
`group.tipoFrete` já existe no `CargaGroup` (acumulado em `freteMap` na linha 158) e expressa "CIF", "FOB" ou "CIF/FOB" se houver mix.

### Mudança 3 — `src/components/dashboard/FechamentoLoteDialog.tsx`

No `printDataForRomaneio` (linhas 200-215), incluir `tipoFrete` derivado dos itens:
```ts
const tipoFreteSet = new Set(items.map((i) => i.tipo_frete).filter(Boolean));
const tipoFreteStr = Array.from(tipoFreteSet).join("/") || undefined;
// ...
tipoFrete: tipoFreteStr,
```
Isso garante que o romaneio impresso logo após fechar a carga também mostre a info.

### Mudança 4 — `src/components/portaria/MotoristaAutocomplete.tsx`

a) Guardar a transportadora vinculada num novo state ao selecionar o motorista (`handleSelect`, linhas 114-142). Hoje já fazemos `transportadora = caminhao.transportadora || undefined` mas só é propagado via `onSelect` — não persiste no componente. Adicionar:
```ts
const [transportadoraVinculada, setTransportadoraVinculada] = useState<string | null>(null);
// dentro de handleSelect, após buscar caminhão:
setTransportadoraVinculada(caminhao?.transportadora || null);
```
E limpar quando o usuário trocar o nome (effect das linhas 166-171).

b) No card de info abaixo do input (linhas 238-262), adicionar uma linha extra com a transportadora quando existir, no mesmo padrão visual do telefone:
```tsx
{transportadoraVinculada && (
  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
    <Truck className="h-3 w-3" />
    <span>{transportadoraVinculada}</span>
  </div>
)}
```
(Importar `Truck` do `lucide-react`.)

> Observação: o input "Transportadora" do formulário (linha 398-400 do `FechamentoLoteDialog`) continua existindo e editável — esse card só **mostra** a transportadora cadastrada do caminhão do motorista, dando feedback visual de que a vinculação foi reconhecida.

### Validação (cenários)

1. **Romaneio CIF puro**: carga com todos os itens `tipo_frete='CIF'` → cabeçalho mostra "Tipo de Frete: CIF". ✅
2. **Romaneio misto**: carga com itens CIF + FOB → mostra "Tipo de Frete: CIF/FOB". ✅
3. **Romaneio sem tipo_frete**: linha simplesmente não aparece (não polui o cabeçalho). ✅
4. **Romaneio impresso direto após fechar carga** (via `FechamentoLoteDialog`): também mostra o tipo de frete. ✅
5. **Motorista com caminhão cadastrado e transportadora**: card mostra ícone de caminhão + nome da transportadora abaixo do telefone. ✅
6. **Motorista sem caminhão vinculado**: card só mostra telefone, sem transportadora (sem linha extra vazia). ✅
7. **Usuário troca nome do motorista**: card de transportadora some junto. ✅

### Fora do escopo

- Não mexo no banco (`tipo_frete` já existe).
- Não mexo na visualização da tabela do Consolidado nem no Kanban.
- Não mexo no `CaminhaoAutocomplete` (a carrier já aparece no auto-fill do input de Transportadora do form).
- Não altero o relatório consolidado A4 (`ConsolidadoPrintDialog`) — já mostra `tipoFrete` em sua tabela.

### Resultado

O romaneio impresso passa a indicar claramente se a carga é CIF, FOB ou mista, evitando que o motorista/conferente precise olhar nota a nota. E ao fechar uma carga, o operador vê de imediato a transportadora vinculada ao motorista logo abaixo do nome — sem precisar conferir o input de transportadora separadamente.
