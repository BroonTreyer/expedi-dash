

# Integração Rota Livre — Importar Dados de Roteirização

## APIs Identificadas na Documentação

A partir das imagens enviadas, identifiquei **3 APIs** do Rota Livre:

| API | Método | URL | Uso |
|-----|--------|-----|-----|
| **Manifesto** | GET | `api.rotalivre.com.br/manifest/get_manifest/{DataInicial}/{DataFinal}` | Puxar rotas, motorista, placa, paradas |
| **Status de Entrega** | GET | `api.rotalivre.com.br/outbound/get_status/{DataInicio}/{DataFim}` | Puxar ocorrências, NF, CT-e, comprovantes |
| **Solicitação de Entregas** | POST | `api.rotalivre.com.br/inbound/input_service` | Enviar entregas para roteirizar (futuro) |

Todas usam **Bearer Token** no header `Authorization`.

## Dados Retornados pelo Manifesto (principal para a Portaria)

```text
routing_code    → Identificador da rota no Rota Livre
route_name      → Nome/apelido da rota
driver_document → CPF do motorista
driver_name     → Nome do motorista
license_plate   → Placa do veículo
corporation_code→ Base/filial
routing_services[] → Lista de paradas:
  ├── order_number  → ID único da entrega
  ├── service_id    → Número de controle
  ├── lat / long    → Coordenadas
  └── position      → Ordem na rota
```

## Mapeamento para o Sistema Atual

Os dados do manifesto se encaixam diretamente na tabela `carregamentos_dia`:

| Rota Livre | carregamentos_dia |
|---|---|
| `routing_code` | `carga_id` |
| `license_plate` | `placa` |
| `driver_name` | `motorista` |
| `route_name` | pode ir em `observacoes` ou novo campo |
| `routing_services[].order_number` | vinculação com pedidos existentes |
| `routing_services[].position` | `ordem_entrega` |

## Plano de Implementação

### 1. Armazenar o token da API de forma segura
Usar o mecanismo de secrets para guardar o `ROTA_LIVRE_API_TOKEN`. O token nunca ficará no frontend.

### 2. Criar Edge Function `rota-livre-sync`
Uma backend function que:
- Recebe data inicial e data final do frontend
- Chama `GET https://api.rotalivre.com.br/manifest/get_manifest/{dataInicial}/{dataFinal}` com o Bearer Token
- Retorna os dados para o frontend processar, ou opcionalmente já faz upsert direto na tabela `carregamentos_dia`

### 3. Criar tabela `rota_livre_manifestos` (opcional mas recomendada)
Armazenar o JSON bruto do Rota Livre para histórico e auditoria, separado dos carregamentos.

### 4. Criar página/botão de importação
Na tela da Portaria (ou em uma aba dedicada), adicionar:
- Seletor de período (data inicial e final, formato YYYY-MM-DD)
- Botão "Importar do Rota Livre"
- Preview dos dados recebidos antes de confirmar a importação
- Mapeamento automático: preenche `carga_id`, `placa`, `motorista`, `ordem_entrega` nos carregamentos

### 5. (Fase 2) Status de Entrega
Futuramente, usar a API `outbound/get_status` para puxar ocorrências e comprovantes de entrega de volta para o sistema.

## Arquivos a Criar/Alterar

| Arquivo | Ação |
|---------|------|
| Secret `ROTA_LIVRE_API_TOKEN` | Solicitar ao usuário |
| `supabase/functions/rota-livre-sync/index.ts` | Nova edge function |
| `supabase/config.toml` | Registrar a function |
| Migration SQL | Tabela `rota_livre_manifestos` (histórico) |
| `src/hooks/useRotaLivre.ts` | Hook para chamar a edge function |
| `src/pages/Portaria.tsx` ou nova página | UI de importação |

## Pré-requisito

Antes de implementar, preciso que você forneça o **token de acesso** da API do Rota Livre (aquele Bearer Token que foi enviado por e-mail pelo Rota Livre). Ele será armazenado de forma segura no backend.

