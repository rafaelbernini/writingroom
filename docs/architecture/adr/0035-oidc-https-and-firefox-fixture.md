# ADR-0035 — OIDC por HTTPS de fixture e redirects no Firefox

2026-11-04. Aceita para validação sintética, sem conta real, implantação ou mudança da UI alpha.20/studio-19. Preserva obras 1–7 e pacotes v1/v2/v3.

## Transporte e identidade controlada

A prova OIDC da ADR-0034 ganha HTTPS real e teste Firefox, sem usar o servidor 4173. `oidc-fixture-https.mjs` cria o provedor em 127.0.0.1/porta efêmera; o navegador o acessa como `https://localhost:porta`. O relying party usa outro servidor, `https://127.0.0.1:porta`, também restrito ao loopback. Essa separação permite testar navegação entre sites e aplicação de SameSite, com certificado que cobre ambos os hosts.

`oidc-fixture-config.mjs` permite somente os pares reservados `.invalid` anteriores ou esse par exato de hosts HTTPS com portas explícitas. Nada aceita issuer/redirect de requisição, hostname externo, HTTP, userinfo, path adicional ou host parecido. A configuração esperada do adaptador é independente dos claims do token. Os testes em memória anteriores continuam usando os nomes reservados.

`https-transport.mjs` só ativa OIDC com `oidcFixture`, `enableBrowserFixture` e diretório explícitos. Não há fallback para o emissor antigo se essa configuração falhar. O modo OIDC não oferece `issueSyntheticCode` no controle retornado e bloqueia `/synthetic/*` na rede. Configuração/pins de assinatura e conta por issuer/sub continuam privados e pinados; não há discovery ou JWKS remoto.

O controle `authorize` escolhe sub e prepara uma autorização **somente por pipe privado**, antes da navegação. O endpoint GET `/authorize` reconhece a URL exata preparada, de uso único, e responde 302 ao callback fixo. Requisições não preparadas ou com campo de identidade alterado são negadas. Não há formulário ou rota pública para escolher subject, emitir código arbitrário, instalar pin ou revogar chave. O controle `callback` só existe no processo de teste para cenários negativos.

A implementação não autentica pessoas/caixas de e-mail: os claims `@example.invalid` continuam sintéticos. E-mail, issuer OIDC e chave editorial não se tornam a mesma identidade.

## Troca do código e TLS

O servidor do RP troca o código por POST HTTPS `/token` no provedor, com URL fixa e CA de teste explicitamente fornecida. Usa resolução restrita a 127.0.0.1, mantendo hostname/SNI `localhost` e validação nativa do certificado/host; não desativa TLS nem segue redirecionamento de token endpoint.

O backchannel tem deadline total de dois segundos, que destrói a requisição inclusive se DNS/conexão/handshake/resposta não terminarem. Aceita somente 200 e JSON, até 16 KiB; parser recusa estruturas JSON ambíguas. O token endpoint aceita form-urlencoded até 8 KiB, cinco campos únicos e método/path/Host exatos; rejeita Origin/Cookie de navegador, cabeçalhos duplicados, encoding e Expect. PKCE/client/redirect e uso único do código são verificados pelo mesmo núcleo da ADR-0034.

O provedor tem orçamento de 120 requisições/minuto por instância, até 32 conexões e timeouts. Reutiliza os limites de 100 autorizações preparadas/códigos e prazo de um minuto. São limites de fixture, não controles homologados para serviço público. Erros externos são genéricos e não registram código, verifier, JWT ou cookie. Observações de teste guardam apenas path sem query, método, Fetch Metadata e presença booleana de cookies.

## Exceção estrita para callback e limpeza da URL

Mutações do RP mantêm Origin exata, CSRF, Host, allowlist JSON e Fetch Metadata. A única exceção de origem é GET `/oidc/callback?…`: exige Host exato, navegação de documento (`Sec-Fetch-Mode: navigate`, `Sec-Fetch-Dest: document`), Fetch Metadata reconhecida, nenhum Authorization/Origin e corpo vazio. Fetch/iframe/POST não usam essa exceção. O harness ainda exige redirect/issuer/state/código exatos e cookie de prelogin correspondente, além de nonce e PKCE. Fetch Metadata não substitui esse vínculo criptográfico/aleatório.

Sucesso responde 303 com Location constante `/_synthetic/browser`, sem corpo, `Cache-Control: no-store` e `Referrer-Policy: no-referrer`. Instala a nova sessão HttpOnly e elimina cookie de prelogin. A URL final não contém código/state; isso não promete eliminar todos os registros de navegação do navegador ou dados em um proxy externo.

Para recuperar o CSRF após esse redirect sem expô-lo na URL, `browserResult` habilita GET `/oidc/result` somente no modo loopback. O resultado fica em memória por até 60 segundos, indexado pelo hash do cookie de sessão, e é consumido uma vez. A rota exige mesma origem no transporte e sessão atual revalidada no harness; cookies duplicados, sessão revogada, acesso por outra origem e replay são negados. Retorna apenas mode/CSRF; não ID Token, access token, e-mail ou verifier. Não há ID de resultado escolhido pelo cliente. Até 1000 entradas; limpeza por prazo, epoch, logout/revogação ou fechamento. Perder o resultado exige novo login; esse mecanismo existe só para a página de fixture.

## Navegador e ciclo editorial

`scripts/verify-sharing-oidc-firefox.py` usa perfil NSS temporário, CA importada somente naquele perfil e `acceptInsecureCerts=false`. O fluxo navega pelo provedor e pelo callback com redirects reais; a troca de código passa pelo HTTPS do provedor. Confere envio do cookie Lax em GET de documento entre sites, HttpOnly/Secure, eliminação do prelogin, URL final limpa, rotação de sessão/CSRF e invalidação de cookie antigo.

As 41 verificações incluem cookie de outro prelogin, issuer/campo extra, replay, nonce assinado inválido sem substituir sessão atual, resultado de uso único, restart com callback/sessão antigos negados, login sem posse negado, posse no Firefox para owner/editor, convite por escopo, cena privada negada, revogação de grant/dispositivo e ausência de rotas administrativas. Escolha de identidade e revogação durável seguem somente em pipes. Cada dispositivo usa privada não extraível em documento próprio; abas mantêm esses handles durante as operações, enquanto cookies independentes são alternados pelo WebDriver.

Reinício fecha RP e ambos os bancos, reabre SQLite e recria estado/chave do provedor por controle privado. O processo de fixture e seu listener de provedor permanecem vivos; não é SIGKILL/recovery de conta ou reinício do navegador. Não se restauram desafios, prelogins, sessões, resultados ou códigos. As políticas de restore suspenso e de admissão entre dois bancos continuam as ADRs 0031/32; não há nova transação distribuída.

## Evidência e reprodução

11 testes Node HTTPS novos cobrem fluxo/redirect/resultado, metadados e Origin, cookie cruzado e parsing de callback, controles ausentes, claims inválidos, restart, configuração restrita, CA errada, deadline com handshake TLS realmente parado, PKCE/replay no token endpoint e isolamento do resultado por sessão. Os 22 testes em memória permanecem na regressão.

```bash
node --test --test-isolation=none packages/core/test/sharing-oidc-https.test.mjs
python3 scripts/verify-sharing-oidc-firefox.py
python3 scripts/verify-sharing-bound-firefox.py
python3 scripts/verify-sharing-cookies-firefox.py
node --test --test-isolation=none packages/core/test/*.test.mjs
```

A regressão Firefox do ciclo anterior (38) e de cookies (27) também foi reexecutada: a exceção do callback não relaxou as demais rotas. Sem nova execução da UI móvel, que não mudou. Certificados/chaves TLS são temporários e ficam no diretório isolado, sem trust store global, manuscrito ou conta real.

## Continuidade e limites

Próximo: definir idempotência/recibos/reconciliação entre diário e diretório, incluindo queda de resposta após compromisso. Não assumir que falha HTTP significa ausência de mutação ou fazer retry automático de convites. Recovery/reconferência, resistência a substituição/rollback hostil, configuração de provedor real e revisão de segurança continuam gates antes de conteúdo real ou E2EE/v4.

Não implementa login público, autenticação de e-mail real, client authentication de produção, consentimento externo, discovery/rotação JWKS, refresh/UserInfo/logout federado ou recuperação de privadas. Loopback com CA temporária e Firefox desktop não homologa domínio público, proxy, Safari/iOS ou Android. Nenhuma dependência nova nesta etapa, credencial real, mensagem, envio ou deploy.

## Fontes primárias verificadas

- [OIDC Core — Authentication Response Validation](https://openid.net/specs/openid-connect-core-1_0.html#AuthResponseValidation): callback e vínculo à transação.
- [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html): PKCE, redirect e separação de fluxos.
- [RFC 9207](https://www.rfc-editor.org/rfc/rfc9207.html): issuer na resposta de autorização contra mix-up.

Evidência final em 2026-11-04: **346 testes Node sem falhas/skips**, incluindo os **11 HTTPS novos também aprovados isoladamente**. Firefox: **41 OIDC + 38 ciclo anterior + 27 cookies**, todos aprovados nesta etapa. Node `/tmp/writingroom-oidc-https-final-node.log`; isolado `/tmp/writingroom-oidc-https-isolated.log`; OIDC `/tmp/writingroom-browser-5bwcxj3f/report.json`; integrado `/tmp/writingroom-browser-6e324228/report.json`; cookies `/tmp/writingroom-browser-5w0k052m/report.json`.
