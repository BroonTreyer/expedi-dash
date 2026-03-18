

# Melhorias no Histórico e Detalhes da Portaria

## Mudanças

### 1. `HistoricoTab.tsx` — Centralizar dados na tabela
- Adicionar `text-center` nos `TableHead` e `TableCell` das colunas Tipo, Categoria, Placa, Motorista, Empresa, Setor
- Manter Hora alinhado à esquerda e Ações à direita
- Renomear "Saída" para "Retorno" nos badges da tabela e cards mobile

### 2. `MovimentoDetailsDialog.tsx` — Melhorias nos detalhes
- **Tempo de permanência**: Calcular diferença entre `m.data_hora` (entrada) e `s.data_hora` (saída), exibir como "Xh Xmin" na seção de horários
- **Numero da etiqueta/lacre**: Adicionar `DetailRow` para `numero_lacre` na seção de info básica (campo já existe no tipo `MovimentacaoPortaria`)
- **Renomear "Saída" para "Retorno"**: No badge, nos horários e nos labels de fotos
- **Conferente**: Já aparece na seção Controle; garantir que apareça também na info básica junto com Motorista
- **Motorista**: Já aparece; mover para posição mais destacada

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/portaria/HistoricoTab.tsx` | Centralizar colunas, renomear Saída→Retorno |
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Tempo de permanência, lacre, renomear Saída→Retorno, conferente visível |

