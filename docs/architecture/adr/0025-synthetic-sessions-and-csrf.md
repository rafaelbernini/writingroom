# ADR-0025 — Sessões e CSRF no ambiente sintético

2026-11-03. Aceita somente como prova em memória. Complementa ADR-0024; não implementa OIDC, verificação de e-mail, servidor HTTP ou login do produto.

## Fronteira

`packages/sharing-spike/src/session-harness.mjs` recebe objetos com método/caminho/origem/cookie/CSRF/body e devolve status/cabeçalhos/body. Transporte é chamada de função, sem socket, navegador, TLS ou persistência. Origem fixa `https://sharing.invalid`, domínio reservado. O dispatcher não pode ser conectado a um listener ou importado no servidor 4173. `issueSyntheticCode` é emissor exclusivo de fixture e permite ao teste escolher subject; nunca é rota nem prova de identidade real. A prova não valida issuer/audience/nonce/PKCE/assinatura de provedor. Esses controles continuam obrigatórios no adaptador OIDC futuro.

Sessão define subject; campos actor/subject no body são rejeitados. O dispatcher só conecta a política sintética da ADR-0024. IDs de obras/cenas são inventados, sem acesso a disco ou manuscritos. Sem schema, migração, credenciais, serviço externo ou conta nova. Aplicativo mantém alpha.18/studio-17 e compatibilidade 1–7/v1–v3.

## Comportamento testável

Início sintético usa POST e Origin exata, gera state e CSRF de 256 bits. Emissor de fixture vincula código a state/dispositivo/subject; código expira em 60 segundos e pré-login em cinco minutos. Completar exige POST, state/código/CSRF correspondentes e consome o pré-login e código. Sessão anterior enviada na reautenticação é invalidada e substituída por ID e CSRF novos. Estado em memória retém hashes dos tokens, não tokens brutos. Valores retornados não são registrados em log.

Cookie modelado `__Host-wroom_synthetic`, Path=/, Secure, HttpOnly, SameSite=Lax, sem Domain. Parser aceita um único cookie desse nome; IDs desconhecidos não são promovidos. Esses atributos são strings verificadas em teste, não evidência de proteção em navegador/TLS. Origin é exigida até para leitura neste harness: isso não define automaticamente o comportamento de GET em um adaptador real.

Toda mutação autenticada exige CSRF da sessão e Origin exata; GET só consulta `/session`, nunca aceita/revoga convite. Prévia de convite usa POST para manter token fora de URL. Sessão expira após 30 minutos sem operação bem-sucedida ou 12 horas absolutas. Falhas não renovam atividade. Logout remove sessão e devolve cookie expirado. Revogar dispositivo remove sessões e códigos pendentes daquele subject/dispositivo sem afetar outro subject. Não é banimento permanente: uma nova autenticação sintética explícita pode autorizar nova sessão; não representa confiança de dispositivo/chave nem recuperação.

Negativas usam mesmo status 403/body genérico e no-store. Isso testa uniformidade estrutural, não tempo constante ou proteção completa contra enumeração. Início não consulta e-mail; nomes declarados não se tornam identidades verificadas. Há até cinco inícios por minuto por source injetada pelo transporte de fixture, e até 1000 entradas em cada mapa. Source não é body nem cabeçalho confiável de cliente: adaptador futuro precisa derivar origem de transporte e definir proxy confiável. Limitação de callback, proteção distribuída contra abuso e política por conta ainda pendentes. Entradas expiradas são removidas antes das operações; reiniciar invalida tudo.

## Evidência e continuação

Sete testes em `packages/core/test/sharing-sessions.test.mjs`: fixação/rotação, replay/state/CSRF/expiração, Origin/método/cookie duplicado/impersonação, convites por subject e escopo, dois dispositivos/logout/revogação, prazo ocioso/absoluto e negativas/limite/reinício. Testes usam relógio injetado sem esperar prazos reais. Junto dos seis testes de política, treze cenários cobrem a fronteira sintética. Não há validação HTTP/Firefox nova porque nenhum servidor ou UI foi alterado.

Próximo incremento: ADR e prova de persistência transacional de convites/grants/recibos, concorrência, crash, backup/restauração e invalidação de sessões ao restaurar. Só depois integrar um adaptador HTTP isolado com parsing/limites de bytes e teste real de cookies/CSRF; não reutilizar o servidor local nem publicar a fixture. HPKE/key binding e OIDC reais continuam gates independentes.

Fontes primárias reconferidas em 2026-11-03: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) para rotação, atributos e expiração; [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) para token vinculado à sessão e Origin. A aplicação desses controles no harness é uma decisão interna, sem auditoria externa.

Regressão executada: 256 testes Node aprovados, sem falhas/skips. Log `/tmp/writingroom-synthetic-sessions-tests.log`. Os 13 cenários sintéticos também passaram isoladamente.

Atualização posterior: transporte HTTPS isolado entregue na ADR-0027, que autoriza exclusivamente esse adaptador loopback sobre o harness. Emissor de fixture permanece fora da rede; proibição de integrar ao servidor 4173 preservada. Verificação de cookies em navegador continua pendente.
