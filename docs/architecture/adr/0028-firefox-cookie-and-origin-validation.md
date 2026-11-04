# ADR-0028 — Cookies e origens no Firefox isolado

2026-11-03. Aceita como evidência de navegador para a prova sintética das ADRs 0024–27. Aplicativo permanece alpha.20/studio-19; sem alterações na UI, servidor 4173, obras ou dependências de produção.

## Decisão e ajuste encontrado

`verify-sharing-cookies-firefox.py` exercita o adaptador HTTPS no Firefox real com perfil descartável. Um processo Node exclusivo de teste (`scripts/fixtures/sharing-browser-server.mjs`) cria o diário sintético e servidores loopback. Identidades/códigos só são emitidos por mensagens nos pipes stdin/stdout do processo, sem rota de provisionamento ou autenticação real. Segredos de sessão/código não são escritos no relatório; observação de requests registra apenas método, caminho sem query, Fetch Metadata e presença booleana de cookies.

A prova anterior exigia Origin mesmo em GET /session; um fetch GET normal do navegador pode omitir esse cabeçalho. Agora, somente GET /session pode omiti-lo quando Sec-Fetch-Site é exatamente same-origin e Host corresponde ao IP/porta do adaptador. Origin estrangeira explícita continua negada mesmo se o outro cabeçalho disser same-origin. GET sem ambos os sinais, same-site/cross-site/none ou com body é negado. O dispatcher recebe a origem normalizada apenas após esse filtro. POST continua exigindo Origin exata e CSRF vinculado à sessão. Não há fallback baseado em Referer ou cabeçalho de proxy.

Teste Node novo preserva essas negativas, além de confirmar que o documento de fixture está desativado no modo padrão. Não habilitar um fallback genérico de Origin ausente para permitir integração futura.

## Documento e observação exclusivos de fixture

`enableBrowserFixture=true` habilita somente GET /_synthetic/browser com Host exato. HTML constante contém aviso sintético, sem código, dados, arquivos, sessão ou emissor. CSP permite conexão/form apenas para self, sem scripts da página, e proíbe framing. Instrumentação de observação só roda com esse opt-in e callback injetado pelo teste. Não existe endpoint de leitura de observações. Sem opt-in, ambos ficam indisponíveis. Não é frontend de login do produto.

Duas origens adicionais são servidas apenas pelo script de fixture: HTTPS localhost (outro site) e HTTPS 127.0.0.1 em outra porta (mesmo site, outra origem); HTTP 127.0.0.1 observa o comportamento específico do loopback. Nenhum conteúdo de terceiros ou requisição externa é necessário.

## Certificados e perfil

O teste cria CA e certificado servidor distintos com openssl, SAN IP 127.0.0.1/DNS localhost, CA:false e serverAuth no certificado servidor. Confiança é importada com certutil somente no NSS do perfil temporário. Firefox roda com acceptInsecureCerts=false: cadeia e nome são verificados normalmente. Não modifica certificados/perfil do usuário, trust store global ou credenciais reais. Chaves geradas ficam 0600 no diretório temporário privado. A primeira tentativa com certificado CA usado como servidor foi recusada; a fixture final usa cadeia apropriada.

Política de bloqueio genérico de cookies de terceiros/tracking é desativada **somente nesse perfil de teste**, para que não mascare SameSite. O controle SameSite=None/Secure aparece na requisição cross-site enquanto a sessão Lax é omitida. Isso distingue o efeito de SameSite de um bloqueio geral. Outros navegadores/políticas precisam validação separada.

## Evidência de comportamento

27 verificações Firefox:

- Login sintético same-origin por fetch com Origin e cookie automático, sem construção manual do header Cookie.
- Set-Cookie não fica acessível pelo JavaScript da página; sessão HttpOnly não aparece em document.cookie e tentativa de sobrescrita por JS não substitui a sessão. Cookie __Host sem Secure é rejeitado.
- Cookie armazenado com Secure/HttpOnly/Lax, host-only 127.0.0.1 e Path=/. GET same-origin funciona sem Origin artificial.
- POST sem CSRF ou com CSRF errado é negado e preserva sessão.
- Origem cross-site não lê o cookie; JSON credenciado é bloqueado, sem alterar eventos duráveis. POST simples no-cors alcança o servidor, sem cookie Lax e com cookie None de controle, e não faz logout.
- Navegação top-level GET iniciada pela página cross-site envia cookie Lax, mas transporte nega a consulta porque o contexto não é same-origin. Não é prova de que Lax bloqueia toda navegação cross-site.
- Outra porta HTTPS no mesmo IP é mesma site e outra origem: envia o cookie Lax, mas Origin/Fetch Metadata bloqueiam o logout. SameSite sozinho não substitui Origin/CSRF, e cookies não são isolados por porta.
- Logout same-origin com CSRF válido remove o cookie e invalida sessão.

Artefato final `/tmp/writingroom-browser-szvsbg4l/report.json`. Não guarda valores de sessão/código no relatório. O teste de perfil usa WebDriver com execução de script para dirigir fetch/navegação; isso não equivale a uma auditoria de XSS ou leitor de tela.

## Limite observado de Secure no loopback

Nesta execução do Firefox, a sessão Secure foi enviada também ao HTTP em 127.0.0.1, registrado como `plain_loopback_session_cookie_observed=true`. Trata-se de evidência específica do ambiente de loopback; não declarar que Secure impediu esse envio nem generalizar a domínios públicos. O adaptador da prova continua exclusivamente HTTPS e não recebe login por HTTP; o observador HTTP é só fixture. Como cookies ignoram porta, serviços de teste no mesmo host compartilham esse espaço. Não usar esta topologia como arquitetura pública de implantação.

A prova comprova flags, restrições HttpOnly/prefixo e comportamentos SameSite/Origin no Firefox desktop, mas ainda não valida downgrade/Secure em domínio público, Chrome/Safari, mobile, HSTS, proxy, múltiplas instâncias ou OIDC real. Nenhuma implantação foi realizada para ampliar essa cobertura.

## Próximo passo

Selecionar biblioteca HPKE mantida, confirmar compatibilidade Node/navegador e vetores RFC 9180 em prova offline; definir vinculação de chave/dispositivo sem confiar só no diretório. Não alterar pacotes v1/v2/v3 nem chamar frase compartilhada de E2EE. Depois OIDC/provedor, recovery e integração autenticada dependem dos gates existentes. Credenciais, conta, envio e implantação real continuam exigindo autorização específica.

## Fontes primárias verificadas em 2026-11-03

- [Mozilla/MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie): flags/prefixos e comportamento de cookies; resultado observado do loopback está separado das garantias gerais.
- [Mozilla/MDN Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin): ausência possível em GET e restrição de escrita por scripts.
- [W3C Fetch Metadata](https://www.w3.org/TR/fetch-metadata/) (Working Draft consultado): distinção entre same-origin, same-site, cross-site e none. Regra de aceitação deste adaptador é decisão interna, sem auditoria externa.

Regressão final: 277 testes Node sem falhas/skips e 27 verificações Firefox aprovadas. Log `/tmp/writingroom-browser-cookies-node.log`. As 186 verificações anteriores da UI não foram reexecutadas, pois o aplicativo permanece inalterado.
