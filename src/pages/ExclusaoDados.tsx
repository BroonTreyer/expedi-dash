import { LegalLayout, CONTATO_EMAIL } from "./legal/LegalLayout";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function ExclusaoDados() {
  const subject = encodeURIComponent("Solicitação de exclusão de dados - FricoTrack");
  const body = encodeURIComponent(
    "Olá,\n\nSolicito a exclusão dos meus dados pessoais da plataforma FricoTrack.\n\n" +
      "Nome completo: \nE-mail cadastrado: \nEmpresa/Conta: \nMotivo (opcional): \n\nObrigado.",
  );
  const mailto = `mailto:${CONTATO_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <LegalLayout title="Exclusão de Dados" updatedAt="15/05/2026">
      <p>
        Você tem o direito de solicitar a exclusão dos seus dados pessoais da plataforma{" "}
        <strong>FricoTrack</strong>, conforme previsto na LGPD (Lei nº 13.709/2018).
      </p>

      <h2>Como solicitar</h2>
      <p>
        Envie um e-mail para{" "}
        <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a> contendo:
      </p>
      <ul>
        <li>Nome completo;</li>
        <li>E-mail cadastrado na plataforma;</li>
        <li>Empresa / conta vinculada;</li>
        <li>Descrição da solicitação (exclusão total ou de dados específicos).</li>
      </ul>

      <div className="not-prose my-6">
        <Button asChild size="lg">
          <a href={mailto}>
            <Mail className="h-4 w-4 mr-2" />
            Solicitar exclusão por e-mail
          </a>
        </Button>
      </div>

      <h2>Prazo de atendimento</h2>
      <p>
        Solicitações são analisadas e respondidas em até <strong>15 dias úteis</strong> a partir do
        recebimento.
      </p>

      <h2>O que é excluído</h2>
      <ul>
        <li>Dados de cadastro do usuário (nome, e-mail, perfil de acesso);</li>
        <li>Preferências e configurações pessoais.</li>
      </ul>

      <h2>O que pode ser retido</h2>
      <p>
        Por obrigação legal, fiscal ou contratual, alguns registros operacionais podem ser mantidos de
        forma anonimizada ou pseudonimizada, tais como:
      </p>
      <ul>
        <li>Registros de cargas, pedidos e movimentações de portaria;</li>
        <li>Logs de auditoria e segurança;</li>
        <li>Documentos fiscais associados a operações realizadas.</li>
      </ul>

      <h2>Confirmação</h2>
      <p>
        Após a conclusão, você receberá um e-mail confirmando a exclusão dos dados elegíveis.
      </p>

      <h2>Mais informações</h2>
      <p>
        Consulte também nossa{" "}
        <a href="/politica-de-privacidade">Política de Privacidade</a> e os{" "}
        <a href="/termos-de-servico">Termos de Serviço</a>.
      </p>
    </LegalLayout>
  );
}