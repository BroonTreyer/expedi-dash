# Carga de distribuidores caindo na portaria do Varejo

## Causa confirmada

A carga **EDIVAR ROTA** (`CG-20260807-143358-63I`, placa RBX3J69) foi fechada com o campo **Transportadora em branco** — o caminhão RBX3J69 também não tem transportadora no cadastro, então nada foi preenchido automaticamente.

Na portaria, o painel "Cargas fechadas aguardando veículo" decide o lado assim:

```text
sem transportadora  -> Varejo (frota própria)
com transportadora  -> Distribuidores (terceirizado)
```

Como a carga ficou sem transportadora, ela apareceu no Varejo. Não é bug de sincronização: é falta de validação no fechamento (hoje 75 pedidos dos últimos 30 dias estão sem transportadora preenchida).

## Correção

**1. Exigir transportadora no fechamento (principal)**
- No diálogo de fechamento de carga, Transportadora passa a ser campo obrigatório.
- Exceção explícita: um marcador "Frota própria (Varejo)". Só com esse marcador ativo o fechamento é permitido sem transportadora — e a carga vai intencionalmente para o Varejo.
- Sem transportadora e sem o marcador, o botão de fechar fica bloqueado com mensagem clara ("Informe a transportadora ou marque Frota própria").
- Mesma regra no diálogo de Editar carga, para que uma edição não apague a transportadora e jogue a carga para o outro lado.

**2. Correção pontual da carga atual**
- Preencher a transportadora da carga EDIVAR ROTA para ela sair do Varejo e aparecer em Distribuidores. Preciso do nome da transportadora dessa viagem (ou confirmação de que é frota própria).

**3. Ajuste de dados de apoio**
- Cadastrar a transportadora na placa RBX3J69 (cadastro de Caminhões) para o preenchimento automático funcionar nos próximos fechamentos.

## Detalhes técnicos

- `src/components/dashboard/FechamentoLoteDialog.tsx`: validação de `transportadora` no submit + checkbox "Frota própria (Varejo)".
- `src/components/dashboard/EditarCargaDialog.tsx`: mesma validação ao salvar.
- Nenhuma mudança de schema; a classificação continua sendo `transportadora` vazia = Varejo, agora garantida por validação na entrada.
