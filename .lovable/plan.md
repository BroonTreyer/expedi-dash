

# Remover Scroll Fixo da Lista de Veículos Esperados

## Problema

A tabela desktop tem `max-h-[250px]` e os cards mobile têm `max-h-[300px]`, criando barras de rolagem internas e deixando um grande espaço vazio abaixo. Como o conteúdo já está em uma aba dedicada, não precisa de scroll próprio — pode crescer naturalmente com a página.

## Solução

Remover `max-h-[250px]` e `overflow-auto` do container desktop, e `max-h-[300px]` do container mobile. A lista cresce livremente e o scroll fica na página principal (já gerenciado pelo Layout).

## Arquivo

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/VeiculosEsperadosPanel.tsx` | Remover `max-h-[250px] overflow-auto` (desktop) e `max-h-[300px] overflow-auto` (mobile) |

