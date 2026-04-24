import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Truck, Calendar, BarChart3, PlusCircle, ParkingCircle, History,
  Search, ClipboardCheck, Bell, Camera, HelpCircle, Palette, Lightbulb, AlertTriangle,
  Footprints, Zap, ScanLine, Clock, Shield, UserCheck, Trash2, Users,
} from "lucide-react";

interface ManualTabProps {
  categoria: "carga_propria" | "terceirizado";
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{n}</div>
      <div className="flex-1 text-sm pt-0.5">{children}</div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 my-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
      <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
      <div className="text-xs text-blue-900 dark:text-blue-200"><strong>Dica:</strong> {children}</div>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 my-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-900 dark:text-amber-200"><strong>Atenção:</strong> {children}</div>
    </div>
  );
}

function Ok({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 my-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
      <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
      <div className="text-xs text-emerald-900 dark:text-emerald-200"><strong>Resultado esperado:</strong> {children}</div>
    </div>
  );
}

function What({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground mb-2">🎯 <strong className="text-foreground">O que é:</strong> {children}</p>;
}

function Section({ value, icon: Icon, title, children }: { value: string; icon: any; title: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={value} className="border rounded-lg px-4 mb-2 bg-card">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          <Icon className="h-5 w-5 text-primary shrink-0" />
          <span className="font-semibold text-sm sm:text-base">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-2 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

export function ManualTab({ categoria }: ManualTabProps) {
  const isCarga = categoria === "carga_propria";
  const tipoLabel = isCarga ? "Carga Própria" : "Terceirizado";

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Manual da Portaria — {tipoLabel}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Guia completo, simples e didático de tudo que você pode fazer aqui.</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          👋 <strong>Olá!</strong> Este manual explica passo a passo como usar a Portaria. Clique em qualquer tópico abaixo para abrir e ler.
          Se travar, role até o final em <em>"Problemas Comuns"</em>.
        </p>

        <Accordion type="multiple" className="w-full">

          <Section value="s1" icon={Truck} title="1. Bem-vindo à Portaria">
            <What>É a tela onde você controla TUDO que entra e sai pelo portão: caminhões, motoristas, fornecedores e visitantes.</What>
            <p className="text-sm mb-2">A tela tem 4 partes principais:</p>
            <Step n={1}><strong>Topo:</strong> nome da página, filtro de data e botões <Badge variant="secondary" className="mx-1">+ Registrar Chegada</Badge> e <Badge variant="secondary" className="mx-1">+ Registrar Movimento</Badge>.</Step>
            <Step n={2}><strong>Cartões coloridos (KPIs):</strong> mostram os números do dia (entradas, saídas, no pátio).</Step>
            <Step n={3}><strong>Avisos:</strong> solicitações pendentes, cargas fechadas aguardando e veículos esperados.</Step>
            <Step n={4}><strong>Abas:</strong> Pátio Atual, Histórico, Esperados.</Step>
            <Tip>Use o telefone celular: tudo funciona igual e você pode tirar foto direto pela câmera.</Tip>
          </Section>

          <Section value="s2" icon={Calendar} title="2. Filtro de Datas">
            <What>Escolhe qual período você quer ver. Por padrão vem o dia de hoje.</What>
            <Step n={1}>Clique no botão com o 📅 ícone de calendário no topo.</Step>
            <Step n={2}>Selecione um <strong>dia inicial</strong> e um <strong>dia final</strong> no calendário.</Step>
            <Step n={3}>Use os atalhos: <em>Hoje</em>, <em>Últimos 7 dias</em>, <em>Este mês</em>.</Step>
            <Tip>Para ver só hoje, clique em "Hoje". Para a semana inteira, "Últimos 7 dias".</Tip>
          </Section>

          <Section value="s3" icon={BarChart3} title="3. Cartões de Resumo (KPIs)">
            <What>Os cartões coloridos no topo mostram um resumo rápido em números.</What>
            <ul className="text-sm space-y-1.5 list-disc pl-5">
              <li><strong>Entradas hoje:</strong> quantos veículos entraram no período filtrado.</li>
              <li><strong>Saídas hoje:</strong> quantos saíram.</li>
              <li><strong>No Pátio agora:</strong> quantos ainda estão dentro (não saíram).</li>
              {!isCarga && <li><strong>Aguardando Entrada:</strong> terceirizados previstos que ainda não chegaram.</li>}
            </ul>
            <Tip>Se um número parecer estranho, confira se o filtro de data está certo. Os KPIs respeitam o intervalo selecionado.</Tip>
          </Section>

          <Section value="s4" icon={PlusCircle} title={`4. Como Registrar uma Movimentação (${tipoLabel})`}>
            <What>Toda vez que um caminhão chega, sai ou avança uma etapa, você precisa registrar aqui.</What>

            {isCarga ? (
              <>
                <p className="text-sm font-semibold mt-3 mb-2">🔄 Fluxo de Carga Própria — 4 etapas em 1 único registro:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">
{`🟠 Chegada  →  🔵 Saída p/ Rota  →  🟡 Retorno  →  🔒 Saída Final c/ Lacre`}
                </pre>
                <Tip>Importante: <strong>tudo fica em UM ÚNICO registro</strong> que vai sendo atualizado a cada etapa. Você não cria vários registros — você avança o mesmo.</Tip>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 1 — 🟠 Chegada</p>
                <Step n={1}>Vá na aba <Badge variant="outline">Esperados</Badge>.</Step>
                <Step n={2}>Encontre o caminhão e clique em <Badge>Registrar Chegada</Badge>.</Step>
                <Step n={3}>Confirme placa, motorista e tipo de caminhão. Tire foto da placa (OCR lê sozinho).</Step>
                <Ok>O caminhão aparece na aba <Badge variant="outline">Pátio Atual</Badge> com etapa "Chegou".</Ok>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 2 — 🔵 Saída p/ Rota</p>
                <Step n={1}>Na aba <Badge variant="outline">Pátio Atual</Badge> ache o caminhão.</Step>
                <Step n={2}>Clique em <Badge>Saída p/ Rota</Badge>.</Step>
                <Step n={3}>Preencha: <strong>Rota</strong>, <strong>KM Inicial</strong>, <strong>Conferente</strong>.</Step>
                <Step n={4}>Tire a <strong>foto do painel</strong> mostrando o KM (OCR lê o número).</Step>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 3 — 🟡 Retorno</p>
                <Step n={1}>Quando o caminhão voltar, clique em <Badge>Retorno</Badge>.</Step>
                <Step n={2}>Preencha o <strong>KM Final</strong> (KM rodado é calculado automaticamente).</Step>
                <Step n={3}>Tire a <strong>foto do painel</strong>. Registre ocorrências se houver.</Step>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 4 — 🔒 Saída Final c/ Lacre</p>
                <Step n={1}>Quando o caminhão for sair de vez, clique em <Badge>Lacre</Badge>.</Step>
                <Step n={2}>Anote o <strong>número do lacre</strong> e tire <strong>foto do lacre fechado</strong> (OCR lê o número).</Step>
                <Step n={3}>Salve. O caminhão sai do pátio e vai para o histórico como finalizado.</Step>
                <Warn>Sem foto do lacre não dá pra finalizar. Confira se a foto saiu nítida.</Warn>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold mt-3 mb-2">🔄 Fluxo de Terceirizado — 2 etapas:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">
{`🟠 Entrada (com NF + doca)  →  🔒 Saída c/ Lacre`}
                </pre>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 1 — 🟠 Entrada</p>
                <Step n={1}>Quando o caminhão chega, clique em <Badge>+ Registrar Chegada</Badge> (ou pegue da aba Esperados se já estiver previsto).</Step>
                <Step n={2}>Preencha: <strong>Placa</strong>, <strong>Motorista</strong>, <strong>Transportadora</strong>, <strong>Tipo de Carga</strong>, <strong>Doca/Setor</strong>.</Step>
                <Step n={3}>Anexe a <strong>Nota Fiscal</strong> (foto ou PDF) e tire <strong>foto da placa</strong> (OCR lê automaticamente).</Step>
                <Ok>O caminhão aparece em <Badge variant="outline">Pátio Atual</Badge> com etapa "Aguardando Saída".</Ok>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 2 — 🔒 Saída c/ Lacre</p>
                <Step n={1}>Na aba <Badge variant="outline">Pátio Atual</Badge>, clique em <Badge>Saída c/ Lacre</Badge>.</Step>
                <Step n={2}>Anote o <strong>número do lacre</strong> e tire <strong>foto do lacre</strong> (OCR lê o número).</Step>
                <Step n={3}>Salve. Pronto, finalizado!</Step>
                <Warn>Sempre confira a placa na foto antes de liberar o caminhão.</Warn>
              </>
            )}
          </Section>

          <Section value="s5" icon={Zap} title="5. Saída Rápida (Visitante, Fornecedor, Prestador, Outros)">
            <What>Fluxo simplificado para quem não é caminhão de carga: visitas, fornecedores pequenos, prestadores de serviço.</What>
            <p className="text-sm font-semibold mt-3 mb-1">📋 Categorias suportadas:</p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li><strong>Fornecedor:</strong> entrega rápida. Campos: placa, motorista, empresa, nota fiscal, doca.</li>
              <li><strong>Visitante:</strong> pessoa física. Campos: nome completo, documento (RG/CPF), telefone, <em>pessoa visitada</em>, motivo da visita.</li>
              <li><strong>Prestador:</strong> serviço técnico. Campos: nome, empresa, <em>serviço a executar</em>, <em>responsável interno</em>.</li>
              <li><strong>Outros:</strong> qualquer caso fora das categorias acima — preencha descrição livre.</li>
            </ul>
            <p className="text-sm font-semibold mt-3 mb-1">Como registrar:</p>
            <Step n={1}>Clique em <Badge>+ Registrar Movimento</Badge> no topo.</Step>
            <Step n={2}>Escolha a <strong>Categoria</strong> e o <strong>Tipo de Operação</strong> (Entrada ou Saída).</Step>
            <Step n={3}>Preencha os campos que aparecerem (o formulário muda conforme a categoria).</Step>
            <Step n={4}>Salve. Para a saída, basta achar o registro na aba Pátio Atual e clicar em <Badge>Registrar Saída</Badge>.</Step>
            <Tip>Visitantes e prestadores não precisam de lacre nem KM — só os horários de entrada e saída são gravados.</Tip>
          </Section>

          <Section value="s6" icon={ParkingCircle} title="6. Aba Pátio Atual (quem está lá dentro)">
            <What>Lista de todos os veículos e pessoas que ainda estão dentro do pátio (não saíram).</What>
            <Step n={1}>Cada linha mostra: placa, motorista, há quanto tempo está dentro e a etapa atual.</Step>
            <Step n={2}>Use a <strong>busca</strong> no topo para achar por placa ou nome.</Step>
            <Step n={3}>Clique no botão da próxima etapa (ex: <Badge>Saída p/ Rota</Badge> ou <Badge>Registrar Saída</Badge>) para avançar.</Step>
            <Step n={4}>Clique em qualquer linha para ver os <strong>detalhes completos</strong>.</Step>

            <p className="text-sm font-semibold mt-4 mb-1">⏱️ Indicadores de tempo no pátio:</p>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className="bg-emerald-600">🟢 até 4h — normal</Badge>
              <Badge className="bg-yellow-500 text-black">🟡 4h a 8h — atenção</Badge>
              <Badge className="bg-red-600">🔴 mais de 8h — crítico</Badge>
            </div>
            <Tip>Se um veículo está há mais de 8h no pátio (vermelho), confira o que aconteceu — pode ter esquecido de registrar a saída.</Tip>
          </Section>

          <Section value="s7" icon={History} title="7. Aba Histórico (tudo que já aconteceu)">
            <What>Lista completa de todos os registros do período escolhido, com paginação e ordenação.</What>
            <Step n={1}>A lista mostra <strong>25 registros por página</strong>. Use os botões no rodapé para navegar.</Step>
            <Step n={2}><strong>Clique no cabeçalho</strong> de qualquer coluna para ordenar (data, placa, motorista, etc.). Clique de novo para inverter.</Step>
            <Step n={3}>Use o filtro <strong>Tipo</strong> para ver só Entradas, só Saídas ou Tudo.</Step>
            <Step n={4}>Use a <strong>busca</strong> para achar por placa, motorista, empresa ou rota.</Step>
            <Step n={5}>Clique em qualquer linha para abrir os <strong>Detalhes</strong> completos com fotos e linha do tempo.</Step>
            <Step n={6}>Botão <Badge variant="outline">Limpar filtros</Badge> volta a busca e os filtros para o padrão.</Step>

            <p className="text-sm font-semibold mt-4 mb-1">🛡️ Ferramentas administrativas (somente Admin):</p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li><strong>Marcar checkbox</strong> em cada linha para selecionar registros.</li>
              <li>Botão <Badge variant="destructive"><Trash2 className="h-3 w-3 mr-1 inline" />Deletar selecionados</Badge> apaga os registros marcados (com confirmação).</li>
              <li>Exportar para CSV/Excel para auditoria externa.</li>
            </ul>
            <Warn>Apagar registro é permanente. Se não for admin, peça para o supervisor.</Warn>
          </Section>

          <Section value="s8" icon={Search} title="8. Detalhes de um Registro">
            <What>Tela popup que mostra TUDO sobre uma movimentação: horários, fotos, observações, lacre.</What>
            <Step n={1}>Clique em qualquer registro no Histórico ou no Pátio para abrir.</Step>
            <Step n={2}>Veja a <strong>linha do tempo</strong> com cada etapa e horário exato.</Step>
            {isCarga && <Step n={3}>Para Carga Própria você verá os 4 marcos: Chegada → Saída p/ Rota → Retorno → Saída Final.</Step>}
            <Step n={isCarga ? 4 : 3}>Clique em qualquer foto (placa, painel, lacre, nota) para ampliar e baixar.</Step>
            <Step n={isCarga ? 5 : 4}>Admin/Logística pode <strong>editar</strong> dados via botão "Editar" no topo do diálogo.</Step>
            <Tip>Todas as fotos ficam guardadas em armazenamento privado e podem ser baixadas a qualquer momento para auditoria.</Tip>
          </Section>

          <Section value="s9" icon={ClipboardCheck} title="9. Aba Esperados (planilha do dia)">
            <What>Lista dos veículos previstos para chegar — vem da planilha de logística ou cadastro manual.</What>
            <Step n={1}>Mostra veículos numa janela de <strong>±3 dias</strong> da data filtrada.</Step>
            <Step n={2}>Quando o caminhão chega, clique nele para registrar a chegada já preenchida.</Step>
            <Step n={3}>Veículos já conferidos ficam marcados com ✅.</Step>
            <Step n={4}>Pode <strong>autorizar</strong> ou <strong>recusar</strong> uma entrada (autorizado por / motivo da recusa).</Step>
            <Step n={5}>Para <strong>importar planilha</strong>: botão <Badge variant="outline">Importar</Badge> no topo (Admin/Logística).</Step>
            <Step n={6}>Veículos que chegam sem aviso prévio são marcados como <strong>chegada sem agendamento</strong>.</Step>
            <Warn>Se um veículo está previsto para amanhã mas chegou hoje, aparece um aviso. Confirme antes de registrar.</Warn>
          </Section>

          <Section value="s10" icon={Bell} title="10. Solicitações e Cargas Aguardando">
            <What>Painéis que aparecem acima das abas, avisando o que precisa de atenção AGORA.</What>
            <p className="text-sm font-semibold mt-3">📥 Solicitações Pendentes</p>
            <p className="text-sm">Quando alguém pede entrada sem estar na planilha (chegada sem agendamento), aparece aqui pra você aprovar ou negar.</p>
            <p className="text-sm font-semibold mt-3">📦 Cargas Fechadas Aguardando</p>
            <p className="text-sm">Cargas que a logística já fechou e estão esperando o caminhão chegar pra carregar. Permite vincular o caminhão à carga em 1 clique.</p>
            <Tip>Confira esses painéis sempre que entrar na tela — eles são prioridade.</Tip>
          </Section>

          <Section value="s11" icon={ScanLine} title="11. OCR — Leitura Automática (Placa, KM, Lacre)">
            <What>O sistema lê automaticamente texto em fotos usando inteligência artificial. Você confirma ou corrige.</What>
            <p className="text-sm font-semibold mt-3 mb-1">📸 O que o OCR lê:</p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li><strong>Placa do veículo</strong> — usa o serviço Plate Recognizer (especializado em placas brasileiras).</li>
              <li><strong>KM do painel/odômetro</strong> — usa IA Gemini para ler o número da quilometragem.</li>
              <li><strong>Número do lacre</strong> — usa IA Gemini para ler o número do lacre de segurança.</li>
            </ul>

            <p className="text-sm font-semibold mt-4 mb-1">🚦 Indicador de confiança:</p>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className="bg-emerald-600">🟢 ≥ 85% — confiável</Badge>
              <Badge className="bg-yellow-500 text-black">🟡 60–84% — confira</Badge>
              <Badge className="bg-red-600">🔴 &lt; 60% — corrija</Badge>
            </div>

            <p className="text-sm font-semibold mt-3 mb-1">Como usar:</p>
            <Step n={1}>Tire a foto pelo botão de câmera 📷 no formulário.</Step>
            <Step n={2}>Aguarde 2–4 segundos — o sistema lê e preenche o campo.</Step>
            <Step n={3}>Confira o valor lido. Se estiver errado, <strong>edite manualmente</strong> no campo "confirmado".</Step>
            <Step n={4}>Salve normalmente.</Step>
            <Warn>Foto tremida, escura ou com reflexo dificulta a leitura. Tire de novo se a confiança estiver baixa.</Warn>
          </Section>

          <Section value="s12" icon={Camera} title="12. Fotos e Documentos">
            <What>Todo registro importante exige foto. Aqui é como tirar e anexar.</What>
            <p className="text-sm font-semibold mt-3 mb-1">📷 Tipos de evidência suportados:</p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li><strong>Foto da placa</strong> — obrigatória para todo veículo.</li>
              <li><strong>Foto do documento</strong> — RG, CNH ou similar (visitantes/motoristas).</li>
              <li><strong>Foto do painel (KM)</strong> — odômetro nas etapas Saída p/ Rota e Retorno (Carga Própria).</li>
              <li><strong>Foto da nota fiscal</strong> — obrigatória em terceirizados; aceita <strong>PDF</strong> também.</li>
              <li><strong>Foto do lacre</strong> — obrigatória para finalizar.</li>
            </ul>
            <Step n={1}>Clique no botão de câmera 📷 no formulário.</Step>
            <Step n={2}>No celular: a câmera abre direto. Aponte e tire.</Step>
            <Step n={3}>No computador: clique para selecionar arquivo da pasta.</Step>
            <Step n={4}>Para visualizar depois, clique na miniatura — abre em tela cheia com zoom.</Step>
            <Tip>As fotos ficam em armazenamento privado e seguro. URLs de visualização são renovadas automaticamente.</Tip>
          </Section>

          <Section value="s13" icon={UserCheck} title="13. Cadastros Automáticos (Placa, Motorista, Empresa)">
            <What>O sistema lembra de tudo. Quando você digita uma placa já conhecida, ele preenche o resto sozinho.</What>
            <Step n={1}>Digite a <strong>placa</strong>. Após 3 letras, o sistema sugere veículos cadastrados.</Step>
            <Step n={2}>Se a placa já entrou antes, ele preenche <strong>motorista</strong> e <strong>transportadora</strong> automaticamente.</Step>
            <Step n={3}>Mostra também quantas vezes esse veículo já passou pela portaria.</Step>
            <Step n={4}>Se for um veículo novo, preencha tudo manualmente — fica salvo para a próxima.</Step>
            <Tip>A vinculação é bidirecional: Placa ↔ Motorista ↔ Transportadora. Se mudar um, os outros aparecem juntos.</Tip>
          </Section>

          <Section value="s14" icon={Search} title="14. Campo de Busca">
            <What>Barra de busca no topo que procura em todas as listas ao mesmo tempo.</What>
            <p className="text-sm">Você pode digitar:</p>
            <ul className="text-sm list-disc pl-5 space-y-1 mt-1">
              <li>📋 <strong>Placa</strong> (ex: ABC1D23)</li>
              <li>👤 <strong>Nome do motorista ou visitante</strong></li>
              <li>🏢 <strong>Empresa / transportadora</strong></li>
              <li>🆔 <strong>Documento</strong></li>
              <li>🛣️ <strong>Rota</strong></li>
              <li>🔢 <strong>Número da nota fiscal ou lacre</strong></li>
            </ul>
            <Tip>Não precisa digitar tudo — basta uma parte. Ex: "ABC" já encontra "ABC1D23".</Tip>
          </Section>

          <Section value="s15" icon={Shield} title="15. Quem pode fazer o quê (Permissões)">
            <What>Cada perfil tem um conjunto de ações permitidas. Tabela rápida:</What>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs border">
                <thead className="bg-muted">
                  <tr>
                    <th className="border p-2 text-left">Ação</th>
                    <th className="border p-2 text-center">Portaria</th>
                    <th className="border p-2 text-center">Logística</th>
                    <th className="border p-2 text-center">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border p-2">Registrar entrada/saída</td><td className="border p-2 text-center">✅</td><td className="border p-2 text-center">✅</td><td className="border p-2 text-center">✅</td></tr>
                  <tr><td className="border p-2">Editar registro</td><td className="border p-2 text-center">✅</td><td className="border p-2 text-center">✅</td><td className="border p-2 text-center">✅</td></tr>
                  <tr><td className="border p-2">Importar planilha de esperados</td><td className="border p-2 text-center">—</td><td className="border p-2 text-center">✅</td><td className="border p-2 text-center">✅</td></tr>
                  <tr><td className="border p-2">Autorizar/recusar chegada sem agendamento</td><td className="border p-2 text-center">✅</td><td className="border p-2 text-center">✅</td><td className="border p-2 text-center">✅</td></tr>
                  <tr><td className="border p-2">Vincular carga ao caminhão</td><td className="border p-2 text-center">✅</td><td className="border p-2 text-center">✅</td><td className="border p-2 text-center">✅</td></tr>
                  <tr><td className="border p-2">Deletar registro</td><td className="border p-2 text-center">—</td><td className="border p-2 text-center">—</td><td className="border p-2 text-center">✅</td></tr>
                  <tr><td className="border p-2">Exportar histórico (CSV)</td><td className="border p-2 text-center">—</td><td className="border p-2 text-center">✅</td><td className="border p-2 text-center">✅</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section value="s16" icon={Clock} title="16. Horários e Linha do Tempo">
            <What>Todo movimento grava o horário exato — você não precisa digitar.</What>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li><strong>Horário de chegada:</strong> gravado quando você clica em "Registrar Chegada".</li>
              {isCarga && <>
                <li><strong>Horário de saída p/ rota:</strong> gravado na etapa 2.</li>
                <li><strong>Horário de retorno:</strong> gravado na etapa 3.</li>
                <li><strong>Horário de saída final:</strong> gravado quando você fecha o lacre.</li>
              </>}
              {!isCarga && <li><strong>Horário de saída:</strong> gravado quando você fecha com o lacre.</li>}
              <li><strong>Tempo no pátio:</strong> calculado automaticamente (horário atual − horário de chegada).</li>
            </ul>
            <Tip>Se precisar corrigir um horário (ex: esqueceu de registrar na hora certa), peça para Admin/Logística editarem.</Tip>
          </Section>

          <Section value="s17" icon={HelpCircle} title="17. Problemas Comuns (FAQ)">
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold">❓ Não consigo achar um caminhão.</p>
                <p className="text-muted-foreground">Confira o <strong>filtro de data</strong>. Talvez ele entrou em outro dia. Tente "Últimos 7 dias".</p>
              </div>
              <div>
                <p className="font-semibold">❓ O OCR leu a placa errada.</p>
                <p className="text-muted-foreground">Sem problema — basta editar o campo "Placa Confirmada" antes de salvar. O sistema usa o que você confirmar.</p>
              </div>
              <div>
                <p className="font-semibold">❓ Veículo chegou mas não está em "Esperados".</p>
                <p className="text-muted-foreground">Use o botão <Badge>+ Registrar Chegada</Badge> ou <Badge>+ Registrar Movimento</Badge> e marque como <strong>chegada sem agendamento</strong>. Funciona normal.</p>
              </div>
              <div>
                <p className="font-semibold">❓ Tirei foto errada, e agora?</p>
                <p className="text-muted-foreground">Se ainda não salvou, clique no X e tire de novo. Se já salvou, peça ajuda ao admin para editar.</p>
              </div>
              <div>
                <p className="font-semibold">❓ Esqueci de registrar a chegada.</p>
                <p className="text-muted-foreground">Use o botão <Badge>+ Registrar Movimento</Badge> e preencha manualmente. Avise o supervisor.</p>
              </div>
              <div>
                <p className="font-semibold">❓ Preciso apagar um registro duplicado.</p>
                <p className="text-muted-foreground">Só Admin pode apagar. Marque o checkbox da linha no Histórico e peça ao admin para clicar em "Deletar selecionados".</p>
              </div>
              <div>
                <p className="font-semibold">❓ A foto não abre.</p>
                <p className="text-muted-foreground">As URLs são renovadas automaticamente. Recarregue a página (F5) — costuma resolver.</p>
              </div>
              <div>
                <p className="font-semibold">❓ Apareceu um erro vermelho.</p>
                <p className="text-muted-foreground">Tire um print da tela e mande para o admin/logística. Tente recarregar a página (F5).</p>
              </div>
              <div>
                <p className="font-semibold">❓ Internet caiu no meio do registro.</p>
                <p className="text-muted-foreground">Aguarde voltar e refaça. O sistema só salva quando aparece a mensagem verde "Sucesso".</p>
              </div>
              <div>
                <p className="font-semibold">❓ Quem chamar quando travar?</p>
                <p className="text-muted-foreground">Supervisor de logística ou admin do sistema.</p>
              </div>
            </div>
          </Section>

          <Section value="s18" icon={Palette} title="18. Legenda de Cores e Ícones">
            <div className="space-y-3 text-sm">
              {isCarga && (
                <div>
                  <p className="font-semibold mb-1">Etapas (Carga Própria):</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-orange-500">🟠 Chegou</Badge>
                    <Badge className="bg-blue-500">🔵 Em Rota</Badge>
                    <Badge className="bg-yellow-500 text-black">🟡 Retornou</Badge>
                    <Badge className="bg-green-600">🔒 Finalizado</Badge>
                  </div>
                </div>
              )}
              {!isCarga && (
                <div>
                  <p className="font-semibold mb-1">Etapas (Terceirizado):</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-orange-500">🟠 Aguardando Saída</Badge>
                    <Badge className="bg-green-600">🔒 Finalizado</Badge>
                  </div>
                </div>
              )}
              <div>
                <p className="font-semibold mb-1">Tempo no pátio:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-600">🟢 até 4h</Badge>
                  <Badge className="bg-yellow-500 text-black">🟡 4–8h</Badge>
                  <Badge className="bg-red-600">🔴 +8h</Badge>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">Confiança do OCR:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-600">🟢 ≥85%</Badge>
                  <Badge className="bg-yellow-500 text-black">🟡 60–84%</Badge>
                  <Badge className="bg-red-600">🔴 &lt;60%</Badge>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">Tipos de movimento:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Entrada</Badge>
                  <Badge variant="secondary">Saída</Badge>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">Categorias <Users className="h-3 w-3 inline" />:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Carga Própria</Badge>
                  <Badge variant="outline">Terceirizado</Badge>
                  <Badge variant="outline">Fornecedor</Badge>
                  <Badge variant="outline">Visitante</Badge>
                  <Badge variant="outline">Prestador</Badge>
                  <Badge variant="outline">Outros</Badge>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">Ícones de fotos:</p>
                <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                  <li>📷 Foto da Placa</li>
                  <li>🛞 Painel de KM</li>
                  <li>🔒 Lacre</li>
                  <li>📄 Documento</li>
                  <li>📋 Nota Fiscal (foto ou PDF)</li>
                </ul>
              </div>
            </div>
          </Section>

        </Accordion>

        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
          <Footprints className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium">Chegou ao fim do manual! 🎉</p>
          <p className="text-xs text-muted-foreground mt-1">Em caso de dúvida, sempre prefira <strong>perguntar antes de registrar errado</strong>.</p>
        </div>
      </CardContent>
    </Card>
  );
}