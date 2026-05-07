Hipótese nova: a linha azul some porque a UI apaga `routeGeometry` ao reordenar, mas não recalcula automaticamente; além disso, o cache da função `roteirizar` usa uma chave que ordena os destinos alfabeticamente, então uma rota reordenada manualmente pode receber geometria antiga ou vazia do cache. O erro “Failed to get database function names” é de metadados internos do Lovable Cloud/editor, não da rota em si — confirmei que uma query simples no banco respondeu e que a função `roteirizar` está executando, mas precisamos evitar depender dessa leitura de metadados enquanto corrigimos.

Plano de correção:

1. Corrigir a função de roteirização para recalcular por ordem atual
   - Alterar `supabase/functions/roteirizar/index.ts` para que a chave de cache preserve a sequência dos destinos recebidos, em vez de ordenar cidades antes de montar o `cache_key`.
   - Isso evita que uma rota manualmente reordenada reutilize o traçado da ordem antiga.
   - Manter o cache seguro e estável, mas sensível à ordem: mesma lista em ordem diferente = geometria diferente.

2. Garantir linha azul sempre presente na tela de Roteirização
   - Em `RoteirizacaoDialog.tsx`, remover a lógica que simplesmente limpa `routeGeometry` ao arrastar, subir/descer, digitar ordem ou aplicar template.
   - Substituir por uma rotina de “recalcular rota manual” que:
     - mantém a última linha azul visível enquanto a nova rota é calculada;
     - chama a função `roteirizar` com a ordem atual;
     - atualiza `routeGeometry`, `distanciaTotal`, `trechos`, `coordsCache` e indicadores assim que a resposta chegar;
     - ignora respostas antigas se o usuário reordenar várias vezes rapidamente.
   - Debounce curto para não chamar a função em excesso durante alterações rápidas.

3. Corrigir a tela de Fechar Carga
   - Em `FechamentoLoteDialog.tsx`, criar estado local para geometria, distância, trechos e cache de coordenadas, inicializado com a roteirização recebida.
   - Ao reordenar destinos no fechamento, recalcular automaticamente a rota com a nova ordem.
   - Passar a geometria local recalculada para `RotaMap`, não apenas `roteirizacao?.routeGeometry`, para que a linha azul acompanhe a ordem final antes de gravar a carga.
   - Ao salvar histórico da rota executada, usar a distância/custo/duração recalculados localmente quando houver reordenação na tela de fechamento.

4. Melhorar fallback visual do mapa
   - Em `RotaMap.tsx`, quando a geometria real ainda estiver carregando ou vier vazia, desenhar temporariamente uma linha conectando origem + destinos geocodados em ordem.
   - Assim o mapa nunca fica sem percurso: usa traçado real quando disponível; usa linha provisória/estimada apenas enquanto recalcula ou se o provedor externo falhar.
   - Exibir estado claro de “Recalculando trajeto...” sem remover o traçado anterior.

5. Tratar o erro interno recorrente sem pedir ação manual
   - Não depender da listagem de funções do banco para esta correção.
   - Usar leitura direta do banco e logs da função para validar funcionamento.
   - Se a ferramenta de metadados do Lovable Cloud continuar falhando, a correção de rota será feita via arquivos e deploy direto da função `roteirizar`, sem exigir que você abra painel externo ou rode SQL.

6. Validação após implementar
   - Testar a função `roteirizar` com duas ordens diferentes dos mesmos destinos e confirmar que retorna geometrias/trechos coerentes para cada ordem.
   - Abrir a tela de Roteirização, mudar ordem por botões/drag/input/template e confirmar que a linha azul permanece ou recalcula.
   - Avançar para Fechar Carga, reordenar novamente e confirmar que a linha azul também permanece/recalcula nessa etapa.
   - Conferir console e rede para garantir que não há erro 500/loop de chamadas.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>