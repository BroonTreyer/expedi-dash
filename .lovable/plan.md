

# Formulário de Portaria por Categoria

## Resumo
Reestruturar completamente o formulário de registro de movimentação da portaria para que cada categoria (Carga Própria, Terceirizado, Fornecedor, Prestador, Visitante, Outros) tenha seu próprio conjunto de campos, organizados em blocos visuais. Requer migração de banco de dados para novos campos e reescrita do componente `RegistroMovimentoDialog`.

---

## 1. Migração de Banco de Dados

A tabela `movimentacoes_portaria` precisa de novos campos para suportar todas as categorias. Adicionar colunas nullable (todos opcionais no DB, a obrigatoriedade é controlada pelo frontend):

```sql
ALTER TABLE movimentacoes_portaria
  ADD COLUMN tipo_operacao text,           -- entrega, coleta, visita, manutenção, etc.
  ADD COLUMN documento text,               -- CPF/RG/CNH do motorista/visitante
  ADD COLUMN nome_completo text,           -- para visitante/prestador/outros
  ADD COLUMN rota text,                    -- rota (carga própria)
  ADD COLUMN peso numeric,                 -- peso (carga própria)
  ADD COLUMN qtd_entregas integer,         -- quantidade de entregas (carga própria)
  ADD COLUMN km_rota numeric,              -- KM da rota planejada
  ADD COLUMN km_inicial numeric,           -- KM saída
  ADD COLUMN km_final numeric,             -- KM retorno
  ADD COLUMN km_rodado numeric,            -- calculado: km_final - km_inicial
  ADD COLUMN horario_previsto_saida timestamptz,
  ADD COLUMN horario_real_saida timestamptz,
  ADD COLUMN horario_real_retorno timestamptz,
  ADD COLUMN apelido text,                 -- apelido do veículo (carga própria)
  ADD COLUMN conferente text,              -- conferente (carga própria)
  ADD COLUMN ocorrencia text,              -- ocorrência (carga própria)
  ADD COLUMN nota_fiscal text,             -- NF (fornecedor/terceirizado)
  ADD COLUMN servico_executar text,        -- serviço (prestador)
  ADD COLUMN responsavel_interno text,     -- quem autorizou/recebeu
  ADD COLUMN pessoa_visitada text,         -- quem vai visitar (visitante)
  ADD COLUMN motivo_visita text,           -- motivo (visitante)
  ADD COLUMN telefone text,               -- telefone (visitante)
  ADD COLUMN descricao text,              -- descrição (outros)
  ADD COLUMN tipo_carga text,             -- tipo de carga (fornecedor)
  ADD COLUMN doca_setor text,             -- doca/setor destino (fornecedor)
  ADD COLUMN foto_painel_url text,        -- foto do painel/KM
  ADD COLUMN foto_nota_url text;          -- foto da NF
```

Atualizar categorias no hook para incluir "terceirizado":
```
carga_propria, terceirizado, fornecedor, visitante, prestador, outros
```

---

## 2. Matriz de Campos por Categoria

```text
Campo                 | Carga Própria | Terceirizado | Fornecedor | Visitante | Prestador | Outros
----------------------|---------------|--------------|------------|-----------|-----------|-------
placa                 | obrigatório   | obrigatório  | obrigatório| opcional  | obrigatório| opcional
motorista             | obrigatório   | obrigatório  | obrigatório| oculto    | oculto    | oculto
nome_completo         | oculto        | oculto       | oculto     | obrigatório| obrigatório| obrigatório
documento             | opcional      | obrigatório  | obrigatório| obrigatório| obrigatório| obrigatório
empresa               | oculto        | obrigatório  | obrigatório| opcional  | obrigatório| opcional
apelido               | opcional      | oculto       | oculto     | oculto    | oculto    | oculto
rota                  | obrigatório   | oculto       | oculto     | oculto    | oculto    | oculto
peso                  | obrigatório   | oculto       | oculto     | oculto    | oculto    | oculto
qtd_entregas          | obrigatório   | oculto       | oculto     | oculto    | oculto    | oculto
km_rota               | obrigatório   | oculto       | oculto     | oculto    | oculto    | oculto
km_inicial            | obrigatório   | oculto       | oculto     | oculto    | oculto    | oculto
km_final              | obrigatório   | oculto       | oculto     | oculto    | oculto    | oculto
tipo_operacao         | opcional      | obrigatório  | opcional   | oculto    | oculto    | oculto
tipo_carga            | oculto        | oculto       | obrigatório| oculto    | oculto    | oculto
nota_fiscal           | oculto        | opcional     | obrigatório| oculto    | oculto    | oculto
servico_executar      | oculto        | oculto       | oculto     | oculto    | obrigatório| oculto
pessoa_visitada       | oculto        | oculto       | oculto     | obrigatório| oculto   | oculto
motivo_visita         | oculto        | oculto       | oculto     | obrigatório| oculto   | oculto
responsavel_interno   | oculto        | opcional     | oculto     | oculto    | obrigatório| oculto
descricao             | oculto        | oculto       | oculto     | oculto    | oculto    | obrigatório
foto_placa            | obrigatório   | obrigatório  | opcional   | oculto    | opcional  | opcional
foto_documento        | opcional      | opcional     | opcional   | opcional  | opcional  | opcional
foto_painel           | obrigatório   | oculto       | oculto     | oculto    | oculto    | oculto
foto_nota             | oculto        | oculto       | opcional   | oculto    | oculto    | oculto
observacoes           | opcional      | opcional     | opcional   | opcional  | opcional  | obrigatório
```

---

## 3. Arquitetura do Formulário

### Fluxo UX
1. **Etapa 1**: Seleção de categoria (botões grandes com ícones, tipo card)
2. **Etapa 2**: Formulário específico com título claro ("Cadastro de Carga Própria", etc.)

### Organização em Blocos (aparecem condicionalmente)
- **Bloco Identificação**: categoria, tipo_operacao, nome/empresa, documento
- **Bloco Veículo**: placa, motorista, apelido, foto_placa
- **Bloco Operação**: rota, peso, entregas, KM, serviço/visita/NF
- **Bloco Controle de Acesso**: horários, responsável interno, observação
- **Bloco Evidências**: fotos (placa, documento, painel, NF)

### Componentes
- Criar `src/lib/portaria-fields-config.ts` — matriz de configuração de campos por categoria (tipo, obrigatório/opcional/oculto, label, placeholder)
- Refatorar `RegistroMovimentoDialog.tsx` — usar a config para renderizar campos dinamicamente por bloco
- Atualizar `useMovimentacoesPortaria.ts` — nova interface, novas categorias, novos campos no insert
- Atualizar `EntradaExpressForm.tsx` — adicionar "terceirizado" às categorias

### Validação
- Validação client-side baseada na matriz: campos obrigatórios precisam estar preenchidos antes de habilitar o botão "Registrar"
- Campo "Outros" exige observação obrigatória (justificativa)
- Carga Própria calcula `km_rodado = km_final - km_inicial` automaticamente

---

## 4. Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Adicionar ~20 colunas à tabela |
| `src/lib/portaria-fields-config.ts` | **Novo** — config matrix de campos por categoria |
| `src/hooks/useMovimentacoesPortaria.ts` | Atualizar interface, categorias, campos do insert |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Reescrever com seleção de categoria + formulário dinâmico por blocos |
| `src/components/portaria/EntradaExpressForm.tsx` | Adicionar categoria "terceirizado" |
| `src/components/portaria/HistoricoTab.tsx` | Adicionar cor para badge "terceirizado" |
| `src/components/portaria/PatioAtualTab.tsx` | Adicionar cor para badge "terceirizado" |

