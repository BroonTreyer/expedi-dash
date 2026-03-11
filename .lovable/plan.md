

# Preparar o Sistema para 30+ Usuários Simultâneos

## Problema
Atualmente o sistema usa polling manual (React Query com staleTime padrão). Quando 30+ usuários estão trabalhando, um vendedor cria um pedido mas a logística só vê quando recarrega. Mudanças de status podem conflitar.

## Solução

### 1. Realtime com Supabase
Ativar realtime na tabela `carregamentos_dia` para que todas as alterações (INSERT, UPDATE, DELETE) sejam propagadas instantaneamente para todos os usuários conectados.

- Migração SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE public.carregamentos_dia`
- Hook `useCarregamentos`: adicionar subscription ao canal realtime que invalida o cache do React Query quando recebe eventos de mudança
- Resultado: vendedora cria pedido -> logística vê aparecer em tempo real

### 2. Otimização do React Query
- Configurar `refetchInterval: 30000` como fallback (caso websocket desconecte)
- `staleTime: 5000` para evitar refetches desnecessários em navegação
- Manter `invalidateQueries` nos mutations para feedback imediato do próprio usuário

### 3. Indicador de Conexão Realtime
- Pequeno indicador visual (dot verde/vermelho) no header mostrando se o usuário está conectado ao realtime
- Feedback visual quando dados são atualizados por outro usuário (flash sutil na linha alterada)

### 4. Políticas RLS - Correção
As políticas atuais estão como `RESTRICTIVE` (Permissive: No). Isso bloqueia acesso quando há mais de uma política. Preciso recriar como PERMISSIVE para garantir funcionamento correto.

---

### Detalhes Técnicos
- O hook `useCarregamentos` receberá um `useEffect` com `supabase.channel('carregamentos').on('postgres_changes', ...)` que chama `queryClient.invalidateQueries`
- Cleanup do canal no unmount do componente
- Migração SQL para habilitar realtime e corrigir RLS policies para PERMISSIVE

