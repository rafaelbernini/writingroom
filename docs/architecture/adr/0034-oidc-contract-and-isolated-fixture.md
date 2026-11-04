# ADR-0034 — Contrato OIDC e provedor de fixture isolado

2026-11-04. Aceita para prova de contrato, sem conta real, rede ou integração à UI. Aplicativo alpha.20/studio-19, obras 1–7 e pacotes v1/v2/v3 preservados.

## Alcance e dependência

`packages/sharing-spike/src/oidc-fixture-provider.mjs` e `oidc-fixture-session.mjs` exercitam Authorization Code + PKCE S256 com ID Token JWT assinado, exclusivamente por chamadas em memória. Os endereços HTTPS `.invalid` são identificadores reservados de teste: não são visitados e nenhum servidor OIDC, discovery ou callback HTTP é instalado. Não é implementação OIDC de produção, certificação OpenID ou verificação de uma caixa de e-mail.

Selecionada `jose` **6.2.15**, MIT, sem dependências de execução, apenas devDependency exata e integrity no lockfile. Metadados consultados no registro npm e documentação primária em 2026-11-04. `SignJWT`, `jwtVerify`, geração de par e resolução JWKS local são fornecidos pela biblioteca; não há implementação própria de JWS/assinatura. ES256/P-256 é a única assinatura aceita nesta fixture. Essa chave é separada das identidades Ed25519 editoriais e das chaves X25519 dos dispositivos. Não promover a escolha de biblioteca JWT a um cliente OIDC de produção sem revisar o adaptador de protocolo/transportes.

## Configuração e identidade

Configuração fixada e copiada na criação: issuer `https://oidc-fixture.invalid`, client_id `writingroom-fixture`, autorização `/authorize`, redirect `https://sharing.invalid/oidc/callback`, algoritmo ES256 e um JWKS público local pinado. Não há endpoint dinâmico ou consulta de URL fornecida por token/usuário. `jku`, `jwk`, headers desconhecidos, `kid` novo, chave diferente e algoritmo diferente são recusados. Rotação/discovery/cache/revogação de chave de emissor exigem próximo contrato; não confiar silenciosamente em uma chave recebida.

Contas de teste são mapeamento explícito de `(issuer, sub)` para subject interno da política, com unicidade dos dois lados. O issuer único vem da configuração, não do corpo da requisição. E-mail não é chave da conta e não associa contas ou grants por coincidência. Trocar o endereço sintético mantendo sub preserva subject; um sub desconhecido com e-mail conhecido é negado.

A fixture exige `email_verified` booleano verdadeiro e endereço em `@example.invalid`. Isso exercita uma política de claims, **não autentica e-mail real**. Antes de provedor real: avaliar significado/verificação do claim, mudança de endereço, reautenticação, política de conta e recuperação. Nome/e-mail declarado pelo emissor antigo continuam sem essa garantia.

## Início, navegador e callback

`POST /oidc/login/start`, como objeto em memória, exige Origin sintética exata, fonte de teste e somente dispositivo no corpo. Aproveita os limites existentes: cinco inícios por fonte/minuto, limites de logins do harness e mais 100 prelogins desta composição. Futuro adaptador deve derivar fonte do transporte, nunca de cabeçalho encaminhado ou parâmetro público.

Cada início cria state, nonce, verifier e segredo de navegador aleatórios independentes de 256 bits. Verifier permanece no servidor em memória; somente seu SHA-256 em base64url vai à autorização (`code_challenge_method=S256`). Resposta de início inclui URL de autorização, não verifier, código de sessão ou ID Token. O segredo de navegador vai em cookie `__Host-wroom_oidc_login`, Secure/HttpOnly/SameSite=Lax, Path=/, Max-Age=300; guarda-se somente seu hash. State é índice por hash, nonce/verifier ficam no registro volátil. Prazos: prelogin cinco minutos, código de autorização um minuto, ID Token um minuto, sem tolerância de relógio na fixture determinística.

State sozinho não basta: callback exige o cookie de prelogin correspondente, sem duplicatas. O modelo recebe URL absoluta e só aceita GET no redirect exato, com `code`, `state`, `iss` uma vez cada, sem fragmento, campos extras ou issuer divergente. Limite de URL: 4096 caracteres. Uma tentativa com outro navegador/state/redirect é negada antes da troca e não consome o fluxo legítimo.

Depois do vínculo ao navegador, o callback reivindica state sincronicamente, removendo-o antes de qualquer await da troca. Há no máximo 16 trocas em andamento; atingir o limite não consome o state/código daquele callback. A mesma resposta concorrente não cria duas sessões. Falha de troca/verificação consome o fluxo reivindicado e limpa cookie de prelogin, sem fallback para login sintético ou retry automático.

## Provedor e validação do token

O controle privado `provider.authorize` seleciona sub e cria código; overrides adversariais de claims/headers são controles de teste. Não são rotas ou campos de requisição. Autorizações exigem client/redirect exatos, response_type=code, scope=`openid email`, nonce/state/challenge válidos e PKCE S256; implicit/plain são recusados.

`exchange` recebe grant_type authorization_code, client_id, redirect_uri, code e verifier. Código só fica no mapa pelo hash, expira em um minuto e é reivindicado antes da assinatura. Client/redirect/verifier errados consomem a tentativa de resgate, que não pode ser repetida. Não há refresh token. Access token aleatório na resposta não serve como identidade ou permissão editorial.

O adaptador verifica assinatura via JWKS pinado e `jose`, algoritmo/typ/kid, issuer, audience e claims obrigatórios. Depois confere nonce exato; audiência deve ser **string única igual ao client_id**, uma restrição deste contrato; `azp`, se presente, também deve coincidir. Confere sub conhecido, email/verified sintéticos, iat/exp inteiros, sem iat futuro, exp posterior a iat, duração máxima/idade de 60 segundos e validade no relógio do teste. JWT tem limite de 8192 caracteres. O parser/validador da biblioteca trata erros de assinatura/algoritmo/claims; a fixture não confia em decode sem verificar.

## Sessão, awaits e posse

Só depois da validação o adaptador usa internamente o emissor privado do harness sintético existente. Nenhum método público do adaptador emite subject arbitrário. Rotas `/synthetic/*` ficam bloqueadas nessa composição. Handoff usa o state/dispositivo de início, nunca subject enviado pelo cliente. Login roda a sessão e CSRF, invalida cookie anterior quando fornecido e limpa prelogin. Tokens OIDC/e-mail/verifier não entram na resposta, cookies de sessão, projetos ou diretório.

A composição exige diretório e reaproveita `createDeviceBoundSessionHarness`: login não ativa dispositivo nem concede acesso. Continua necessária prova de posse por sessão e autorização atual de escopo. Privadas de dispositivos não são derivadas de JWT ou e-mail.

Request, configuração, contas e dados de controle são copiados antes de awaits; callback de exchange é capturado ao construir. Antes/depois da troca e da verificação, revalidam-se geração, prazo de login, epoch do diário e suspensão de diário/diretório. Logout/revogação de sessões bem-sucedidos invalidam **todos** os prelogins e handoffs em andamento nesta instância, uma política conservadora da fixture que também pode exigir repetir login de outro usuário. Não equivale a gestão seletiva de sessões de um provedor real. `close` cancela handoffs e impede dispatch futuro.

## Evidência e limites

22 testes Node novos: fluxo completo com posse/escopo, cookies e rotação, sessão cruzada, concorrência/replay, PKCE/client/redirect, vetor S256 da RFC 7636, troca de códigos, assinatura inválida/chave desconhecida/HS256/none, nonce/issuer/aud/azp/sub errados, claims/prazos, e-mail sem associação implícita, expiração/reinício, falha de exchange sem fallback, logout/revogação/fechamento durante await, epoch/suspensão, deadline durante await, snapshot de configuração/request e limites de prelogins/trocas.

```bash
node --test --test-isolation=none packages/core/test/sharing-oidc.test.mjs
node --test --test-isolation=none packages/core/test/*.test.mjs
```

Os testes usam autoridade sintética em memória e diretório SQLite separado; epoch/suspensão do diário são sinais controlados no teste, não novo ensaio de backup/restore real. O ciclo Firefox da ADR-0033 continua evidência anterior: **não testa este OIDC**, pois o novo adaptador não está no transporte HTTPS. Flags de cookie aqui são contrato de cabeçalho, sem nova execução no navegador.

Sem discovery, HTTP/token endpoint real, redirects em navegador, consentimento real, client authentication de serviço público, UserInfo, refresh/logout federado, recuperação de conta, persistência das transações OIDC ou prazo de I/O externo. Exchange é função local; até 16 funções pendentes podem permanecer aguardando enquanto o controlador de teste não as liberar. Um futuro backchannel de rede precisa timeout/abort efetivo, limite de resposta e TLS/host/redirect estritos antes de uso externo. Reinício descarta prelogins/códigos/sessões; não restaura privadas/pins nem dá acesso a backup suspenso.

## Próxima fase

Ligar esse contrato ao HTTPS **de fixture** e validar redirects/callback/cookies no Firefox, com escolha de identidade só no controle privado, sem relaxar Origin nas rotas de mutação. Depois formalizar idempotência/recibos/reconciliação entre diário e diretório e exercitar falha de resposta após compromisso. Provedor/conta real, E2EE/v4 e conteúdo real permanecem bloqueados por recovery/reconferência, resistência a substituição/rollback e revisão dos transportes. Sem credenciais, mensagens, envios ou deploy.

## Fontes primárias verificadas

- [OpenID Connect Core 1.0, ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation): validação de identidade e claims.
- [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html): práticas OAuth, PKCE e redirect exato.
- [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html): PKCE S256 e vetor do apêndice B.
- [RFC 9207](https://www.rfc-editor.org/rfc/rfc9207.html): issuer na resposta de autorização, proteção contra mix-up.
- [jose](https://github.com/panva/jose) e [jwtVerify](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md): assinaturas/verificação, JWKS local e MIT; versão exata e integrity no package-lock.json.

Evidência final em 2026-11-04: **335 testes Node aprovados sem falhas/skips**, incluindo os **22 testes OIDC** também aprovados isoladamente. Logs `/tmp/writingroom-oidc-final-node.log` e `/tmp/writingroom-oidc-isolated-node.log`. Sem nova execução Firefox nesta etapa.
