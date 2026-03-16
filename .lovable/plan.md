

# Corrigir peso dos fatiados e adicionar Mussarela

## Situação atual
- **Fatiados** (Apresuntado, Mortadela Defumada, Presunto): cadastrados como `10×180g = 1,8 kg` — deveria ser `22×180g = 3,96 kg`
- **Mussarela**: não existe no cadastro — precisa ser criada com `42×150g = 6,3 kg`

## Alterações

### 1. Atualizar peso_padrao dos 3 fatiados
Update nos produtos:
- `APRESUNTADO FATIADO 180G` → nome: `22x180g`, peso_padrao: `3.96`
- `MORTADELA DEFUMADA FATIADA 180G` → nome: `22x180g`, peso_padrao: `3.96`
- `PRESUNTO FATIADO 180G` → nome: `22x180g`, peso_padrao: `3.96`

### 2. Criar produto Mussarela
Inserir novo produto com `42×150g = 6,3 kg` de peso padrão. Será necessário definir um código de produto para a mussarela.

### Pergunta pendente
- Qual o **código do produto** da Mussarela? (ex: 755, 760, etc.)
- O nome completo seria algo como `MUSSARELA FATIADA 150G 42x150g`?

