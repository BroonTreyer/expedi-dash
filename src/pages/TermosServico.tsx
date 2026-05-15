import { LegalLayout, CONTATO_EMAIL } from "./legal/LegalLayout";

export default function TermosServico() {
  return (
    <LegalLayout title="Termos de Serviço" updatedAt="15/05/2026">
      <p>
        Bem-vindo ao <strong>FricoTrack</strong>. Ao acessar ou utilizar a plataforma, você concorda com
        estes Termos de Serviço. Leia com atenção.
      </p>

      <h2>1. Sobre o serviço</h2>
      <p>
        O FricoTrack é uma plataforma de gestão operacional voltada à expedição, portaria, logística e
        faturamento, oferecendo recursos de cadastro de pedidos, fechamento de cargas, controle de
        movimentações de portaria, relatórios e analytics.
      </p>

      <h2>2. Conta de usuário</h2>
      <ul>
        <li>O acesso é restrito a usuários previamente cadastrados por administradores.</li>
        <li>O usuário é responsável por manter a confidencialidade de suas credenciais.</li>
        <li>Atividades realizadas com sua conta são de sua responsabilidade.</li>
      </ul>

      <h2>3. Uso aceitável</h2>
      <p>É vedado ao usuário:</p>
      <ul>
        <li>Utilizar a plataforma para fins ilícitos ou que violem direitos de terceiros;</li>
        <li>Tentar acessar áreas restritas sem autorização;</li>
        <li>Inserir dados falsos, ofensivos ou maliciosos;</li>
        <li>Realizar engenharia reversa ou cópia não autorizada do sistema.</li>
      </ul>

      <h2>4. Propriedade intelectual</h2>
      <p>
        Todo o conteúdo, código, marca, layout e funcionalidades do FricoTrack são protegidos por direitos
        autorais e demais leis aplicáveis, sendo vedada sua reprodução sem autorização.
      </p>

      <h2>5. Disponibilidade</h2>
      <p>
        Buscamos manter a plataforma disponível em tempo integral, mas não garantimos ausência de
        interrupções decorrentes de manutenção, atualizações ou falhas de terceiros (provedores de nuvem,
        rede, energia).
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        O FricoTrack não se responsabiliza por danos indiretos, lucros cessantes ou prejuízos decorrentes
        de uso indevido da plataforma, inserção de dados incorretos pelos próprios usuários ou
        indisponibilidades ocasionais.
      </p>

      <h2>7. Privacidade</h2>
      <p>
        O tratamento de dados pessoais segue nossa{" "}
        <a href="/politica-de-privacidade">Política de Privacidade</a>.
      </p>

      <h2>8. Rescisão</h2>
      <p>
        O acesso pode ser suspenso ou encerrado a qualquer momento em caso de violação destes Termos,
        encerramento contratual ou por solicitação do próprio usuário.
      </p>

      <h2>9. Alterações dos Termos</h2>
      <p>
        Estes Termos podem ser atualizados a qualquer tempo. A continuidade do uso após a publicação
        implica concordância com as novas condições.
      </p>

      <h2>10. Foro</h2>
      <p>
        Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro do domicílio do controlador
        para dirimir eventuais controvérsias.
      </p>

      <h2>11. Contato</h2>
      <p>
        Dúvidas sobre estes Termos:{" "}
        <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}