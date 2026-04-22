import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Truck, Calendar, BarChart3, PlusCircle, ParkingCircle, History,
  Search, ClipboardCheck, Bell, Camera, HelpCircle, Palette, Lightbulb, AlertTriangle, Footprints
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
            <What>É a tela onde você controla TUDO que entra e sai pelo portão: caminhões, motoristas e visitantes.</What>
            <p className="text-sm mb-2">A tela tem 4 partes principais:</p>
            <Step n={1}><strong>Topo:</strong> nome da página, filtro de data e botão azul <Badge variant="secondary" className="mx-1">+ Registrar</Badge>.</Step>
            <Step n={2}><strong>Cartões coloridos (KPIs):</strong> mostram os números do dia (entradas, saídas, pátio).</Step>
            <Step n={3}><strong>Avisos amarelos:</strong> solicitações pendentes e cargas esperando entrada.</Step>
            <Step n={4}><strong>Abas:</strong> Pátio, Histórico, Esperados e este Manual.</Step>
            <Tip>Use o telefone celular: tudo funciona igual e você pode tirar foto direto pela câmera.</Tip>
          </Section>

          <Section value="s2" icon={Calendar} title="2. Filtro de Datas">
            <What>Escolhe qual período você quer ver. Por padrão vem o dia de hoje.</What>
            <Step n={1}>Clique no botão com o 📅 ícone de calendário no topo.</Step>
            <Step n={2}>Selecione um <strong>dia inicial</strong> e um <strong>dia final</strong> no calendário.</Step>
            <Step n={3}>Use os atalhos no rodapé: <em>Hoje</em>, <em>Últimos 7 dias</em>, <em>Este mês</em>.</Step>
            <Tip>Para ver só o dia de hoje, clique em "Hoje". Para ver a semana inteira, use "Últimos 7 dias".</Tip>
          </Section>

          <Section value="s3" icon={BarChart3} title="3. Cartões de Resumo (KPIs)">
            <What>Os cartões coloridos no topo mostram um resumo rápido em números.</What>
            <ul className="text-sm space-y-1.5 list-disc pl-5">
              <li><strong>Entradas:</strong> quantos veículos entraram no período.</li>
              <li><strong>Saídas:</strong> quantos saíram.</li>
              <li><strong>No Pátio:</strong> quantos ainda estão dentro.</li>
              <li><strong>Tempo médio:</strong> quanto tempo um veículo fica em média.</li>
            </ul>
            <Tip>Se um número parecer estranho, confira se o filtro de data está certo.</Tip>
          </Section>

          <Section value="s4" icon={PlusCircle} title={`4. Como Registrar uma Movimentação (${tipoLabel})`}>
            <What>Toda vez que um caminhão chega, sai ou avança uma etapa, você precisa registrar aqui.</What>

            {isCarga ? (
              <>
                <p className="text-sm font-semibold mt-3 mb-2">🔄 Fluxo de Carga Própria — 4 etapas:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">
{`🟠 Chegada  →  🔵 Saída p/ Rota  →  🟡 Retorno  →  🔒 Saída Final c/ Lacre`}
                </pre>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 1 — 🟠 Chegada</p>
                <Step n={1}>Vá na aba <Badge variant="outline">Esperados</Badge>.</Step>
                <Step n={2}>Encontre o caminhão na lista e clique em <Badge>Registrar Chegada</Badge>.</Step>
                <Step n={3}>Pronto! A chegada fica gravada com o horário automático.</Step>
                <Tip>Se o caminhão não estiver na lista, use o botão <strong>+ Registrar</strong> no topo e preencha manualmente.</Tip>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 2 — 🔵 Saída p/ Rota</p>
                <Step n={1}>Abra a aba <Badge variant="outline">Pátio</Badge> e ache o caminhão.</Step>
                <Step n={2}>Clique em <Badge>Saída p/ Rota</Badge>.</Step>
                <Step n={3}>Preencha: <strong>Rota</strong>, <strong>KM Inicial</strong> do painel.</Step>
                <Step n={4}>Tire a <strong>foto do painel</strong> mostrando o KM.</Step>
                <Step n={5}>Clique em Salvar.</Step>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 3 — 🟡 Retorno</p>
                <Step n={1}>Quando o caminhão voltar da rota, vá na aba <Badge variant="outline">Pátio</Badge>.</Step>
                <Step n={2}>Clique em <Badge>Retorno</Badge>.</Step>
                <Step n={3}>Preencha o <strong>KM Final</strong> e tire a <strong>foto do painel</strong>.</Step>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 4 — 🔒 Saída Final c/ Lacre</p>
                <Step n={1}>Quando o caminhão for sair de vez, clique em <Badge>Lacre</Badge>.</Step>
                <Step n={2}>Anote o <strong>número do lacre</strong> e tire <strong>foto do lacre</strong> fechado.</Step>
                <Step n={3}>Salve. O caminhão sai do pátio e vai para o histórico.</Step>
                <Warn>Sem foto do lacre não dá pra finalizar. Confira se a foto saiu nítida antes de salvar.</Warn>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold mt-3 mb-2">🔄 Fluxo de Terceirizado — 3 etapas:</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre">
{`🟠 Chegada  →  📦 Carregamento  →  🚛 Saída c/ Lacre`}
                </pre>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 1 — 🟠 Chegada (Entrada)</p>
                <Step n={1}>Quando o caminhão chega, clique em <Badge>+ Registrar</Badge>.</Step>
                <Step n={2}>Preencha: <strong>Placa</strong>, <strong>Motorista</strong>, <strong>Transportadora</strong>.</Step>
                <Step n={3}>Tire <strong>foto da placa</strong> (a câmera reconhece automaticamente — OCR).</Step>
                <Step n={4}>Se o veículo está na aba <Badge variant="outline">Esperados</Badge>, clique nele para preencher tudo automaticamente.</Step>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 2 — 📦 Carregamento</p>
                <Step n={1}>Vincule o caminhão à <strong>carga fechada</strong> que ele vai levar.</Step>
                <Step n={2}>Anexe o <strong>documento</strong> e a <strong>nota fiscal</strong> (foto ou PDF).</Step>

                <p className="text-sm font-semibold mt-4 mb-1">Etapa 3 — 🚛 Saída c/ Lacre</p>
                <Step n={1}>Na aba <Badge variant="outline">Pátio</Badge>, clique em <Badge>Saída</Badge>.</Step>
                <Step n={2}>Anote o <strong>número do lacre</strong> e tire <strong>foto do lacre</strong>.</Step>
                <Step n={3}>Salve. Pronto, finalizado!</Step>
                <Warn>Sempre confira a placa na foto antes de liberar o caminhão.</Warn>
              </>
            )}
          </Section>

          <Section value="s5" icon={ParkingCircle} title="5. Aba Pátio (veículos lá dentro)">
            <What>Lista de todos os veículos que ainda estão dentro do pátio (não saíram).</What>
            <Step n={1}>Cada linha mostra: placa, motorista, há quanto tempo entrou e a etapa atual.</Step>
            <Step n={2}>Clique no botão da próxima etapa (ex: <Badge>Saída p/ Rota</Badge>) para avançar.</Step>
            <Step n={3}>As cores indicam o status:
              <span className="inline-flex gap-1 ml-2 flex-wrap">
                <Badge className="bg-orange-500">Chegou</Badge>
                <Badge className="bg-blue-500">Em Rota</Badge>
                <Badge className="bg-yellow-500 text-black">Retornou</Badge>
              </span>
            </Step>
            <Tip>Se o pátio estiver vazio, é porque ninguém está lá dentro no momento — é ótimo sinal!</Tip>
          </Section>

          <Section value="s6" icon={History} title="6. Aba Histórico (tudo que já aconteceu)">
            <What>Lista completa de todos os registros (entradas + saídas) do período escolhido.</What>
            <Step n={1}>Use o filtro <strong>Tipo</strong> (canto superior direito) para ver só Entradas ou só Saídas.</Step>
            <Step n={2}>Use a <strong>busca</strong> no topo para achar por placa, motorista ou empresa.</Step>
            <Step n={3}>Clique em qualquer linha para abrir os <strong>Detalhes</strong> completos.</Step>
            <Step n={4}>Para baixar tudo em planilha, clique em <Badge variant="outline">CSV</Badge> no topo (só Admin/Logística).</Step>
          </Section>

          <Section value="s7" icon={Search} title="7. Detalhes de um Registro">
            <What>Tela popup que mostra TUDO sobre uma movimentação: horários, fotos, observações.</What>
            <Step n={1}>Clique em qualquer registro no Histórico para abrir.</Step>
            <Step n={2}>Veja a <strong>linha do tempo</strong> com cada etapa e horário.</Step>
            {isCarga && <Step n={3}>Para Carga Própria você verá os 4 marcos: Chegada → Saída p/ Rota → Retorno → Saída Final.</Step>}
            <Step n={isCarga ? 4 : 3}>Clique em qualquer foto (placa, painel, lacre, nota) para ampliar e baixar.</Step>
            <Tip>Quem vai usar isso pra auditoria: todas as fotos ficam guardadas e podem ser baixadas a qualquer momento.</Tip>
          </Section>

          <Section value="s8" icon={ClipboardCheck} title="8. Aba Esperados (planilha do dia)">
            <What>Lista dos veículos que já estavam previstos para aquele dia (vem da planilha de logística).</What>
            <Step n={1}>Mostra veículos numa janela de <strong>±3 dias</strong> da data filtrada.</Step>
            <Step n={2}>Quando o caminhão chega, clique nele para registrar a chegada {isCarga && <em>(em Carga Própria é 1 clique e pronto)</em>}.</Step>
            <Step n={3}>Veículos já conferidos ficam marcados com ✅.</Step>
            <Step n={4}>Para <strong>importar</strong> uma nova planilha: botão <Badge variant="outline">Importar</Badge> no topo (só Admin/Logística).</Step>
            <Warn>Se um veículo está previsto para amanhã mas chegou hoje, aparece um aviso amarelo. Confirme antes de registrar.</Warn>
          </Section>

          <Section value="s9" icon={Bell} title="9. Solicitações e Cargas Aguardando">
            <What>Painéis amarelos que aparecem acima das abas, avisando o que precisa de atenção AGORA.</What>
            <p className="text-sm font-semibold mt-3">📥 Solicitações Pendentes</p>
            <p className="text-sm">Quando alguém pede entrada (walk-in) sem estar na planilha, aparece aqui pra você aprovar ou negar.</p>
            <p className="text-sm font-semibold mt-3">📦 Cargas Fechadas Aguardando</p>
            <p className="text-sm">Cargas que o pessoal de logística já fechou e estão esperando o caminhão chegar pra carregar.</p>
            <Tip>Confira esses painéis sempre que entrar na tela — eles são prioridade.</Tip>
          </Section>

          <Section value="s10" icon={Camera} title="10. Fotos e Documentos">
            <What>Todo registro importante exige foto. Aqui é como tirar e anexar.</What>
            <Step n={1}>Clique no botão de câmera 📷 no formulário.</Step>
            <Step n={2}>No celular: a câmera abre direto. Aponte e tire.</Step>
            <Step n={3}>Se for documento (nota fiscal), você pode anexar um <strong>PDF</strong> também.</Step>
            <Step n={4}>O sistema lê a placa automaticamente (OCR) — confira se ele acertou antes de salvar.</Step>
            <Warn>Foto tremida ou escura pode dar problema. Tire de novo se não estiver nítida.</Warn>
          </Section>

          <Section value="s11" icon={Search} title="11. Campo de Busca">
            <What>Barra de busca no topo que procura em todas as listas ao mesmo tempo.</What>
            <p className="text-sm">Você pode digitar:</p>
            <ul className="text-sm list-disc pl-5 space-y-1 mt-1">
              <li>📋 <strong>Placa</strong> (ex: ABC1D23)</li>
              <li>👤 <strong>Nome do motorista</strong></li>
              <li>🏢 <strong>Empresa / transportadora</strong></li>
              <li>🆔 <strong>Documento</strong> ou nome do visitante</li>
              <li>🛣️ <strong>Rota</strong></li>
            </ul>
            <Tip>Não precisa digitar tudo — basta uma parte. Ex: "ABC" já encontra "ABC1D23".</Tip>
          </Section>

          <Section value="s12" icon={HelpCircle} title="12. Problemas Comuns (FAQ)">
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold">❓ Não consigo achar um caminhão.</p>
                <p className="text-muted-foreground">Confira o <strong>filtro de data</strong> no topo. Talvez ele tenha entrado em outro dia. Tente "Últimos 7 dias".</p>
              </div>
              <div>
                <p className="font-semibold">❓ Tirei foto errada, e agora?</p>
                <p className="text-muted-foreground">Se ainda não salvou, clique no X e tire de novo. Se já salvou, peça ajuda ao admin para editar.</p>
              </div>
              <div>
                <p className="font-semibold">❓ Esqueci de registrar a chegada.</p>
                <p className="text-muted-foreground">Use o botão <Badge>+ Registrar</Badge> e preencha manualmente. Avise o supervisor.</p>
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

          <Section value="s13" icon={Palette} title="13. Legenda de Cores e Ícones">
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold mb-1">Etapas (Carga Própria):</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-orange-500">🟠 Chegou</Badge>
                  <Badge className="bg-blue-500">🔵 Em Rota</Badge>
                  <Badge className="bg-yellow-500 text-black">🟡 Retornou</Badge>
                  <Badge className="bg-green-600">🔒 Finalizado</Badge>
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
                <p className="font-semibold mb-1">Ícones de fotos:</p>
                <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                  <li>📷 Foto da Placa</li>
                  <li>🛞 Painel de KM</li>
                  <li>🔒 Lacre</li>
                  <li>📄 Documento</li>
                  <li>📋 Nota Fiscal</li>
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
