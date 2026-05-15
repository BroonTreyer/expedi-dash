# Criar 3 páginas legais públicas

Adicionar três novas páginas públicas (sem autenticação) ao FricoTrack:

1. `/politica-de-privacidade` — Política de Privacidade
2. `/termos-de-servico` — Termos de Serviço
3. `/exclusao-de-dados` — Exclusão de Dados

## O que será feito

**Novos arquivos:**
- `src/pages/PoliticaPrivacidade.tsx`
- `src/pages/TermosServico.tsx`
- `src/pages/ExclusaoDados.tsx`

Cada página terá:
- Layout limpo, centralizado, legível (max-w-3xl, tipografia confortável)
- Cabeçalho com logo/nome FricoTrack e link "Voltar"
- Conteúdo em seções (h2 / parágrafos), data de "última atualização"
- Rodapé com links cruzados entre as 3 páginas
- Responsivo (mobile-first)
- Usa tokens do design system (sem cores hardcoded)

**Alterações em `src/App.tsx`:**
- Registrar as 3 rotas como **públicas** (fora de `ProtectedRoute`), iguais a `/portal/:token`
- Lazy-load com `lazyWithRetry`

**Conteúdo padrão (LGPD-friendly):**
- **Privacidade:** dados coletados (nome, e-mail, dados operacionais de logística), finalidade, base legal, compartilhamento, direitos do titular, contato do controlador, cookies, retenção.
- **Termos:** descrição do serviço (gestão de expedição/portaria), conta e responsabilidade do usuário, uso aceitável, propriedade intelectual, limitação de responsabilidade, rescisão, foro.
- **Exclusão de Dados:** como solicitar exclusão (formulário simples de e-mail + descrição **mailto:** para o e-mail de contato), prazo de atendimento (até 15 dias), o que é/não é excluído (registros fiscais/logísticos retidos por obrigação legal).

## Perguntas antes de implementar

1. **E-mail de contato** para exibir nas 3 páginas (DPO / suporte). Ex.: `contato@fricotrack.com.br`?
2. **Razão social / CNPJ** do controlador para a Política (opcional — posso deixar genérico "FricoTrack" se preferir)?
3. A página `/exclusao-de-dados` deve ser apenas **informativa com mailto:**, ou um **formulário** que envia para um e-mail / grava no banco?

Se preferir, posso implementar com defaults sensatos (e-mail genérico `contato@fricotrack.com.br`, sem CNPJ, exclusão via mailto:) e você ajusta depois.
