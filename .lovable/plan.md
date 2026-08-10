# Corrigir veículos esperados do Varejo

## Diagnóstico confirmado

A importação foi concluída e os 16 veículos estão no banco. Porém, o leitor classificou 14 linhas como `INTERIOR` porque encontrou nomes de transportadoras na última coluna; somente 2 ficaram como `PRÓPRIA`.

A tela **Portaria — Varejo** aplica o filtro exato `grupo === "PRÓPRIA"`. Portanto, os 14 registros classificados como `INTERIOR` foram salvos, mas ficam invisíveis em Esperados do Varejo.

## Ajuste

1. Corrigir os registros desta importação para que os 16 veículos pertençam ao grupo `PRÓPRIA` e apareçam em Esperados do Varejo, preservando motorista, placa, carga, rota e transportadora/ajudantes.
2. Fazer a importação respeitar a seção de origem: ao importar pela tela do Varejo, todas as linhas serão gravadas como `PRÓPRIA`, mesmo quando houver transportadora preenchida na planilha.
3. Manter a leitura da transportadora como informação do veículo, sem usá-la para redirecionar o registro para Distribuidores.
4. Invalidar/atualizar a consulta após a importação e validar que os 16 motoristas aparecem como pendentes na aba Esperados do Varejo.

## Detalhes técnicos

- Ajustar `ImportarPlanilhaDialog`/fluxo de confirmação em `Portaria` para receber o grupo da página e aplicá-lo explicitamente às linhas importadas.
- Corrigir no banco somente o lote recém-importado em 10/08/2026 que foi classificado incorretamente como `INTERIOR`.
- Não alterar o fluxo nem os registros de Distribuidores fora desse lote.