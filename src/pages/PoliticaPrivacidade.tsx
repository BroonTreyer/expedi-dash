import { LegalLayout, CONTATO_EMAIL } from "./legal/LegalLayout";

export default function PoliticaPrivacidade() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="15/05/2026">
      <p>
        Esta Política de Privacidade descreve como o <strong>FricoTrack</strong> coleta, utiliza, armazena e
        protege os dados pessoais e operacionais dos usuários da plataforma, em conformidade com a Lei Geral
        de Proteção de Dados (LGPD — Lei nº 13.709/2018).
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Dados de cadastro:</strong> nome, e-mail e função (perfil de acesso).</li>
        <li><strong>Dados operacionais:</strong> informações de pedidos, cargas, motoristas, veículos, clientes e movimentações de portaria registradas no uso da plataforma.</li>
        <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, data e hora de acesso, registros de auditoria (logs).</li>
      </ul>

      <h2>2. Finalidade do tratamento</h2>
      <ul>
        <li>Permitir o login e o uso seguro da plataforma.</li>
        <li>Executar funções operacionais de expedição, portaria, faturamento e logística.</li>
        <li>Garantir rastreabilidade, auditoria e segurança das operações.</li>
        <li>Cumprir obrigações legais, contratuais e fiscais.</li>
      </ul>

      <h2>3. Base legal</h2>
      <p>
        O tratamento dos dados é realizado com base na execução de contrato, no cumprimento de obrigação legal
        e no legítimo interesse do controlador, conforme art. 7º da LGPD.
      </p>

      <h2>4. Compartilhamento de dados</h2>
      <p>
        Os dados <strong>não são vendidos</strong> a terceiros. Podem ser compartilhados com prestadores de
        serviço estritamente necessários à operação (hospedagem em nuvem, e-mail, autenticação), todos sujeitos
        a obrigações de confidencialidade e segurança.
      </p>

      <h2>5. Armazenamento e segurança</h2>
      <p>
        Os dados são armazenados em infraestrutura de nuvem com criptografia em trânsito (HTTPS/TLS) e em
        repouso, controle de acesso por perfil (RLS) e backups periódicos.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Utilizamos cookies e armazenamento local apenas para manter a sessão do usuário autenticado e
        preferências de interface. Não usamos cookies de rastreamento publicitário.
      </p>

      <h2>7. Retenção</h2>
      <p>
        Dados de cadastro são mantidos enquanto a conta estiver ativa. Dados operacionais e logs de auditoria
        podem ser retidos por até 5 anos para cumprimento de obrigações legais e fiscais.
      </p>

      <h2>8. Direitos do titular</h2>
      <p>Você pode solicitar a qualquer momento:</p>
      <ul>
        <li>Confirmação da existência de tratamento;</li>
        <li>Acesso, correção ou atualização dos seus dados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Portabilidade ou revogação de consentimento.</li>
      </ul>
      <p>
        Para exercer seus direitos, consulte a página de{" "}
        <a href="/exclusao-de-dados">Exclusão de Dados</a> ou escreva para{" "}
        <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>.
      </p>

      <h2>9. Contato</h2>
      <p>
        Encarregado de Proteção de Dados (DPO):{" "}
        <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Esta Política pode ser atualizada periodicamente. A data da última atualização está indicada no topo
        desta página.
      </p>
    </LegalLayout>
  );
}