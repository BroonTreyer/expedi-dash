

# Exportar Excel da Roteirização (formato do print 1)

## O que será feito
Adicionar um botão "Exportar Excel" na tela de Roteirização que gera uma planilha no formato da imagem enviada, com colunas: ordem, código cliente, nome, cidade, UF, peso, vendedor.

## Mudanças

### Arquivo: `src/components/dashboard/RoteirizacaoDialog.tsx`

1. Importar `* as XLSX from "xlsx"` e o ícone `FileSpreadsheet` do lucide-react

2. Criar função `handleExportExcel` que:
   - Percorre os `groups` ativos na ordem atual
   - Para cada grupo, busca o vendedor dos `items` originais (prop `items`) cruzando pelo `codigoCliente`
   - Monta array de linhas: `[ordem, codigo_cliente, nome_cliente, cidade, uf, peso_total, vendedor]`
   - Adiciona linha de total no final (soma do peso)
   - Gera workbook com `XLSX.utils.aoa_to_sheet`, aplica larguras de coluna
   - Faz download como `.xlsx`

3. Adicionar botão "Exportar" ao lado do botão "Roteirizar" na barra de resumo (summary bar), usando ícone `FileSpreadsheet`

### Lógica de vendedor
- O `RotaGroup` não tem vendedor, mas os `items` originais (prop `items: Carregamento[]`) têm `vendedores?.nome_vendedor`
- Para cada grupo, busca nos items originais pelo `codigo_cliente` e pega o primeiro vendedor encontrado
- Se houver mais de um vendedor por cliente, lista todos separados por vírgula

### Formato da planilha
```text
| #  | CÓDIGO | NOME                    | CIDADE            | UF | PESO    | VENDEDOR |
|----|--------|-------------------------|-------------------|----|---------|----------|
| 1º | 33628  | M LIMA ALMEIDA          | JEQUIE            | BA | 2832    | EDIVAR   |
| 2º | 21759  | FRIGO IRMAOS VAZ        | JAGUAQUARA        | BA | 1800    | EDIVAR   |
...
|    |        |                         |                   |    | TOTAL   |          |
```

## Arquivo afetado
- `src/components/dashboard/RoteirizacaoDialog.tsx`

