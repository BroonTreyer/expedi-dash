import {
  BookOpen, Users, Workflow, Code2, FolderTree, Database, ShieldCheck, Radio,
  ShoppingCart, Truck, DoorOpen, Monitor, AlertTriangle, BarChart3, FolderCog,
  Plug, Save, Wrench, Rocket, LifeBuoy, GraduationCap,
} from "lucide-react";
import type { Capitulo } from "./types";
import { P, H, UL, OL, LI, C, Pre, Quote, Warn, Tip, Tab } from "@/components/manual/MdxBlocks";

/* --------------------------------------------------------------------------
 * Manual Técnico — FricoTrack
 * Cada capítulo tem três blocos:
 *   • leigo  → "Para entender" (qualquer pessoa entende)
 *   • dev    → "Para o desenvolvedor" (arquivos, tabelas, fluxos)
 *   • atencao→ Pontos de atenção (regras a NÃO quebrar)
 * Edite livremente — é só JSX, sem build extra.
 * -------------------------------------------------------------------------- */

export const CAPITULOS: Capitulo[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "visao-geral",
    numero: 1,
    titulo: "Visão geral — o que é o FricoTrack",
    resumo: "O sistema, para que ele serve, e quem ganha o quê com ele.",
    icone: BookOpen,
    leigo: (
      <>
        <P>
          O <strong>FricoTrack</strong> é o sistema interno que controla o caminho de um pedido
          desde o momento em que o vendedor anota a venda até o caminhão sair do pátio com a
          mercadoria. Pense nele como um <strong>caderno digital gigante e compartilhado</strong>:
          todo mundo da empresa que precisa saber o que está acontecendo na expedição olha pro
          mesmo caderno, ao mesmo tempo, e cada um vê só o que importa pra ele.
        </P>
        <Quote>
          Antes do sistema, era planilha + WhatsApp + papel + ligação. Agora é uma tela só, que
          atualiza sozinha quando alguém em outro setor mexe em algo.
        </Quote>
        <H>O que ele resolve, em uma frase</H>
        <P>
          Garantir que <strong>nenhum pedido se perca</strong>, que <strong>todo mundo veja a
          mesma versão da verdade em tempo real</strong>, e que dê pra <strong>provar</strong>{" "}
          o que aconteceu (quem fez, quando, por quê).
        </P>
        <H>O que ele controla</H>
        <UL>
          <LI>Pedidos do dia (vindos de vendedores, planilha ou PDF do ERP).</LI>
          <LI>Cargas — agrupar pedidos em um caminhão, definir rota, peso, motorista.</LI>
          <LI>Portaria — chegada e saída de veículos, com foto, KM, lacre.</LI>
          <LI>Rupturas — produtos que faltaram pra entregar.</LI>
          <LI>Indicadores — quanto saiu, quanto faltou, quem performou.</LI>
        </UL>
      </>
    ),
    dev: (
      <>
        <P>
          Aplicação web SPA (single page app) escrita em <C>React 18 + TypeScript</C>, hospedada
          como PWA e plugada num backend Supabase (Postgres + Auth + Storage + Realtime + Edge
          Functions). Não há servidor próprio: todo o backend é serverless gerenciado.
        </P>
        <H>Domínio (modelo mental)</H>
        <UL>
          <LI>
            <strong>Pedido</strong> = uma linha em <C>carregamentos_dia</C>. Um pedido pode ter
            vários produtos → vira várias linhas com o mesmo <C>numero_pedido</C>.
          </LI>
          <LI>
            <strong>Carga</strong> = agrupamento de pedidos identificado por <C>carga_id</C> (string).
            Não tem tabela própria — é um campo em <C>carregamentos_dia</C>.
          </LI>
          <LI>
            <strong>Movimento de portaria</strong> = uma linha em <C>movimentacoes_portaria</C>{" "}
            (entrada / saída do pátio).
          </LI>
          <LI>
            <strong>Etapa</strong> = onde o pedido está no fluxo (<C>rascunho</C>,{" "}
            <C>aguardando_faturamento</C>, <C>vendas</C>, <C>logistica</C>).
          </LI>
        </UL>
        <H>Pontos de entrada</H>
        <UL>
          <LI><C>src/main.tsx</C> → bootstrap React.</LI>
          <LI><C>src/App.tsx</C> → providers (QueryClient, Router, Tooltip, Auth) + rotas.</LI>
          <LI><C>src/components/Layout.tsx</C> → casca com sidebar + topo.</LI>
        </UL>
      </>
    ),
    atencao: (
      <Warn>
        Não existe "tabela cargas". Toda lógica de carga é derivada agrupando linhas de{" "}
        <C>carregamentos_dia</C> por <C>carga_id</C>. Isso é proposital — facilita reagrupar /
        desfazer cargas sem cascata.
      </Warn>
    ),
    buscaTexto: "visao geral fricotrack o que e sistema interno expedição PWA Supabase domínio carga pedido etapa",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "perfis",
    numero: 2,
    titulo: "Quem usa — perfis e o que cada um faz",
    resumo: "Admin, Logística, Faturamento, Portaria, Vendedor.",
    icone: Users,
    leigo: (
      <>
        <P>
          O sistema tem <strong>cinco perfis</strong> (cinco tipos de usuário). Cada perfil só
          enxerga as telas que precisa, e só pode mexer no que lhe diz respeito.
        </P>
        <Tab
          headers={["Perfil", "O que faz no dia a dia"]}
          rows={[
            ["Admin", "Dono / TI. Vê tudo, configura tudo, cria usuários, restaura backup."],
            ["Logística", "Monta cargas, fecha rotas, acompanha motoristas, edita pedidos."],
            ["Faturamento", "Aprova pedidos do vendedor, edita preços, gera relatórios."],
            ["Portaria (guarita)", "Registra entrada/saída de caminhão, tira foto da placa, libera saída."],
            ["Vendedor", "Lança pedidos novos, vê só os pedidos dele, acompanha rupturas dele."],
          ]}
        />
        <Quote>
          Pense como um banco: o caixa não vê tudo o que o gerente vê. O gerente não mexe no
          servidor. Cada um tem sua "chave" pra entrar nas portas certas.
        </Quote>
      </>
    ),
    dev: (
      <>
        <P>
          Roles vivem em <C>user_roles (user_id, role)</C> e o enum é <C>app_role</C>:{" "}
          <C>admin</C>, <C>logistica</C>, <C>faturamento</C>, <C>portaria</C>, <C>vendedor</C>.
          Toda RLS usa a função <C>has_role(auth.uid(), 'role')</C>.
        </P>
        <H>Front-end</H>
        <UL>
          <LI><C>useAuth()</C> em <C>src/hooks/useAuth.ts</C> expõe <C>{`{ user, role, signOut, ... }`}</C>.</LI>
          <LI><C>{`<ProtectedRoute allowedRoles={[...]}>`}</C> em <C>src/components/ProtectedRoute.tsx</C> filtra rota por papel.</LI>
          <LI><C>{`<SuperAdminRoute>`}</C> usa <C>useSuperAdmin()</C> (lista hard-coded de e-mails em <C>src/lib/super-admins.ts</C>) — mais restritivo que admin comum.</LI>
        </UL>
        <H>Vendedor — caso especial</H>
        <P>
          Um usuário <C>vendedor</C> é ligado a uma linha em <C>vendedores</C> via{" "}
          <C>vendedor_users (user_id ↔ vendedor_id)</C>. A função <C>get_my_vendedor_id()</C>{" "}
          é usada nas RLS de <C>carregamentos_dia</C> pra ele só ver/editar os <em>próprios</em>{" "}
          rascunhos.
        </P>
      </>
    ),
    atencao: (
      <Warn>
        <strong>Nunca</strong> guarde o role no <C>profiles</C> ou em <C>localStorage</C> — só em{" "}
        <C>user_roles</C>, validado server-side via RLS. Mudar isso abre brecha de escalada de
        privilégio.
      </Warn>
    ),
    buscaTexto: "perfis roles admin logistica faturamento portaria vendedor user_roles has_role ProtectedRoute SuperAdminRoute permissões",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "fluxo",
    numero: 3,
    titulo: "O fluxo do pedido — da venda à saída do caminhão",
    resumo: "O caminho completo, passo a passo.",
    icone: Workflow,
    leigo: (
      <>
        <P>O pedido nasce, cresce e morre passando por estações, igual a uma linha de produção:</P>
        <Pre>{`Vendedor lança ──► Faturamento aprova ──► Vai pro Painel (Vendas)
        │                              │
        │                              ▼
        │                       Logística monta CARGA
        │                       (escolhe pedidos + caminhão + rota)
        │                              │
        │                              ▼
        │                    Carga "fechada" → vai pra Portaria
        │                              │
        │                              ▼
        │                  Portaria registra CHEGADA do caminhão,
        │                  carrega, registra SAÍDA com foto/lacre/KM
        │                              │
        ▼                              ▼
 Vê seus pedidos              Caminhão sai → Painel mostra "Carregado"`}</Pre>
        <P>Em paralelo, se faltar algum produto na hora de carregar, vira <strong>ruptura</strong> e cai num painel separado pra cobrança/recompra.</P>
      </>
    ),
    dev: (
      <>
        <H>Etapas (campo <C>etapa</C> em <C>carregamentos_dia</C>)</H>
        <Tab
          headers={["etapa", "Significado", "Quem altera"]}
          rows={[
            [<C>rascunho</C>, "Vendedor digitando, ainda não enviou", "vendedor (RLS)"],
            [<C>aguardando_faturamento</C>, "Vendedor enviou, faturamento ainda não aprovou", "vendedor cria, faturamento aprova"],
            [<C>vendas</C>, "Aprovado, disponível pro painel principal pra entrar em uma carga", "faturamento, logistica, admin"],
            [<C>logistica</C>, "Já está em uma carga (carga_id setado), aguardando portaria", "logistica, admin"],
          ]}
        />
        <H>Carga "fechada"</H>
        <P>
          Não existe campo <C>fechada=true</C>. Carga é considerada fechada quando todos os itens
          dela estão em <C>etapa=logistica</C> com <C>carga_id</C> preenchido. O hook{" "}
          <C>useCargasFechadasAguardando</C> em <C>useCarregamentos.ts</C> agrupa por{" "}
          <C>carga_id</C> e cruza com <C>movimentacoes_portaria</C> pra saber se já chegou.
        </P>
        <H>Status final do item</H>
        <P>
          Campo <C>status</C> (Aguardando, Separando, Pronto, Carregando, Carregado, Problema)
          — independente da etapa, é o estado físico do produto. Cores em{" "}
          <C>--status-* </C> em <C>src/index.css</C>.
        </P>
      </>
    ),
    atencao: (
      <Warn>
        Etapa avança "para frente" — nunca volta automaticamente. Para "desfazer carga", a
        função em <C>EditarCargaDialog</C> seta <C>etapa=vendas</C> e <C>carga_id=null</C> em
        cascata via <C>useBatchUpdateCarregamento</C>.
      </Warn>
    ),
    buscaTexto: "fluxo pedido etapa rascunho aguardando_faturamento vendas logistica carga_id status carregamentos_dia",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "stack",
    numero: 4,
    titulo: "Tecnologias usadas (stack)",
    resumo: "Quais linguagens, bibliotecas, e por que cada uma.",
    icone: Code2,
    leigo: (
      <>
        <P>
          Existem <strong>três grandes blocos</strong> de tecnologia no FricoTrack — pense neles
          como os três andares de uma casa:
        </P>
        <Tab
          headers={["Andar", "O que é", "Pra que serve"]}
          rows={[
            ["1º — Telas", "React + TypeScript + Tailwind", "Tudo que o usuário vê no navegador / celular."],
            ["2º — Cérebro / Banco", "Supabase (Postgres + Auth + Storage)", "Onde os dados ficam guardados, quem entra, e onde fotos são armazenadas."],
            ["3º — Funções na nuvem", "Edge Functions (Deno/TypeScript)", "Pequenos programas que rodam quando precisamos chamar um serviço externo (ex.: ler placa de caminhão)."],
          ]}
        />
        <P>
          Tudo é hospedado pela <strong>Lovable Cloud</strong> (que por baixo usa Supabase). Não
          há servidor próprio pra cuidar — atualizações entram quando você publica pelo Lovable.
        </P>
      </>
    ),
    dev: (
      <>
        <H>Front-end</H>
        <UL>
          <LI><C>React 18</C> + <C>Vite 5</C> + <C>TypeScript 5</C>.</LI>
          <LI><C>Tailwind CSS v3</C> + design system <C>shadcn/ui</C> (Radix por baixo).</LI>
          <LI><C>react-router-dom</C> v6 — rotas + lazy loading com retry (<C>lazyWithRetry</C> em <C>App.tsx</C>).</LI>
          <LI><C>@tanstack/react-query</C> v5 — cache, refetch, optimistic updates.</LI>
          <LI><C>react-hook-form</C> + <C>zod</C> — formulários e validação.</LI>
          <LI><C>recharts</C> — gráficos do Analytics.</LI>
          <LI><C>leaflet</C> + <C>react-leaflet</C> — mapa de roteirização.</LI>
          <LI><C>xlsx</C> — import/export de planilhas.</LI>
          <LI><C>sonner</C> — toasts.</LI>
          <LI><C>vite-plugin-pwa</C> — service worker autoUpdate.</LI>
        </UL>
        <H>Backend (Lovable Cloud / Supabase)</H>
        <UL>
          <LI>Postgres com RLS habilitado em todas as tabelas.</LI>
          <LI>Auth (e-mail/senha; sem signup público).</LI>
          <LI>Storage privado (bucket <C>portaria</C> com signed URLs de 1 ano).</LI>
          <LI>Realtime (WebSocket) — broadcast de INSERT/UPDATE/DELETE.</LI>
          <LI>Edge Functions em Deno — sempre com import <C>npm:</C> (não usar <C>esm.sh</C>).</LI>
        </UL>
        <H>AI</H>
        <UL>
          <LI><C>Plate Recognizer</C> — OCR de placa (edge fn <C>ocr-portaria</C>).</LI>
          <LI><C>Lovable AI Gateway / Gemini</C> — leitura de KM e lacre, parser de PDF de pedido.</LI>
        </UL>
      </>
    ),
    atencao: (
      <Warn>
        Nunca trocar <C>npm:</C> por <C>esm.sh</C> nas edge functions — quebra deploy. Nunca
        editar <C>src/integrations/supabase/client.ts</C> nem <C>types.ts</C> (são gerados).
      </Warn>
    ),
    buscaTexto: "stack tecnologias react vite typescript tailwind shadcn supabase postgres edge functions deno react-query leaflet recharts pwa",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "pastas",
    numero: 5,
    titulo: "Como o sistema é organizado (estrutura de pastas)",
    resumo: "Onde mora cada tipo de arquivo.",
    icone: FolderTree,
    leigo: (
      <>
        <P>
          O código é organizado como uma estante: <strong>cada gaveta tem um propósito claro</strong>.
          Se você sabe o que está procurando, sabe direto em qual gaveta abrir.
        </P>
        <Pre>{`📁 src/
   📁 pages/        → uma tela = um arquivo (ex.: Rupturas.tsx)
   📁 components/   → "peças de Lego" usadas em várias telas
   📁 hooks/        → "regras" pra buscar/salvar dados (useCarregamentos…)
   📁 lib/          → utilidades soltas (formatar peso, máscaras, cores)
   📁 integrations/ → conexão com o banco (NÃO MEXER)
   📁 content/      → conteúdo estático, como este manual
   📁 assets/       → imagens, logos

📁 supabase/
   📁 functions/    → "miniprogramas" que rodam na nuvem (OCR, roteirização)
   📁 migrations/   → histórico de mudanças do banco (nunca apagar)`}</Pre>
      </>
    ),
    dev: (
      <>
        <H>Convenções</H>
        <UL>
          <LI>Páginas: PascalCase, sufixo <C>.tsx</C>, default export.</LI>
          <LI>Hooks: <C>useXxx.ts</C>, exportam função(ões) nomeada(s) — wrapper de react-query.</LI>
          <LI>Componentes shadcn em <C>components/ui/</C> — não criar novos lá; criar em <C>components/&lt;dominio&gt;/</C>.</LI>
          <LI>Aliases: <C>@/</C> aponta pra <C>src/</C> (config em <C>vite.config.ts</C> e <C>tsconfig.json</C>).</LI>
        </UL>
        <H>Componentes por domínio</H>
        <UL>
          <LI><C>components/dashboard/</C> — painel principal, KPIs, dialogs de carga.</LI>
          <LI><C>components/portaria/</C> — guarita, captura de foto, autocompletes.</LI>
          <LI><C>components/vendedor/</C> — painel do vendedor.</LI>
          <LI><C>components/expedicao/</C> — painel "TV" da expedição.</LI>
          <LI><C>components/motoristas/</C> — KPIs e ranking de motorista.</LI>
          <LI><C>components/aprovacoes/</C> — fluxo de aprovação de pedido pelo faturamento.</LI>
          <LI><C>components/manual/</C> — este manual.</LI>
        </UL>
      </>
    ),
    atencao: (
      <Warn>
        <C>src/integrations/supabase/client.ts</C> e <C>types.ts</C> são <strong>regenerados</strong>{" "}
        pelo Lovable. Qualquer edição manual é sobrescrita.
      </Warn>
    ),
    buscaTexto: "estrutura pastas src pages components hooks lib supabase functions migrations integrations alias",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "banco",
    numero: 6,
    titulo: "Banco de dados — as tabelas principais",
    resumo: "O que cada tabela guarda e por quê.",
    icone: Database,
    leigo: (
      <>
        <P>
          O "cérebro" do sistema é um banco Postgres na nuvem. Pense nele como{" "}
          <strong>uma pasta de arquivos com várias planilhas</strong> que conversam entre si.
        </P>
        <P>As planilhas mais importantes:</P>
        <Tab
          headers={["Planilha (tabela)", "O que guarda"]}
          rows={[
            ["carregamentos_dia", "Cada linha é um produto de um pedido. É a tabela central."],
            ["movimentacoes_portaria", "Cada chegada e saída de caminhão na portaria."],
            ["clientes", "Cadastro de quem compra (32 mil+ linhas)."],
            ["produtos", "Cadastro do que a empresa vende."],
            ["motoristas", "Cadastro dos motoristas (com foto)."],
            ["caminhoes", "Frota — placa, tipo, motorista vinculado."],
            ["vendedores", "Quem tira pedido."],
            ["user_roles", "Quem tem qual permissão no sistema."],
            ["audit_log", "Histórico de tudo que mudou (rastreabilidade)."],
            ["data_snapshots", "Backups completos do banco em formato JSON."],
          ]}
        />
      </>
    ),
    dev: (
      <>
        <H>carregamentos_dia (a tabela central)</H>
        <UL>
          <LI><C>id</C> uuid PK · <C>data</C> date · <C>numero_pedido</C> int.</LI>
          <LI><C>etapa</C> (rascunho/aguardando_faturamento/vendas/logistica) · <C>status</C> texto.</LI>
          <LI><C>peso</C>, <C>quantidade</C>, <C>peso_original</C>, <C>quantidade_original</C> · <C>peso_manual</C> bool.</LI>
          <LI><C>ruptura</C>, <C>motivo_ruptura</C>, <C>ruptura_sinalizada</C> (set por trigger).</LI>
          <LI><C>carga_id</C>, <C>nome_carga</C>, <C>ordem_entrega</C>, <C>placa</C>, <C>motorista</C>, <C>tipo_caminhao</C>, <C>transportadora</C>.</LI>
          <LI><C>codigo_cliente</C>, <C>cliente</C>, <C>cidade</C>, <C>uf</C>, <C>tipo_frete</C>.</LI>
          <LI><C>operation_id</C>, <C>row_op_key</C> — idempotência contra duplo clique / replay.</LI>
        </UL>
        <H>movimentacoes_portaria</H>
        <P>
          Tabela larga (~50 colunas) porque cobre vários fluxos: carga própria (saída em rota,
          retorno, lacre) e terceirizado (chegada, liberação, saída). Campo <C>tipo_movimento</C>{" "}
          (entrada/saida) + <C>etapa_carga_propria</C> / <C>etapa_terceirizado</C> diferenciam.
        </P>
        <H>Sem foreign keys "duras"</H>
        <P>
          Por velocidade e flexibilidade no Lovable, a maioria das relações é <strong>lógica</strong>{" "}
          (string matching em <C>carga_id</C>, <C>codigo_cliente</C>) e não constraints físicas.
          Validação acontece no front + RLS. Ver memória <em>database-constraints</em>.
        </P>
        <Tip>
          Esquema vivo: olhe direto em <strong>Lovable Cloud → Backend → Tabelas</strong>. Tipos
          TS estão sempre em <C>src/integrations/supabase/types.ts</C> (auto-gerado).
        </Tip>
      </>
    ),
    atencao: (
      <Warn>
        Limite default do Supabase é <strong>1000 linhas por query</strong>. Quando uma tela
        "perde dados", suspeite disso antes de procurar bug. Use range/paginação (ver
        memória <em>scaling-performance</em>: analytics limita 5000).
      </Warn>
    ),
    buscaTexto: "banco postgres tabelas carregamentos_dia movimentacoes_portaria clientes produtos motoristas caminhoes vendedores user_roles audit_log snapshots schema",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "seguranca",
    numero: 7,
    titulo: "Segurança e permissões (RLS, autenticação)",
    resumo: "Como o sistema garante que cada um só vê o que pode.",
    icone: ShieldCheck,
    leigo: (
      <>
        <P>
          A segurança é feita em <strong>duas camadas</strong>:
        </P>
        <OL>
          <LI><strong>Login (autenticação):</strong> ninguém entra sem usuário e senha. Sem cadastro público — só Admin cria.</LI>
          <LI><strong>Permissão por linha (autorização):</strong> mesmo logado, o banco filtra <em>quais linhas</em> a pessoa pode ler/editar. Vendedor só vê os pedidos dele. Portaria não vê preço.</LI>
        </OL>
        <Quote>
          É como uma agenda de papel onde cada página é blindada: você abre o livro inteiro, mas
          só consegue <em>ler</em> as páginas que dizem o seu nome.
        </Quote>
      </>
    ),
    dev: (
      <>
        <H>Autenticação</H>
        <UL>
          <LI>Supabase Auth (e-mail/senha). Signup público <strong>desabilitado</strong>.</LI>
          <LI>Admin cria usuário via edge function <C>create-user</C> (usa service role).</LI>
          <LI>Sessão persistente no <C>localStorage</C> (ver <C>client.ts</C>) com refresh automático.</LI>
          <LI>Hook <C>useAuthState</C> + <C>AuthProvider</C> (em <C>src/hooks/useAuth.ts</C>) — fonte única.</LI>
        </UL>
        <H>Autorização (RLS)</H>
        <UL>
          <LI>Toda tabela tem <C>ENABLE ROW LEVEL SECURITY</C>.</LI>
          <LI>Função SECURITY DEFINER <C>has_role(uid, role)</C> evita recursão.</LI>
          <LI>Padrão Ops = "admin OR logistica OR faturamento" pra mutações. Portaria entra em motoristas/caminhões/movimentacoes mas não em produtos/preços.</LI>
          <LI>Vendedor: políticas extras com <C>get_my_vendedor_id()</C>.</LI>
        </UL>
        <H>Camadas extras</H>
        <UL>
          <LI><C>SuperAdminRoute</C> — lista hard-coded de e-mails em <C>src/lib/super-admins.ts</C>.</LI>
          <LI>Storage <C>portaria</C> é privado — frontend pede signed URL de 1 ano.</LI>
          <LI>Edge Functions validam JWT via <C>auth.getUser()</C> antes de qualquer ação.</LI>
        </UL>
      </>
    ),
    atencao: (
      <Warn>
        <strong>Nunca</strong> coloque <C>role</C> na tabela <C>profiles</C>, em cookie ou em{" "}
        <C>localStorage</C> — só em <C>user_roles</C>. Auto-confirm de e-mail só liga sob pedido
        explícito do usuário admin.
      </Warn>
    ),
    buscaTexto: "seguranca rls autenticação autorização supabase auth has_role user_roles SECURITY DEFINER signup desabilitado super admin storage privado",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "realtime",
    numero: 8,
    titulo: "Tempo real — telas que se atualizam sozinhas",
    resumo: "Por que aparece sem dar F5.",
    icone: Radio,
    leigo: (
      <>
        <P>
          Quando alguém edita um pedido, <strong>todo mundo que estiver olhando a mesma tela vê
          a mudança em segundos</strong>, sem precisar atualizar o navegador. Isso evita conflito
          do tipo "eu já mexi nisso, vc não viu?".
        </P>
        <Quote>
          É como o Google Docs: dois cursores na mesma planilha, um vê o outro digitando.
        </Quote>
      </>
    ),
    dev: (
      <>
        <P>
          Implementado com Supabase Realtime (WebSocket sobre Postgres logical replication). O
          padrão central está em <C>useCarregamentos.ts</C>:
        </P>
        <OL>
          <LI>Inscreve em INSERT/UPDATE/DELETE de <C>carregamentos_dia</C>.</LI>
          <LI>UPDATE/DELETE → patch direto do cache do react-query (sem refetch).</LI>
          <LI>INSERT → invalida com debounce de <strong>1.5s</strong> pra evitar tempestade durante batch.</LI>
        </OL>
        <H>Outras inscrições</H>
        <UL>
          <LI><C>useNotifications</C> — sino do topo (<C>NotificationBell</C>).</LI>
          <LI><C>useRealtimeStatus</C> — indicador conectado/desconectado.</LI>
          <LI>Padrão singleton com ref counting (memória <em>realtime/subscription-management</em>) pra evitar múltiplos canais.</LI>
        </UL>
        <Tip>
          Para ligar realtime numa tabela nova:
          <Pre>{`-- migration
ALTER PUBLICATION supabase_realtime ADD TABLE public.minha_tabela;`}</Pre>
          E depois <C>supabase.channel(...).on('postgres_changes', ...)</C>.
        </Tip>
      </>
    ),
    atencao: (
      <Warn>
        Toda <C>useQuery</C> que depende de sessão deve ter <C>enabled: !!session</C> — caso
        contrário dispara antes do auth carregar e devolve 401. (memória <em>realtime-concurrency</em>)
      </Warn>
    ),
    buscaTexto: "realtime tempo real websocket postgres_changes supabase_realtime debounce 1.5s subscription singleton invalidate",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "vendas",
    numero: 9,
    titulo: "Módulo Vendas (vendedor → faturamento)",
    resumo: "Rascunho, aprovação, entrada no painel.",
    icone: ShoppingCart,
    leigo: (
      <>
        <P>
          O <strong>vendedor</strong> entra no celular ou desktop, abre <em>Meu Painel</em>,
          clica em <em>Novo Pedido</em>, escolhe cliente e produtos, e envia. O pedido cai em{" "}
          <em>Aprovações</em> do faturamento.
        </P>
        <P>
          O <strong>faturamento</strong> revisa preço, condição de pagamento e aprova. Aprovou,
          o pedido entra na esteira da Logística pra virar carga.
        </P>
        <Quote>
          Vendedor = quem faz o pedido. Faturamento = quem confere e libera. Logística = quem
          coloca no caminhão.
        </Quote>
      </>
    ),
    dev: (
      <>
        <UL>
          <LI>Páginas: <C>MeuPainel.tsx</C>, <C>VendedoresPainel.tsx</C>, <C>Aprovacoes.tsx</C>.</LI>
          <LI>Componentes: <C>components/vendedor/*</C> (NovoPedidoDialog, MeusPedidos, KpiVendedor, RupturasVendedor, NovoClienteInline).</LI>
          <LI>Hook: <C>useMeuPainel.ts</C>, <C>useAprovacoes.ts</C>, <C>useEditarPedidoAprovacao.ts</C>.</LI>
          <LI>RLS: vendedor pode <strong>ler/inserir/atualizar</strong> só onde <C>vendedor_id = get_my_vendedor_id()</C> e <C>etapa IN ('rascunho','aguardando_faturamento')</C>.</LI>
          <LI>Aprovação = mudar <C>etapa</C> de <C>aguardando_faturamento</C> para <C>vendas</C> (com possível edição em cascata, ver memória <em>order-cascading-updates</em>).</LI>
        </UL>
        <H>Cadastro inline de cliente</H>
        <P>
          Vendedor pode criar cliente novo no meio do pedido (NovoClienteInline). Há autofill
          de cidade/UF via ViaCEP (edge fn <C>enrich-clientes-viacep</C>). Validação de código
          duplicado é server-side.
        </P>
      </>
    ),
    atencao: (
      <Warn>
        Vendedor não pode mudar <C>vendedor_id</C> nem <C>etapa</C> pra <C>vendas</C>. Aprovação
        sempre roda como <C>faturamento</C>/<C>admin</C>.
      </Warn>
    ),
    buscaTexto: "vendas vendedor faturamento aprovacoes meu painel novo pedido novo cliente viacep get_my_vendedor_id rascunho",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "logistica",
    numero: 10,
    titulo: "Módulo Logística (cargas, roteirização, mapa)",
    resumo: "Como vários pedidos viram uma carga otimizada.",
    icone: Truck,
    leigo: (
      <>
        <P>
          A logística olha o <strong>Painel</strong> com todos os pedidos do dia e <strong>marca
          quais entram na próxima carga</strong>. Depois escolhe placa/motorista/tipo de caminhão,
          dá um nome pra carga, opcionalmente <strong>roteiriza</strong> (o sistema sugere a
          melhor ordem de visita pelas cidades) e <strong>fecha</strong>.
        </P>
        <P>
          Carga fechada vai pra Portaria com o nome certinho. O motorista chega, mostra o nome
          da carga, e a guarita libera.
        </P>
      </>
    ),
    dev: (
      <>
        <H>Telas e componentes</H>
        <UL>
          <LI>Página: <C>src/pages/Index.tsx</C> (Painel) + <C>Consolidado.tsx</C> (visão por carga fechada).</LI>
          <LI>Dialogs: <C>FechamentoLoteDialog</C>, <C>RoteirizacaoDialog</C>, <C>EditarCargaDialog</C>, <C>AdicionarCargaDialog</C>.</LI>
          <LI>Mapa: <C>RotaMap.tsx</C> (Leaflet + tiles OpenStreetMap).</LI>
          <LI>Hooks: <C>useCarregamentos</C>, <C>usePesoPorCarga</C>, <C>useRouteTemplates</C>.</LI>
        </UL>
        <H>Roteirização</H>
        <UL>
          <LI>Edge fn <C>roteirizar</C> — chama OpenRouteService (ORS) com fallback OSRM/Haversine.</LI>
          <LI>Cache em <C>route_cache</C> (chave <C>cache_key</C>) — economia de chamadas pagas.</LI>
          <LI>Geocodificação em <C>geocode_cache</C> (Nominatim respeitando User-Agent).</LI>
          <LI>Origem padrão: Goiânia (configurável em <C>app_settings</C>).</LI>
          <LI>2-opt + dedup por <C>cidade+uf</C>; se ORS &gt; 1.8× Haversine, cai pra Haversine.</LI>
        </UL>
        <H>Fechamento</H>
        <P>
          Itens selecionados recebem <C>carga_id</C> (gerado), <C>etapa=logistica</C>,{" "}
          <C>nome_carga</C>, <C>placa</C>, <C>motorista</C>, <C>tipo_caminhao</C>,{" "}
          <C>transportadora</C> num <C>useBatchUpdateCarregamento</C> único. Idempotência via{" "}
          <C>operation_id</C>/<C>row_op_key</C>.
        </P>
      </>
    ),
    atencao: (
      <Warn>
        Sempre passe <C>peso_manual: true</C> em saves de peso editado manualmente. Sem isso,
        triggers/recalculos sobrescrevem com peso padrão do produto. (Core memory.)
      </Warn>
    ),
    buscaTexto: "logistica painel carga fechamento roteirizacao mapa leaflet openrouteservice osrm haversine route_cache geocode origem goiania batch update carga_id",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "portaria",
    numero: 11,
    titulo: "Módulo Portaria (guarita)",
    resumo: "Frota própria vs terceirizado, OCR de placa, fotos.",
    icone: DoorOpen,
    leigo: (
      <>
        <P>
          A guarita tem <strong>duas telas separadas</strong> porque os fluxos são diferentes:
        </P>
        <Tab
          headers={["Tela", "Pra que serve"]}
          rows={[
            ["Carga Própria", "Caminhão da empresa saindo com mercadoria pra entregar."],
            ["Terceirizado", "Caminhão de fora chegando pra carregar."],
          ]}
        />
        <P>
          Em ambos: tira foto da placa (o sistema lê sozinho a placa por IA), foto do KM, foto
          do lacre na saída. Tudo fica salvo pra auditoria.
        </P>
      </>
    ),
    dev: (
      <>
        <H>Páginas</H>
        <UL>
          <LI><C>PortariaCargaPropria.tsx</C>, <C>PortariaTerceirizado.tsx</C>, <C>RegistroEntrada.tsx</C>, <C>PortariaManual.tsx</C> (manual operacional próprio).</LI>
          <LI>Tabs: <C>PatioAtualTab</C>, <C>HistoricoTab</C>, <C>ManualTab</C>.</LI>
        </UL>
        <H>Componentes-chave</H>
        <UL>
          <LI><C>RegistroMovimentoDialog</C> — formulário dinâmico controlado por <C>src/lib/portaria-fields-config.ts</C> (matriz de campos por categoria).</LI>
          <LI><C>CapturaFoto</C> — câmera (rear) + (opcional) upload de arquivo.</LI>
          <LI><C>OcrResultado</C> — exibe leitura da placa com nível de confiança.</LI>
          <LI><C>VeiculosEsperadosPanel</C> — janela de ±3 dias.</LI>
          <LI><C>VincularCargaDialog</C> — walk-in vinculando a uma carga fechada.</LI>
        </UL>
        <H>Fluxos</H>
        <UL>
          <LI>Frota própria: chegada → saída em rota → retorno → saída do lacre.</LI>
          <LI>Terceirizado: chegada → liberado → saída.</LI>
          <LI>Etapas marcadas em <C>etapa_carga_propria</C> / <C>etapa_terceirizado</C>.</LI>
        </UL>
        <H>OCR</H>
        <P>
          Edge fn <C>ocr-portaria</C> chama Plate Recognizer (placa) e Gemini (KM/lacre).
          Sempre roda no servidor — chave de API nunca vai ao browser.
        </P>
      </>
    ),
    atencao: (
      <Warn>
        Sem cascade FK em <C>movimentacoes_portaria</C> → exclusões fazem cascata manual no
        front (memória <em>data-deletion-logic</em>). Storage <C>portaria</C> é privado — sempre
        gerar signed URL.
      </Warn>
    ),
    buscaTexto: "portaria guarita carga propria terceirizado ocr placa recognizer gemini foto km lacre veiculos esperados walk-in patio historico",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "expedicao",
    numero: 12,
    titulo: "Módulo Expedição (painel TV do dia)",
    resumo: "Visão geral em tempo real do que está acontecendo.",
    icone: Monitor,
    leigo: (
      <>
        <P>
          A tela <strong>Expedição</strong> é feita pra ficar <strong>numa TV no galpão</strong>:
          mostra quantos caminhões a chegar, quantos no pátio, quantos saíram, peso total do
          dia. Atualiza sozinha.
        </P>
      </>
    ),
    dev: (
      <>
        <UL>
          <LI>Página: <C>Expedicao.tsx</C>.</LI>
          <LI>Painéis: <C>PainelAChegar</C>, <C>PainelChegou</C>, <C>PainelNoPatio</C>, <C>PainelCargasFechadas</C>, <C>ExpedicaoKpiCards</C>.</LI>
          <LI>Hook: <C>useCargasDiaExpedicao.ts</C>, <C>useStatusPortariaPorCarga.ts</C>.</LI>
          <LI>KPIs derivados: agrupamento por <C>carga_id</C> + cruzamento com movimentos da portaria do dia (memória <em>portaria-kpis</em>).</LI>
        </UL>
      </>
    ),
    buscaTexto: "expedicao painel tv chegar patio cargas fechadas kpi expedicao",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "rupturas",
    numero: 13,
    titulo: "Módulo Rupturas (faltas de produto)",
    resumo: "Quanto ia sair, quanto saiu, por quê faltou.",
    icone: AlertTriangle,
    leigo: (
      <>
        <Quote>
          Vendedor tirou 100kg de carne. Na hora de carregar, só tinha 70kg. Os 30kg que
          faltaram = <strong>ruptura</strong>. Aparece em vermelho num painel separado.
        </Quote>
        <P>
          Cada ruptura tem motivo (estoque, qualidade, embalagem…). O relatório mostra quanto
          a empresa "deixou na mesa" e ajuda a cobrar produção/recompra.
        </P>
      </>
    ),
    dev: (
      <>
        <UL>
          <LI>Página: <C>Rupturas.tsx</C>.</LI>
          <LI>Tabela: <C>carregamentos_dia</C> — campos <C>peso_original</C>, <C>quantidade_original</C>, <C>ruptura</C> (bool), <C>motivo_ruptura</C>, <C>ruptura_sinalizada</C>.</LI>
          <LI><C>ruptura_sinalizada</C> é setado por <strong>trigger</strong> no banco — não tente setar manualmente.</LI>
          <LI>Helper obrigatório: <C>pesoNaoCarregado(c)</C> em <C>src/lib/peso-utils.ts</C>. Garante que cálculo usa <C>peso_original</C> em rupturas (memória <em>ruptura-management</em>).</LI>
          <LI>Motivos padrão em <C>src/lib/ruptura-utils.ts</C>.</LI>
          <LI>Deep link: <C>?carga=NomeDaCarga</C> filtra pela carga.</LI>
        </UL>
      </>
    ),
    atencao: (
      <Warn>
        <strong>Nunca</strong> calcule peso de ruptura manualmente — sempre use{" "}
        <C>pesoNaoCarregado()</C>. Já causou bug histórico (carne moída de 11.050 virou 7.050).
      </Warn>
    ),
    buscaTexto: "rupturas faltas peso_original quantidade_original ruptura motivo trigger ruptura_sinalizada pesoNaoCarregado",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "analytics",
    numero: 14,
    titulo: "Analytics e Relatórios",
    resumo: "Indicadores agregados e exportações XLSX.",
    icone: BarChart3,
    leigo: (
      <>
        <P>
          O <strong>Analytics</strong> é a tela de gráficos: peso por dia, ruptura por motivo,
          performance por vendedor/motorista. Os <strong>Relatórios</strong> exportam isso pra
          Excel pra o financeiro/gestão usar.
        </P>
      </>
    ),
    dev: (
      <>
        <UL>
          <LI>Páginas: <C>Analytics.tsx</C>, <C>Relatorios.tsx</C>.</LI>
          <LI>Hooks: <C>useAnalytics.ts</C>, <C>useRelatorios.ts</C>.</LI>
          <LI>Charts: <C>recharts</C> — sparklines, barras horizontais, KPIs com tooltips.</LI>
          <LI>Export: <C>xlsx</C> direto no browser. Layout do export documentado em memória <em>load-management/export-format</em>.</LI>
          <LI>Limite: queries de Analytics paginadas até <strong>5000 linhas</strong> (memória <em>scaling-performance</em>).</LI>
        </UL>
      </>
    ),
    buscaTexto: "analytics relatorios graficos recharts xlsx export kpi sparkline limite 5000",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "cadastros",
    numero: 15,
    titulo: "Cadastros (clientes, produtos, motoristas, caminhões, vendedores)",
    resumo: "As bases de dados que alimentam todo o resto.",
    icone: FolderCog,
    leigo: (
      <>
        <P>
          Cadastros é onde se mantém a "ficha" de cada coisa. É o que aparece nos autocompletes
          quando se monta um pedido ou registra um veículo na portaria.
        </P>
      </>
    ),
    dev: (
      <>
        <Tab
          headers={["Cadastro", "Página", "Tabela", "Detalhe"]}
          rows={[
            ["Clientes", <C>Clientes.tsx</C>, <C>clientes</C>, "32k+ linhas, autocomplete com debounce 300ms (memória client-management)"],
            ["Produtos", <C>Produtos.tsx</C>, <C>produtos</C>, "Tem peso_padrao; Pão de Alho conta em UNID"],
            ["Motoristas", <C>Motoristas.tsx</C>, <C>motoristas</C>, "Foto/PDF do documento (Portaria também sobe)"],
            ["Caminhões", <C>Caminhoes.tsx</C>, <C>caminhoes</C>, "Vincula placa ↔ motorista ↔ tipo (autofill bidirecional)"],
            ["Tipos de Caminhão", <C>TiposCaminhao.tsx</C>, <C>tipos_caminhao</C>, "Consumo km/l usado em estimativa"],
            ["Vendedores", <C>Vendedores.tsx</C>, <C>vendedores</C>, "vendedor_users liga ao auth.users"],
            ["Templates de Rota", <C>TemplatesRota.tsx</C>, <C>route_templates</C>, "Rotas favoritas reutilizáveis"],
          ]}
        />
      </>
    ),
    atencao: (
      <Warn>
        Edição de cliente <strong>propaga automaticamente</strong> nos pedidos abertos via RPC
        (memória <em>client-data-propagation</em>) — cuidado ao mudar nome em massa.
      </Warn>
    ),
    buscaTexto: "cadastros clientes produtos motoristas caminhoes vendedores tipos route_templates autocomplete debounce 300ms",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "integracoes",
    numero: 16,
    titulo: "Integrações externas",
    resumo: "Quem o sistema chama lá fora.",
    icone: Plug,
    leigo: (
      <>
        <P>
          O FricoTrack <strong>conversa com alguns serviços de fora</strong> pra fazer coisas
          que não dá pra fazer sozinho. Tudo passa por uma "função na nuvem" pra esconder a
          chave de API do navegador.
        </P>
      </>
    ),
    dev: (
      <>
        <Tab
          headers={["Integração", "Edge function", "Pra que"]}
          rows={[
            ["Plate Recognizer", <C>ocr-portaria</C>, "Lê placa de caminhão a partir da foto"],
            ["Lovable AI / Gemini", <><C>ocr-portaria</C> + <C>parse-pedido-pdf</C></>, "Lê KM/lacre; converte PDF de pedido em itens"],
            ["OpenRouteService / OSRM / Nominatim", <C>roteirizar</C>, "Otimização de rota e geocodificação"],
            ["ViaCEP", <C>enrich-clientes-viacep</C>, "Preenche cidade/UF a partir do CEP"],
            ["Lovable Cloud Storage", "—", "Bucket privado portaria/ pra fotos e PDFs"],
            ["Backups / Restore", <><C>backup-snapshot</C> / <C>restore-deleted</C></>, "Snapshot JSONB; restauração da Lixeira"],
            ["Rota Livre (planejado)", "—", "Manifesto de roteamento (memória rota-livre-integration)"],
            ["Webhooks ERP/WMS (planejado)", "—", "Sync com sistemas externos (memória erp-integration)"],
          ]}
        />
        <Tip>
          Toda edge fn segue: <C>npm:</C> imports, allow CORS Supabase, <C>auth.getUser()</C>{" "}
          pra validar JWT. Veja memória <em>edge-functions-security-policy</em>.
        </Tip>
      </>
    ),
    buscaTexto: "integracoes plate recognizer gemini openrouteservice osrm nominatim viacep storage rota livre webhooks erp wms edge functions",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "backups",
    numero: 17,
    titulo: "Backups e Lixeira",
    resumo: "Salvar versões e desfazer exclusões.",
    icone: Save,
    leigo: (
      <>
        <P>
          O sistema tira <strong>fotografias do banco</strong> (snapshots) sob demanda. Se algo
          for apagado por engano, dá pra restaurar pela Lixeira ou rebobinar pra um snapshot
          inteiro.
        </P>
        <Quote>
          Um snapshot é um "ponto de salvar" igual em videogame.
        </Quote>
      </>
    ),
    dev: (
      <>
        <UL>
          <LI>Página <C>Backups.tsx</C> + edge fn <C>backup-snapshot</C> — grava JSONB em <C>data_snapshots</C>.</LI>
          <LI>Página <C>Lixeira.tsx</C> + edge fn <C>restore-deleted</C> — restaura linhas individuais.</LI>
          <LI>Acesso: <C>SuperAdminRoute</C>.</LI>
          <LI>Memória <em>data-snapshots</em> — inclui zona "APAGAR TUDO" com confirmação dupla.</LI>
        </UL>
      </>
    ),
    atencao: (
      <Warn>
        Snapshots ficam no banco (são pesados). Apague snapshots antigos manualmente quando o
        Cloud avisar de espaço.
      </Warn>
    ),
    buscaTexto: "backups lixeira snapshots restore-deleted data_snapshots super admin apagar tudo",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "onde-mexer",
    numero: 18,
    titulo: "Onde mexer no quê — guia rápido",
    resumo: "Quero mudar X, abro o arquivo Y.",
    icone: Wrench,
    leigo: (
      <P>
        Esta é uma "tabela de busca" pra quem vai modificar o sistema. Procure o que quer mudar
        na coluna esquerda, abra o arquivo da direita.
      </P>
    ),
    dev: (
      <Tab
        headers={["Quero mudar…", "Onde mexer"]}
        rows={[
          ["Cores / tema do app", <C>src/index.css</C>],
          ["Tipografia base", <><C>src/index.css</C> body font-family + <C>tailwind.config.ts</C></>],
          ["Itens da sidebar", <><C>src/components/AppSidebar.tsx</C> (array <C>navTree</C>)</>],
          ["Adicionar uma rota nova", <C>src/App.tsx</C>],
          ["Quem é Super Admin", <C>src/lib/super-admins.ts</C>],
          ["Motivos de ruptura", <C>src/lib/ruptura-utils.ts</C>],
          ["Pesos padrão de produto", <>tabela <C>produtos.peso_padrao</C> + memória product-standards</>],
          ["Cidade de origem da roteirização", <>tabela <C>app_settings</C> (key origem) + <C>RoteirizacaoDialog</C></>],
          ["Campos do formulário da Portaria", <C>src/lib/portaria-fields-config.ts</C>],
          ["Layout do PDF de manifesto", <C>src/components/dashboard/CargaPrintDialog.tsx</C>],
          ["Layout do export Excel", <><C>src/components/dashboard/RoteirizacaoDialog.tsx</C> + memória export-format</>],
          ["Permissões de tabela", "Migration nova alterando RLS"],
          ["Adicionar um novo perfil", "Enum app_role (migration) + RLS + ProtectedRoute"],
          ["Texto do Manual (este!) ", <C>src/content/manual/capitulos.tsx</C>],
          ["Logo na sidebar", <C>src/assets/frico-logo-optimized.webp</C>],
        ]}
      />
    ),
    buscaTexto: "onde mexer cores tema sidebar rotas super admin motivos ruptura pesos padrao origem roteirizacao portaria fields manifesto excel rls perfil logo manual",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "deploy",
    numero: 19,
    titulo: "Como subir uma alteração (deploy)",
    resumo: "Do edit ao usuário final.",
    icone: Rocket,
    leigo: (
      <>
        <P>
          O FricoTrack vive na <strong>Lovable</strong>. Quando alguém edita pelo editor da
          Lovable, a mudança já fica no <em>preview</em>. Pra ir pro endereço público{" "}
          (<em>fricotrack.com.br</em>) basta clicar em <strong>Publish</strong>.
        </P>
        <Quote>
          Não precisa "rodar servidor", "compilar" nem "subir FTP". É clique único.
        </Quote>
      </>
    ),
    dev: (
      <>
        <H>Pipeline</H>
        <OL>
          <LI>Edit no editor Lovable (ou via GitHub conectado).</LI>
          <LI>Build automático (Vite) — preview em <C>id-preview--*.lovable.app</C>.</LI>
          <LI>Botão <strong>Publish</strong> → publica em <C>expedi-dash.lovable.app</C>.</LI>
          <LI>Domínio custom <C>fricotrack.com.br</C> resolve pro publicado.</LI>
        </OL>
        <H>Migrations e edge functions</H>
        <UL>
          <LI>Migrations em <C>supabase/migrations/</C> — aplicadas automaticamente; <strong>nunca editar uma já existente</strong>, criar nova.</LI>
          <LI>Edge functions em <C>supabase/functions/</C> — deploy automático no save.</LI>
        </UL>
        <H>PWA / cache</H>
        <UL>
          <LI>Estratégia <C>autoUpdate</C> — clientes recebem nova versão na próxima carga.</LI>
          <LI><C>lazyWithRetry</C> em <C>App.tsx</C> faz reload se um chunk antigo sumir após deploy.</LI>
        </UL>
      </>
    ),
    atencao: (
      <Warn>
        <strong>Não edite</strong>: <C>src/integrations/supabase/client.ts</C>,{" "}
        <C>src/integrations/supabase/types.ts</C>, <C>.env</C>, <C>supabase/config.toml</C>{" "}
        (project_id). Tudo isso é gerenciado.
      </Warn>
    ),
    buscaTexto: "deploy publish lovable preview build vite migrations edge functions pwa autoupdate lazyWithRetry custom domain fricotrack",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "troubleshooting",
    numero: 20,
    titulo: "Problemas comuns (FAQ)",
    resumo: "Sintoma → causa provável → solução.",
    icone: LifeBuoy,
    leigo: (
      <P>
        Se algo está esquisito, comece por aqui. A maioria dos sustos é problema conhecido com
        solução simples.
      </P>
    ),
    dev: (
      <Tab
        headers={["Sintoma", "Causa provável", "Solução"]}
        rows={[
          ["Tela em branco / loading infinito", "Chunk antigo após deploy", <>Hard reload (Ctrl+Shift+R). <C>lazyWithRetry</C> faz isso sozinho na 3ª tentativa.</>],
          ["“Sem dados” no Analytics", "Limite 1000 do Supabase", "Já paginado pra 5000; se passar disso, paginar mais."],
          ["Peso volta ao padrão sozinho", <>Save sem <C>peso_manual: true</C></>, "Sempre incluir flag em saves de peso editado."],
          ["Carne moída de 11050 vira 7050", "Cálculo manual de ruptura", <>Usar sempre <C>pesoNaoCarregado()</C>.</>],
          ["“Sem permissão pra excluir”", "RLS bloqueia delete pro role", "Confirmar que role é admin/logistica/faturamento."],
          ["Plate Recognizer falha", "Quota / chave inválida", "Conferir secret no Cloud → Edge Functions."],
          ["Realtime parou", "Sessão expirada / WS desconectou", "Indicador no topo; logout/login refaz canal."],
          ["Cliente novo do vendedor não aparece", "Validação backend pegou duplicidade silenciosa", "Olhar response da RPC; código duplicado é bloqueado."],
          ["Mapa não carrega", "Tile bloqueado; User-Agent ausente em Nominatim", <>Ver memória <em>map-ux-constraints</em>.</>],
          ["Edge fn 500", "Import esm.sh quebrado", <>Trocar por <C>npm:</C>.</>],
          ["Migration “read-only”", "Edição de migration antiga", "Criar migration nova, nunca editar a antiga."],
        ]}
      />
    ),
    buscaTexto: "troubleshooting faq problemas comuns chunk antigo limite 1000 peso_manual ruptura permissão exclusão plate recognizer realtime mapa nominatim migration",
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "glossario",
    numero: 21,
    titulo: "Glossário",
    resumo: "Vocabulário do sistema.",
    icone: GraduationCap,
    leigo: <P>Termos que aparecem o tempo todo no sistema, em ordem alfabética.</P>,
    dev: (
      <Tab
        headers={["Termo", "Significa"]}
        rows={[
          [<strong>Carga</strong>, "Conjunto de pedidos agrupados num caminhão. Identificada por carga_id."],
          [<strong>carga_id</strong>, "String que une várias linhas de carregamentos_dia em uma carga."],
          [<strong>Etapa</strong>, "Estágio do pedido: rascunho, aguardando_faturamento, vendas, logistica."],
          [<strong>Status</strong>, "Estado físico do produto (Aguardando, Separando, Pronto, Carregando, Carregado, Problema)."],
          [<strong>Ruptura</strong>, "Diferença entre o que era pra sair e o que saiu."],
          [<strong>peso_manual</strong>, "Flag que diz 'esse peso foi digitado, não recalcule'."],
          [<strong>Walk-in</strong>, "Caminhão chegou sem ter sido previsto na lista de esperados."],
          [<strong>Snapshot</strong>, "Backup do banco em JSON, sob demanda."],
          [<strong>Edge function</strong>, "Pequeno programa que roda na nuvem do Supabase (não no browser)."],
          [<strong>RLS</strong>, "Row Level Security — segurança por linha do banco."],
          [<strong>PWA</strong>, "Progressive Web App — o site instalável como aplicativo."],
          [<strong>Realtime</strong>, "Atualização ao vivo via WebSocket do Supabase."],
          [<strong>OCR</strong>, "Reconhecimento de texto em imagem (placa, KM, lacre)."],
          [<strong>ORS / OSRM</strong>, "Serviços de roteirização usados pelo edge fn roteirizar."],
          [<strong>operation_id / row_op_key</strong>, "Idempotência — evita inserir duas vezes em duplo clique."],
        ]}
      />
    ),
    buscaTexto: "glossario carga carga_id etapa status ruptura peso_manual walk-in snapshot edge function rls pwa realtime ocr ors osrm operation_id idempotencia",
  },
];
