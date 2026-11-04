# ADR-0027 — Transporte HTTPS sintético e isolado

2026-11-03. Aceita para prova local, complementa ADRs 0024–26. Produto continua alpha.20/studio-19; nenhum endpoint foi adicionado ao servidor 4173.

## Decisão e fronteira

`packages/sharing-spike/src/https-transport.mjs` oferece `startSyntheticHttpsTransport`: escuta exclusivamente 127.0.0.1 em porta efêmera, usando chave/certificado fornecidos pelo teste. Não há CLI de execução/deploy, endereço configurável, proxy confiável, CORS, interface HTML ou acesso a obras. Autoridade precisa declarar SYNTHETIC_ONLY. A prova integra o harness de sessão e o diário SQLite separados, sem transformar ator declarado em autenticação real.

Esta ADR permite o uso do dispatcher da ADR-0025 **somente neste adaptador HTTPS loopback**, com Origin derivada da porta real e allowlist de rotas/campos. A proibição anterior de expor diretamente o dispatcher permanece válida para outros listeners e para o servidor do aplicativo. Não existe emissor de identidade em rota: `issueSyntheticCode` é método de controle entregue exclusivamente ao teste que criou o servidor. Não aparece no payload, status, HTML ou introspecção. Sem esse controle em memória, a rota de callback não obtém código válido. Isso não implementa OIDC, e-mail verificado ou login de produto.

## Requisições e identidade

Host deve ser o IP/porta exatos; Origin HTTPS exata é exigida inclusive em GET /session. Sec-Fetch-Site, quando presente, deve ser same-origin. Não aceitar Authorization como mecanismo alternativo. Query string, path codificado/alternativo, métodos fora da allowlist e endpoints desconhecidos são negados. Não há redirecionamento ou entrega de arquivos. HTTP simples não é aceito na porta TLS.

GET /session apenas consulta. POST JSON é necessário em `/synthetic/login/start`, `/synthetic/login/complete`, `/logout`, `/devices/revoke`, `/invitations/create`, `/invitations/preview`, `/invitations/accept`, `/invitations/revoke` e `/access/check`. Cada rota tem allowlist de campos; actor/subject não entram por body. O subject efetivo vem da sessão e do emissor privado de fixture. Aceite exige explicit=true; GET não consome convite.

Mutações autenticadas exigem X-CSRF-Token da sessão. Cookie __Host-wroom_synthetic usa Path=/, Secure, HttpOnly e SameSite=Lax, sem Domain. Duplicação de Host/Origin/Cookie/CSRF/Content-Type/Content-Length/Transfer-Encoding é recusada; cookies de sessão repetidos na mesma linha também. Não incluir tokens em URL ou logs. Source para limitação vem do endereço do socket TLS; X-Forwarded-For não muda identidade, origem ou contador.

## Limites e erros

Corpo até 16.384 bytes, tanto declarado quanto recebido em chunks. UTF-8 inválido, JSON truncado, chaves duplicadas (incluindo escapes), objeto nulo/array, campos extras e profundidade excessiva são rejeitados antes do dispatcher. Parser estrito reutilizado do core, sem operações criptográficas de manuscrito. Somente application/json ou application/json; charset=utf-8; sem compressão, Expect ou upload multipart. Até 8192 bytes de cabeçalhos e 64 pares lógicos inspecionados; 32 conexões, oito requisições por socket e conexão fechada após resposta. Timeouts configurados: cinco segundos para requisição/cabeçalhos e três segundos de inatividade no socket; isso não é benchmark de proteção contra slowloris.

Limite global de 120 requisições por minuto por instância, antes de leitura/processamento de body. Início de login continua limitado a cinco por minuto pelo peer. Não é defesa distribuída contra abuso. Respostas JSON têm no-store, nosniff, Referrer-Policy no-referrer e CSP default-src none/frame-ancestors none. Upgrade de protocolo é recusado. Erros de parser HTTP baixo nível podem fechar a conexão/retornar 400 vazio, sem detalhes internos.

403 genérico cobre identidade/sessão/CSRF/escopo/revogação/rota e também lock do diário, sem revelar existência de conta ou estado interno. O lock de 500 ms não consome convite e permite tentar novamente após liberação, comprovado em teste. Não há retry automático ou alegação de aceite idempotente: um convite já consumido é negado, mantendo um único recibo. 400 corresponde a formato, 413 tamanho, 415 representação, 417 Expect e 429 orçamento global; esses códigos não classificam usuários. Resposta genérica não comprova resistência a enumeração por tempo.

## TLS, cookies e evidência

Os testes geram certificado EC temporário com SAN IP 127.0.0.1 por openssl local, chave em arquivo 0600 sob diretório temporário privado. Node HTTPS confia explicitamente nesse certificado de fixture, verifica cadeia e identidade IP; não usa rejectUnauthorized=false nem altera o trust store do sistema. Para adulterar Host HTTP sem confundir a identidade TLS, o cliente valida explicitamente o IP de destino esperado. Nenhuma credencial/certificado é persistida no repositório.

Dez testes em `sharing-https.test.mjs`: ciclo autenticado sintético com escopo entre obras, Host/Origin/CSRF/rotas/impersonação, parsing/limites/chunks, cabeçalhos/cookies duplicados, callback replay/logout, headers de proxy/rate, reinício/recibos/restore suspenso, aceitações concorrentes, lock com retry e orçamento global. Exigem SQLite nativo e openssl; ausência marca skip explícito. Execução validada em Node v26.13.0.

Cookies e cabeçalhos são enviados por cliente HTTPS real. Isso **não testa** aplicação de Secure/SameSite/HttpOnly pelo navegador, CSRF por navegação externa ou políticas Safari/Chrome. Não existe UI de login; 186 verificações Firefox anteriores pertencem à interface alpha.20 e não certificam este transporte.

## Recuperação e continuidade

Servidor novo cria sessões/códigos/CSRF novos; cookies antigos são recusados enquanto recibos duráveis sobrevivem. Cópia restaurada da ADR-0026 permanece suspensa, sem reativação de grants ou sessão; TLS não muda essa política. Não há entrega de manuscrito/cifra/conteúdo neste transporte.

Próximo: verificar cookies e requisições de origem diferente em navegador com fixture HTTPS isolada, mantendo emissor fora da rede. Depois selecionar biblioteca HPKE e testar vetores/interoperabilidade/binding offline. OIDC real, provisionamento e-mail/dispositivos e recuperação operacional continuam pendentes. Integração com obras e implantação dependem dos gates e autorização específica para contas, credenciais, envio e serviço remoto. Preservar responsivo e formatos existentes.

## Fontes primárias verificadas em 2026-11-03

- [Node HTTPS](https://nodejs.org/api/https.html) e [Node HTTP](https://nodejs.org/api/http.html): TLS, sockets, cabeçalhos e limites do servidor.
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): token vinculado à sessão, Origin e defesa em profundidade. Aplicação nesta prova é decisão interna, sem auditoria externa.

Evidência final: 276 testes Node aprovados, sem falhas/skips; dez cenários HTTPS também passaram isolados. Log `/tmp/writingroom-sharing-https-node.log`. Não houve homologação de cookies em navegador nesta etapa.

Atualização: ADR-0028 acrescenta prova Firefox com documento constante opt-in e ajusta apenas GET /session sem Origin mediante Fetch Metadata same-origin. Documento desativado por padrão, emissor fora da rede e aplicativo inalterado. Ver o limite Secure no loopback observado antes de extrapolar garantias.
