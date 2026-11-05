# WritingRoom — estado verificado

## Preparação online — retomada do mapa de contas (2026-11-05)

**419 testes Node aprovados, zero falhas/skips**, incluindo **14 novos de mapa/processos**, também aprovados isoladamente. Baseline: 405 aprovados. Node v26.13.0/Linux. Logs `/tmp/writingroom-account-map-baseline.log`, `/tmp/writingroom-map-isolated-final.log` e `/tmp/writingroom-account-map-final.log`. `git diff --check` sem erros. Firefox não reexecutado: as 228 verificações da ADR-0040 são evidência anterior e não cobrem o novo índice.

ADR-0041: `subject-recovery-map.mjs` persiste somente referências públicas de subject/âncora/epoch/fingerprint/domínios/nomes de arquivos. Witnesses e raiz vêm de configuração privada independente do mapa. Resolver escolhe exatamente os domínios confirmados pelo witness e abre o diretório pelo wrapper testemunhado, sem fallback, scan, bootstrap ou escolha por maior epoch. Candidato registrado antes do compromisso permanece inerte; depois do compromisso pode ser encontrado sem persistir ponteiro ativo nem repetir JWT.

Testes reais de processo separado e SIGKILL após compromisso do witness, antes/depois do commit do mapa, com/sem destino preparado. Mapa antigo ou localizador ausente bloqueia a conta afetada e preserva a resolução da outra. Reparação privada confere destinos atuais; mapa substituído pode ser reconstruído em arquivo novo sem apagar evidência ou reescrever witnesses. Adulteração com checksum recalculado, arquivos/âncoras cruzados, checkpoint antigo, symlink/traversal, triggers/schema desconhecido e ausência de arquivos são recusados. Sessão nova exige posse nova; privadas/JWT não são persistidos.

**Próximo: integrar o índice à fixture HTTPS/OIDC retomável**, reabrindo o controlador com somente configuração/referências públicas, sem privadas editoriais/de reconferência antigas para servir login + nova prova de posse. Cobrir queda após compromisso antes do reconhecimento, destinos ausentes/antigos e preservação dos domínios/recibos da outra conta. O índice ainda não está ligado à fixture HTTPS da ADR-0040.

Limites: corrupção/ausência do arquivo compartilhado inteiro pode bloquear todas as contas; não há independência operacional do witness, recuperação de privadas, proteção contra rollback conjunto ou dos eventos de um diário com domínio preservado. Sem E2EE/v4, envio, deploy, dependência nova ou mudança da UI alpha.20/studio-19/formatos/manuscritos. Alterações locais, sem novo push.


## Preparação online — recuperação independente no HTTPS/OIDC (2026-11-05)

**Regressão final: 405 testes Node aprovados, zero falhas/skips**, incluindo os oito novos. Log `/tmp/writingroom-subject-https-final-node-2.log`. `git diff --check` sem erros.

ADR-0040: fixture de duas contas, com seleção de diretório/diário pela identidade OIDC verificada e sessão opaca. A recuperação troca somente o harness da conta afetada, preservando origem, servidor e sessões/provas/recibos da outra. Callbacks pendentes e trocas de token em andamento são revalidados por contexto/epoch/geração da conta. Campos de seleção, bindings/respostas HPKE, CSRF e domínios cruzados são recusados. Resultado OIDC de Bob pendente continua disponível uma vez após ativar Alice.

Oito testes Node novos e **58 verificações Firefox novas** aprovados. Baseline reexecutado: **397 testes sem falhas/skips**, Node v26.13.0/Linux, `/tmp/writingroom-multi-https-baseline.log`. Isolado final: `/tmp/writingroom-subject-https-isolated-final.log`. Firefox novo: `/tmp/writingroom-browser-mb4yls86/report.json`. Regressões Firefox reexecutadas e aprovadas: **52 recuperação + 53 OIDC/operações + 38 posse + 27 cookies** (170 anteriores; 228 verificações com as 58 novas). Relatórios `/tmp/writingroom-browser-pr9cg8tp/report.json`, `/tmp/writingroom-browser-_zxluz5i/report.json`, `/tmp/writingroom-browser-4ilwi0ib/report.json` e `/tmp/writingroom-browser-bscnqwj5/report.json`.

Na regressão OIDC, as primeiras execuções oscilaram na injeção de resposta perdida de convite/aceite. A fixture agora mantém a interrupção armada até liberação explícita por pipe, cobrindo retries do transporte; reconciliação/idempotência continuam exigidas. A execução final das 53 verificações passou. Não foram alteradas políticas de autorização ou respostas normais para acomodar o teste.

Mapa conta → âncora/arquivos ainda privado/em memória. Reinício testado reabre bancos e transporte, com controlador/documentos Firefox vivos; não é crash completo nem recuperação de privadas. UI alpha.20/studio-19, formatos autorais e manuscritos preservados. Sem dependência nova, conta real, envio ou deploy. Alterações locais, sem novo push.

**Próximo: contrato e prova sintética de retomada do controlador/mapa após falha**, incluindo compromisso confirmado antes de persistir destino, mapa antigo/substituído e preservação das outras contas. Persistir somente referências públicas conferidas contra o witness; não inferir confiança por existência de arquivo nem guardar privadas/JWT. Independência operacional do witness, rollback conjunto, custódia/rotação das autoridades e compartilhamento entre diários continuam gates.


## Preparação online — isolamento de confiança por subject (2026-11-05)

**Regressão final: 397 testes Node aprovados, zero falhas/skips**, incluindo os sete novos, em 2026-11-05. Log temporário: `/tmp/writingroom-subject-isolation-final-20261105.log`. `git diff --check` sem erros. Firefox não reexecutado.

ADR-0039: contrato e sete testes sintéticos de duas contas com dois dispositivos cada, em diretórios/diários/witnesses separados. Recuperação de uma conta preserva as sessões/contextos e o estado da outra; aprovações e bindings cruzados são recusados. Exercitadas recuperações paralelas, reabertura de witnesses, revogação individual, diário de conta errada e falha entre commits isolada por conta. Não altera código de produção, UI alpha.20/studio-19, formatos ou manuscritos.

Baseline atual: **390 testes aprovados**, sem falhas/skips, Node v26.13.0/Linux, log `/tmp/writingroom-baseline-unrestricted-20261105.log`. **Sete testes novos aprovados isoladamente**. Firefox não reexecutado. Publicação anterior confirmada por `ls-remote`: `main` remota e HEAD inicial local em `cea5d943834a92057fe89160bf94e46c51257a07`; documento de retomada corrigido. Alterações desta sessão locais.

**Próximo: fixture HTTPS/OIDC de duas contas com roteamento pelo subject autenticado e recuperação independente**, validando sessões da outra conta, callbacks/provas/operações cruzados e reinício no Firefox. Mapa privado de conta/âncora/domínios e reconciliação precisam ser definidos antes da persistência. Compartilhamento entre diários, independência real do witness e custódia das autoridades permanecem gates; sem E2EE/v4/produção.


## Preparação online — recuperação testemunhada no HTTPS/Firefox (2026-11-04)

**390 testes Node aprovados, sem falhas/skips**, incluindo **7 novos de integração HTTPS**, e **52 verificações Firefox novas de recuperação**. Node `/tmp/writingroom-recovery-https-final-node.log`; isolado `/tmp/writingroom-recovery-https-isolated-node.log`; browser `/tmp/writingroom-browser-k9j45auj/report.json`. As 118 verificações Firefox anteriores não foram reexecutadas nesta etapa; a suíte nova é dedicada à recuperação.

ADR-0038: fixture HTTPS/OIDC de um subject usa o wrapper/witness. Candidato gera privada não extraível no Firefox; preparação, aprovação e compromisso permanecem em pipes privados, sem rota pública de recovery/bootstrap/pin. Witness confirmado bloqueia imediatamente o runtime antigo; ativação explícita troca para diretório/diário vazios na mesma origem. Cookies, callback pendente, chaves e recibos de domínios antigos são recusados. Login novo exige posse nova por sessão; projetos/grants não são herdados. Reconciliação privada identifica destino confirmado após reconhecimento perdido. Reinício reabre bancos, preserva epoch/domínios e exige login/posse. UI alpha.20/studio-19 e arquivos privados preservados.

**Próximo: contrato e prova sintética de isolamento da confiança por subject para múltiplas contas/dispositivos**, sem redefinir outras identidades durante recuperação. A fixture nova é de um subject e um ciclo por execução; a fixture OIDC multi-identidade anterior continua separada. Independência operacional do witness, custódia/rotação da autoridade e recuperação de privadas permanecem gates. Rollback conjunto do witness e diretório local continua limite demonstrado; sem conteúdo real/E2EE/v4 ou implantação liberados.

## Preparação online — recuperação e confiança testemunhada (2026-11-04)

**383 testes Node aprovados, sem falhas/skips**, incluindo **19 novos de recuperação/witness**. **118 verificações Firefox anteriores reexecutadas e aprovadas**: 53 OIDC/operações, 38 posse e 27 cookies; **não são teste browser da recuperação nova**. Node `/tmp/writingroom-recovery-final-node.log`; isolado `/tmp/writingroom-recovery-isolated-node.log`; OIDC `/tmp/writingroom-browser-0fi3y6_7/report.json`; posse `/tmp/writingroom-browser-frkvgpu4/report.json`; cookies `/tmp/writingroom-browser-3j_yjljg/report.json`.

ADR-0037: prova isolada de um subject por âncora. Witness SQLite separado registra sequência/epoch, checkpoint público do diretório e pin de autoridade de reconferência. Wrapper recusa rollback/substituição e bloqueia divergência após falha/SIGKILL entre commits. Reconferência assinada pelo controle independente sintético exige fingerprints explícitas e posse de chave nova; troca para diretório/diário novos, vazios, sem herdar grants ou reativar restore suspenso. Sessão recusa diretório novo com diário antigo e exige posse por sessão. Sem recuperação de privadas, e-mail real, manuscrito ou mudança da UI alpha.20/studio-19.

**Limite demonstrado:** rollback conjunto do diretório e do witness local pode reaceitar estado antigo. A proteção exige witness/autoridade realmente independentes; isso ainda é gate de produção, não resolvido por guardar outro arquivo no mesmo domínio de ataque.

**Próximo: integrar wrapper/witness a fixture HTTPS dedicada de um subject e validar reconferência no Firefox**, com bootstrap/aprovação só por controle privado, troca de domínios e invalidação de sessões/recibos antigos. Fixture OIDC padrão ainda não usa esse wrapper. Multiusuário, custódia/rotação da autoridade e independência operacional real permanecem gates; sem E2EE/v4 ou conteúdo real.

## Preparação online — idempotência e reconciliação (2026-11-04)

**364 testes Node aprovados, sem falhas/skips**, incluindo **16 novos de operações + 2 HTTPS**. **118 verificações Firefox aprovadas nesta etapa: 53 OIDC/operações (12 a mais), 38 ciclo anterior e 27 cookies**. Node `/tmp/writingroom-operations-final-node.log`; operações isoladas `/tmp/writingroom-operations-unit-node.log`; Firefox operações `/tmp/writingroom-browser-r64415to/report.json`; ciclo anterior `/tmp/writingroom-browser-txm3qpyd/report.json`; cookies `/tmp/writingroom-browser-lb4m48m4/report.json`.

ADR-0036: novas rotas protegidas de contexto/execute/reconcile vinculam operationId, pedido canônico, subject/dispositivo/binding e domínios do diário/diretório. Mutação e recibo no mesmo evento SQLite; primeira operação promove só o diário sintético a user_version 2. Retry explícito não duplica convite/grant/revogação; recibo histórico não renova acesso. Convite devolve token só uma vez: resposta perdida exige reconciliar, revogar explicitamente aquele convite e criar outro ID se necessário, sem recuperar segredo do banco. Testes de processos/SIGKILL antes e depois do commit, sessão/posse/revogação/reinício/restore suspenso e perda real de resposta no Firefox. Continua sem transação distribuída ou defesa contra rollback hostil do filesystem. UI alpha.20/studio-19, obras e pacotes preservados; sem manuscrito privado ou conta real.

**Próximo: contrato e prova sintética de recuperação/reconferência de dispositivos e confiança**, cobrindo substituição e rollback de estado antigo sem reativar backup suspenso ou herdar pins por nome/e-mail. Operações legadas continuam sem idempotência retroativa; a garantia exige as novas rotas desde a primeira tentativa. E2EE/v4 e conteúdo real permanecem sujeitos aos gates de recuperação, diretório e revisão de segurança.

## Preparação online — OIDC no HTTPS e Firefox (2026-11-04)

**346 testes Node aprovados, sem falhas/skips**, incluindo **11 novos HTTPS**, e **41 verificações OIDC novas no Firefox**. Reexecutadas também **38 do ciclo integrado anterior** e **27 de cookies** (106 verificações Firefox nesta etapa). Node `/tmp/writingroom-oidc-https-final-node.log`; HTTPS isolado `/tmp/writingroom-oidc-https-isolated.log`; OIDC `/tmp/writingroom-browser-5bwcxj3f/report.json`; ciclo anterior `/tmp/writingroom-browser-6e324228/report.json`; cookies `/tmp/writingroom-browser-5w0k052m/report.json`.

ADR-0035: dois servidores HTTPS restritos a 127.0.0.1, com issuer localhost e RP 127.0.0.1. Identidade e autorização preparadas somente por pipes privados; redirects e token endpoint são reais, com CA/host TLS verificados, prazo total e PKCE. Callback exige documento/top-level GET e vínculo de prelogin; sucesso limpa URL por 303, remove prelogin e disponibiliza CSRF em resultado de sessão de uso único. Origin/CSRF permanecem estritos nas mutações. Login continua exigindo posse e escopo; revogação/reinício exercitados. Sem conta/e-mail real, manuscrito privado, mudança da UI ou dependência nova. Aplicativo alpha.20/studio-19.

**Próximo: contrato e implementação sintética de idempotência/recibos/reconciliação entre diário e diretório**, incluindo resposta perdida após compromisso, retry explícito e revogação atual. O lock de admissão não é transação distribuída. Recovery/reconferência e resistência a substituição/rollback hostil continuam gates antes de conteúdo real/E2EE/v4. OIDC de fixture em memória e no HTTPS/browser está entregue; não equivale a provedor de produção.

## Preparação online — contrato OIDC e fixture (2026-11-04)

**335 testes Node aprovados, sem falhas/skips**, incluindo **22 novos de OIDC**. Completo `/tmp/writingroom-oidc-final-node.log`; isolado `/tmp/writingroom-oidc-isolated-node.log`. Firefox não reexecutado nesta etapa: 38 verificações integradas/27 de cookies da ADR-0033 são evidência anterior e **não cobrem OIDC**.

ADR-0034: provedor/adaptador exclusivamente em memória, Authorization Code + PKCE S256, cookie de prelogin vinculado ao navegador, issuer/redirect/state/nonce estritos e JWT ES256 verificado por `jose` 6.2.15 (devDependency exata, MIT). Conta por issuer/sub, nunca por coincidência de e-mail; claims `@example.invalid` são sintéticos. Revalida logout/revogação/epoch/suspensão/prazo durante awaits; login ainda exige posse e escopo. Sem integração à UI/HTTPS, conta real, rede OIDC ou manuscrito privado. Aplicativo permanece alpha.20/studio-19.

**Próximo: adaptar HTTPS de fixture e validar redirects/callback/cookies OIDC no Firefox**, mantendo escolha de identidade em controle privado e Origin estrita nas mutações. Depois idempotência/recibos/reconciliação entre diário/diretório, recovery e reconferência. Contrato/prova em memória estão entregues; não anunciar e-mail autenticado ou E2EE de produção.

## Preparação online — ciclo integrado no Firefox (2026-11-04)

**313 testes Node aprovados, sem falhas/skips**, **38 verificações novas do ciclo integrado no Firefox** e **27 de cookies reexecutadas**. Log Node `/tmp/writingroom-combined-final-node.log`; ciclo `/tmp/writingroom-browser-08510kbe/report.json`; cookies `/tmp/writingroom-browser-b8fal6sm/report.json`.

ADR-0033: login sintético → posse por sessão → convite/escopo → revogação, incluindo sessão cruzada, desafio pendente e reinício do transporte com reabertura dos dois bancos. Recibos/vínculos persistem; cookies e prova de sessão não. Controlador e documento Firefox ficam vivos; não é recuperação de privadas ou crash de processo. Emissor/pins/revogação durável somente em pipes. Opções de script público e porta reutilizável exigem fixture explícita. Sem manuscrito privado, conta real, envio ou mudança da UI alpha.20/studio-19.

**Próximo: contrato OIDC detalhado e provedor/adaptador de fixture**, com issuer/audience/nonce/state/PKCE S256/redirect estritos, assinatura/prazos e replay. Depois idempotência/reconciliação entre bancos e recovery/reconferência. O ciclo combinado está concluído; não repeti-lo como próxima implementação. Não há login real/e-mail autenticado/E2EE liberados.

## Preparação online — sessão vinculada ao dispositivo (2026-11-03)

Validação desta etapa: **312 testes Node aprovados, sem falhas/skips**, incluindo nove novos de composição, dois HTTPS e um de lock entre processos; **27 verificações Firefox de cookies reexecutadas**. Log `/tmp/writingroom-bound-session-node.log`; relatório `/tmp/writingroom-browser-amxz9i89/report.json`. O ciclo combinado de posse+convites no navegador ainda é a próxima etapa; o teste Firefox desta rodada valida cookies legados. Sem manuscrito privado, identidade real ou mudança da UI.

ADR-0032: modo sintético integrado exige desafio de posse na mesma sessão e vínculo durável atual antes de operar convites/escopo. Outra sessão não herda prova; revogação invalida sessão na próxima verificação. Diretório reservado durante dispatcher síncrono do diário, sem alegação de transação distribuída. Restore suspenso de qualquer componente bloqueia fluxo. Emissor/pins/revogação de chave seguem fora de rotas. Aplicativo preservado em alpha.20/studio-19.


## Preparação online — diretório durável de dispositivos (2026-11-03)

Validação desta etapa: **300 testes Node aprovados, sem falhas/skips**, incluindo nove novos do diretório durável. Log `/tmp/writingroom-device-directory-node.log`. Nove cenários também aprovados isoladamente. Firefox não reexecutado: 11 verificações HPKE/vínculo da ADR-0030 são evidência anterior. Sem manuscrito privado, identidade real, envio ou alteração de UI.

ADR-0031: pins/vínculos públicos assinados/revogações em SQLite separado, CAS global e ativação após prova de posse. Desafios são voláteis e invalidados no restart; vínculos e revogações persistem. Restore em domínio novo suspenso, sem reativar pins de backup antigo. Nove testes adversariais, sem privadas/manuscritos no banco. Próximo: ligar diretório a sessão/operação no serviço sintético. Aplicativo permanece alpha.20/studio-19.


## Preparação online — vínculo e posse de dispositivo (2026-11-03)

Validação desta etapa: **291 testes Node aprovados, sem falhas/skips**, e **11 verificações Firefox** de HPKE/vínculo (incluindo 257 ciphertexts oficiais). Log `/tmp/writingroom-device-binding-final-node.log`; relatório `/tmp/writingroom-browser-nx74mcp9/report.json`. Oito testes Node novos. Sem manuscrito privado, identidade real ou envio externo. Suítes antigas de UI/cookies não foram reexecutadas; aplicativo inalterado.

ADR-0030: identidade Ed25519 sintética pinada assina a pública X25519, subject/dispositivo/ID/prazo. Desafio HPKE de uso único exige posse antes da ativação; testa adulteração, revogação, substituição e corridas. Prova em memória, sem diretório/recovery duráveis ou e-mail real. Próximo: persistência transacional de confiança/revogação e proteção de restauração. Aplicativo permanece alpha.20/studio-19.


## Preparação online — HPKE offline (2026-11-03)

Validação desta etapa: **283 testes Node aprovados, sem falhas/skips**, incluindo seis novos de HPKE; **seis verificações Firefox** com 257 ciphertexts oficiais em cada runtime e intercâmbio nos dois sentidos. Log `/tmp/writingroom-hpke-final-node.log`; browser `/tmp/writingroom-browser-rqogzglj/report.json`. Sem manuscrito privado ou conta real. As suítes anteriores de UI/cookies não foram reexecutadas; a UI não mudou.

ADR-0029: biblioteca hpke 1.1.8 exata, MIT/sem dependências de execução, somente devDependency. Prova X25519/HKDF-SHA256/AES-256-GCM Base com vetores RFC/CFRG e envelope sintético separado, até 64 KiB. Testa destinatário, aleatoriedade, contexto, adulteração e intercâmbio Node/Firefox. Não autentica remetente, não bloqueia replay nem oferece diretório/E2EE de produção. Próximo: vínculo assinado de chave por dispositivo e prova de posse. Produto preservado em alpha.20/studio-19.


## Preparação online — cookies no Firefox (2026-11-03)

Validação desta etapa: **277 testes Node aprovados, sem falhas/skips**, e **27 verificações novas no Firefox** para cookies/origens. Log Node `/tmp/writingroom-browser-cookies-node.log`; relatório Firefox `/tmp/writingroom-browser-szvsbg4l/report.json`. As 186 verificações anteriores da UI alpha.20 não foram reexecutadas nesta etapa. Sem manuscrito privado, identidade real, envio externo ou implantação.

ADR-0028: 27 verificações reais de cookies/CSRF/origens em Firefox isolado, com CA restrita ao perfil NSS e validação TLS ativa. GET /session sem Origin só aceita Fetch Metadata same-origin. Documento constante de fixture opt-in; emissor permanece fora das rotas. SameSite verificado com controle positivo; outra origem no mesmo site também bloqueada por Origin. Secure foi enviado ao HTTP loopback neste ambiente, limite explicitamente registrado. Aplicativo permanece alpha.20/studio-19; sem login real ou integração com obras.


## Preparação online — transporte HTTPS isolado (2026-11-03)

Validação desta etapa (2026-11-03): **276 testes Node aprovados, sem falhas/skips**, incluindo dez testes novos de HTTPS real no loopback. Log `/tmp/writingroom-sharing-https-node.log`. Certificados temporários e SQLite sintético, sem manuscrito privado ou credencial real. Firefox não reexecutado: 186 verificações anteriores pertencem à UI alpha.20, não à política de cookies deste transporte.

ADR-0027: adaptador HTTPS em 127.0.0.1/porta efêmera, sem integração com o servidor do aplicativo. TLS temporário verificado; identidade emitida somente pelo controle privado do teste. Origin/Host/CSRF/cookies, allowlist JSON, limites, escopo durável, lock/replay/reinício exercitados em dez testes reais de requisição. Sem OIDC/e-mail/login real, manuscrito ou implantação. Aplicativo preservado em alpha.20/studio-19.


## Preparação online — diário durável sintético (2026-11-03)

Validação desta etapa: **266 testes Node aprovados, sem falhas/skips**, incluindo oito novos duráveis; 21 testes de compartilhamento também passaram isoladamente. Log `/tmp/writingroom-durable-sharing-node.log`. Firefox não reexecutado: interface preservada, com 186 verificações anteriores da alpha.20. Nenhum manuscrito privado, serviço remoto ou credencial real usado.

ADR-0026: SQLite isolado para convites/concessões/recibos, com transações e reaproveitamento da política existente. Backup verificável; restore em domínio novo suspenso, sem reativar acesso ou restaurar sessões. Oito testes novos de concorrência entre processos, SIGKILL, rollback, escopo/revogação, corrupção e recuperação. Sem login real, HTTP, manuscrito ou serviço remoto; aplicativo permanece alpha.20/studio-19.


## Alpha.20 — continuidade da leitura móvel (2026-11-03)

Validação alpha.20 em 2026-11-03: **258 testes Node aprovados, sem falhas/skips**, e **186 verificações Firefox** (85 gerais + 9 revisão + 11 Editor + 11 pacote v1 + 11 chaves/v2 + 12 rodadas + 47 responsivas). Log Node `/tmp/writingroom-alpha20-final-node.log`. Responsivo final: `/tmp/writingroom-browser-ztkig456/report.json`; captura de leitura em foco inspecionada. Sem manuscrito privado. Teste físico de Safari/iPhone, Chrome/Android e teclado virtual permanece pendente.

Foco agora preserva o Manuscrito quando acionado durante a leitura; sair do foco mantém a mesma vista. No celular, ações de edição ficam fora da leitura em foco. Novo seletor de tamanho de leitura (18/21/24 px), independente do editor e salvo apenas em `writingroom.reading-size` no navegador. Texto simples e prévia visual usam a preferência, sem alterar obras/exportações. Referência ganha botão interno de fechar, utilizável com ferramentas recolhidas e retorno de foco ao botão Ferramentas. Sem mudanças de schema, serviços online, dependências ou node_modules. Aplicação alpha.20/studio-19.


## Alpha.19 — leitura e escrita no celular (2026-11-03)

Validação alpha.19: **256 testes Node aprovados, sem falhas/skips**, e **175 verificações Firefox** (85 amplas, 9 revisão, 11 Editor, 11 pacote v1, 11 chaves/v2, 12 rodadas e 36 novas responsivas). Log Node `/tmp/writingroom-alpha19-final-node.log`. Móvel final: `/tmp/writingroom-browser-7szuf6i5/report.json`, capturas de escrita, estrutura, foco, leitura e visual. Não houve homologação em celular físico nem uso de manuscrito privado.

Ferramentas recolhíveis, abas deslizantes com seleção visível, editor com mais espaço, leitura com margens/entrelinha confortáveis, salvamento visível e diálogos adaptados. Painéis com fechamento, Escape, foco de retorno e conteúdo coberto inert. Aplicativo studio-18; formatos 1–7 e pacotes v1/v2/v3 preservados. Análise detalhada em MOBILE_RESPONSIVENESS.md. Nenhum arquivo de node_modules editado.


Validação de sessões sintéticas (2026-11-03): **256 testes Node aprovados, sem falhas/skips**, incluindo sete novos de sessões e seis anteriores de autorização. Log `/tmp/writingroom-synthetic-sessions-tests.log`. Interface inalterada; Firefox não reexecutado (139 fluxos anteriores da alpha.18). Sem manuscrito privado ou tráfego externo.


Sessões sintéticas — 2026-11-03: ADR-0025 e `session-harness.mjs` acrescentam state/código de uso único, rotação, CSRF/Origin, expiração, logout e revogação por dispositivo. Sete testes novos; transporte por chamadas em memória, sem OIDC, e-mail, HTTP, persistência ou mudança da interface alpha.18. Próximo: storage transacional de convites/grants/recibos, com concorrência e recuperação.


Validação desta etapa (2026-11-03): **249 testes Node aprovados, sem falhas/skips**, incluindo seis novos da prova sintética. Log: `/tmp/writingroom-online-contract-tests.log`. Interface inalterada; Firefox não reexecutado nesta etapa (139 fluxos são evidência anterior da alpha.18). Nenhum manuscrito privado utilizado.

## Preparação online — 2026-11-03

ADR-0024 registra revisão interna E1, identidade/sessão, capacidades, dispositivos, recuperação e gate HPKE. Modelo sintético isolado de autorização entregue: convite com destinatário/escopo/prazo, prévia não consumidora, aceite explícito único e revogação. Sem HTTP, autenticação, cifra ou persistência; não integrado ao aplicativo alpha.18. Evidência: seis testes novos de isolamento, mutação de escopo, replay, revogação/expiração, privacidade e reinício.


Atualizado: 2026-11-03. Aplicação local: **0.1.0-alpha.18 / interface studio-17**. Linux x86_64, Node v26.13.0, SQLite nativo 3.54.0. Git indisponível neste workspace; nenhum repositório foi inicializado. Dependências ProseMirror e esbuild instaladas; inventário em EDITOR_DEPENDENCIES.md.

## Incremento atual — alpha.18

A alpha.18 entrega **Revisão → Nova rodada editorial**: selecionar cenas, título e participantes declarados, conferir a projeção e assinar/cifrar uma base congelada. A primeira rodada exige backup integral verificado antes do **formato 7**. Abrir o diálogo/cancelar antes de confirmar não migra. Leitura aceita formatos 1–7; acompanhamento, visual, fontes, anexos e propostas não rebaixam o formato.

Na biblioteca, **Abrir rodada / devolutiva** confere assinatura/pin e frase. Uma oferta cria cópia de trabalho nova com vínculos por IDs opacos, sem expor IDs da origem ou comentários privados. Na cópia, use **Propor alteração** mantendo texto/formatação na base; **Preparar devolutiva** exporta somente propostas pendentes vinculadas. Aceitar na cópia não altera o original nem equivale a devolver sugestões. Cópias independentes v1/v2 não são associadas retroativamente a uma obra.

Na origem, **Receber devolutiva** exige escolha explícita da obra, mostra original/proposto, duplicatas e conflitos. A confirmação revalida participante, rodada, confiança e base completa e cria apenas pendências; antes de gravar uma entrada nova, gera backup manual integral verificado no destino selecionado da central. Aceitar texto continua decisão individual com snapshot, preservando as anotações privadas do original. Qualquer mudança de texto/formatação/comentário bloqueia a devolutiva inteira sem aplicar parcialmente. Encerrar rodada bloqueia novos recebimentos, sem decidir pendências já importadas.

Recibos de proposal_id/hash/review_id e return_id/hash ficam na obra. Replay conhecido não duplica nem reabre decisão, inclusive após aceite/reinício e backup/restauração que contém esses recibos. Restauração remapeia cenas/review_id/snapshots, preservando IDs externos de rodada/proposta. Backup anterior a um recebimento não conhece esse recibo; forks restaurados são independentes e o destino precisa ser escolhido pelo usuário. Não há idempotência global entre forks ou log inviolável.

Limites: 10 rodadas/12 MB de bases e metadados, 200 cenas por rodada, 1000 propostas/4 MB por devolutiva, 20 mil unidades UTF-16 por lado e obra de até 30 MB. Quatro prévias de rodada por instância, 5 minutos, além das prévias legadas. Envelope v3 assinado Ed25519 sobre a cifra AES-GCM/scrypt existente; kind/participantes/base/escopo conferidos. Chaves/pins globais permanecem fora da obra e de seus backups. Confidencialidade continua por frase compartilhada; sem autenticação de e-mail, E2EE, serviço online ou auditoria externa. Formato 7 é JSON em claro no disco. ADR-0023.

Verificação em 2026-11-03, Linux x86_64 / Node v26.13.0: baseline **231 testes Node**; **243 testes Node aprovados, sem falhas/skips**, e **139 fluxos Firefox** (85 amplos, 9 redline, 11 Editor, 11 pacote v1, 11 chaves/v2, 12 rodada/devolutiva). Cobertura nova: ciclo entre instalações, privacidade/IDs opacos, base textual/visual e comentário privado, importação sem alterar manuscrito, aceite com snapshot, replay após reinício/restauração/reexportação, remapeamento de recibos, IDs/base/escopo adulterados, revogação/encerramento, edição livre na cópia, limites e mil pendências em um agregado, staging, falha de migração/checkpoint e conflito após prévia. Captura móvel inspecionada.

Livro privado somente em cópia restaurada: **48 cenas / 1.954.430 bytes de projeção**, migração com backup verificado, oferta/devolutiva assinadas, sugestão recebida sem alterar texto, aceite individual com snapshot e replay após novo restore sem duplicar. O modelo-base e checksum do backup original permaneceram intactos. Relatório privado `writingroom-private/VALIDACAO-ALPHA18-RODADAS.json`; nenhum trecho publicado.

Artefatos temporários: `/tmp/writingroom-browser-5_is3ius` (amplo), `/tmp/writingroom-browser-i3nte4uk` (revisão), `/tmp/writingroom-browser-gbq9j8gd` (Editor), `/tmp/writingroom-browser-odts7hfj` (v1), `/tmp/writingroom-browser-3s2_c_hs` (chaves/v2), `/tmp/writingroom-browser-bkyqvk9x` (rodadas). Próximo: revisar contrato/ameaças/gates de E1 e definir fronteira do serviço autenticado por e-mail antes de implementar online. Não anunciar E2EE ou serviço remoto pela conclusão do fluxo offline.

## Histórico — alpha.17

A alpha.17 acrescenta **Biblioteca → Chaves editoriais**: criar identidade Ed25519 com chave privada cifrada por frase, baixar cartão público e backup cifrado da chave, restaurar backup e trocar a identidade ativa com confirmação da impressão anterior. Chaves antigas ficam preservadas/inativas; até 5 identidades e 50 contatos. O arquivo separado `.settings/editorial-identities.json` não entra nos backups das obras. Frases não são guardadas pelo app; backup de chave sem a frase não recupera acesso.

Cartão de contato só vira chave conferida quando o usuário informa a impressão SHA-256 completa confirmada por outro canal. Nome permanece declarado; a conferência do canal é declaração do usuário, não autenticação de e-mail/civil pelo app. Chave nova com nome igual exige nova conferência. Revogar mantém o registro e bloqueia novas operações e confirmações pendentes nessa instalação; não apaga arquivos entregues nem reativa o pin.

Em **Publicar → Pacote editorial cifrado**, escolha **Assinar com chave conferida — v2**, o destinatário conferido e informe a frase de desbloqueio da sua chave, separada da frase do pacote. A prévia vincula chaves/estado/conteúdo. Assinatura Ed25519 cobre o envelope cifrado inteiro e o destinatário, com domínio próprio. Verificação usa o pin já conferido, antes de decifrar. O arquivo expõe chave pública do remetente e fingerprints para roteamento/verificação, permitindo vinculação entre arquivos.

A abertura exige assinatura por padrão na UI. Para v1, desative explicitamente essa exigência e veja “Sem assinatura”; v2 inválido não cai para v1. Antes de confirmar staging, a confiança/revogação é conferida novamente. A assinatura prova controle da chave pinada, não identidade civil ou e-mail. A cifra ainda depende da frase compartilhada; não cifra para a chave pública do destinatário nem oferece E2EE/grants. Cópia importada continua independente, JSON em claro, sem atribuição autenticada ou proveniência assinada persistida na obra. **Rodadas, bases e devolutivas ao original continuam pendentes.** ADR-0022; obras permanecem nos formatos 1–6.

Validação em 2026-11-03, Linux x86_64 / Node v26.13.0: baseline **221 testes Node**; **231 testes Node aprovados, sem falhas/skips**, e **127 fluxos Firefox** (85 amplos, 9 redline, 11 Editor, 11 pacote v1 e 11 chaves/assinatura). Testes novos: geração e backup protegido, unlock incorreto, privada divergente mesmo com AEAD válida, CAS, rotação explícita, persistência/arquivo inválido/symlinks, pin externo divergente/revogado/substituído, assinatura interoperável com Node, adulteração de chave/cifra/destinatário, downgrade, duas instalações HTTP, revogação entre staging/confirm e ausência de chave privada/frase na listagem. Firefox exercitou três instalações locais isoladas, download de cartão/backup, conferência manual, assinatura, erro de frase, importação, revogação, recuperação e viewport de 500 px; captura móvel inspecionada.

Caso privado em cópia restaurada: **48 cenas, 1.954.435 bytes de projeção**, cifradas/assinadas e conferidas por pin sintético antes de abrir, cópia independente e backup/restauração preservaram textos; recuperação da chave em instalação isolada funcionou. Origem restaurada e checksum do backup-base intactos. Relatório `writingroom-private/VALIDACAO-ALPHA17-ASSINATURAS.json`, sem trechos publicados. Sem envios externos, dependências novas ou promoção dos gates de autenticação remota/E1 completo.

Artefatos temporários: `/tmp/writingroom-browser-ueqmjrwm` (amplo), `/tmp/writingroom-browser-jsl2_8e0` (redline), `/tmp/writingroom-browser-kgl50vjh` (Editor), `/tmp/writingroom-browser-e_y41w0m` (v1), `/tmp/writingroom-browser-716ciwqm` (chaves).

## Histórico — alpha.16

A alpha.16 acrescenta **Publicar → Pacote editorial cifrado** e **Abrir pacote cifrado** na biblioteca. Escolha de 1–200 cenas do Manuscrito, título compartilhado e remetente/destinatário declarados; confira o texto e as notas incluídas antes de cifrar. A projeção preserva texto/formatação suportada e notas de publicação, excluindo pesquisa, anexos, lixeira, comentários privados, notas do inspetor, metadados, acompanhamento, perfil, versões e propostas. Não há envio automático.

O arquivo `.wroom-package.json` usa AES-256-GCM e scrypt (N=131072, r=8, p=1), com salt/IV aleatórios e cabeçalho autenticado. Parâmetros fixos e uma operação criptográfica por instância limitam recursos. Frase secreta de 16–256 caracteres, confirmada na exportação, combinada por outro canal; não é persistida pelo app. Tamanho mínimo não garante entropia: use frase longa e exclusiva. Sem recuperação: perdida a frase, gere outro pacote pela origem preservada.

A abertura confere integridade e destinatário declarado e apresenta prévia temporária (5 minutos, até 4 entradas) antes de criar uma **nova obra independente**. Cancelar/expirar não cria obra; repetir a confirmação do mesmo token não duplica. Reabrir o arquivo em nova prévia pode criar outra cópia. A obra importada e seus backups são **JSON sem criptografia no disco**, como os projetos locais existentes. Não há migração nem sobrescrita da origem.

Este é um primeiro incremento de cópia editorial protegida por segredo compartilhado: **sem autenticação de e-mail, assinatura de remetente, grants, E2EE ou devolutiva/merge ao original**. Quem tem a frase pode abrir e criar pacotes. Não há revogação de arquivo já entregue nem cofre/recuperação de chaves. Cifra executada no servidor local confiável; frase/conteúdo passam pelo loopback. ADR-0021 registra contrato, ameaças, limites e fontes primárias.

Verificação em 2026-11-03, Linux x86_64 / Node v26.13.0: baseline **210 testes Node**; implementação **221 testes Node aprovados, sem falhas ou skips**. **85 fluxos Firefox amplos + 9 de redline + 11 de perspectiva Editor + 11 de pacote**, com bibliotecas/perfis isolados. Cobertura nova: allowlist/ordem/privacidade, plain/visual/notas, CAS da prévia, frases divergentes/incorretas, destinatário divergente, adulteração de cifra/tag/IV/salt, versões/KDF/base64/JSON duplicado/profundidade/tamanho, conteúdo inválido mesmo com tag válida, staging/expiração/cancelamento/capacidade/repetição/falha de gravação e limite HTTP de concorrência. Firefox cobre download, segredo limpo dos campos, cancelamento, cópia independente e viewport de 500 px. Captura móvel inspecionada. Artefatos temporários: `/tmp/writingroom-browser-fq4cj130` (amplo), `/tmp/writingroom-browser-ao7dbdp_` (redline), `/tmp/writingroom-browser-ste8f2ni` (Editor), `/tmp/writingroom-browser-ek34l88l` (pacote).

Livro privado: **48 cenas do Manuscrito, 1.954.433 bytes de projeção**, em cópia restaurada isolada; cifrar/gravar arquivo/decifrar/staging/criar cópia e backup/restauração preservaram todos os textos selecionados. Origem restaurada e checksum do backup-base inalterados. Relatório privado `writingroom-private/VALIDACAO-ALPHA16-PACOTE.json`, sem trechos publicados.

Próximo: completar E1 com contrato de identidades/chaves, rodadas/proveniência e devolutivas idempotentes; não promover critérios remotos ou PRO-AC-06–09.

## Histórico — alpha.15

A alpha.15 entrega **Configurações · Escritor/Editor** no cabeçalho. Editor abre um painel das obras locais com propostas pendentes, conflitos, comentários visuais abertos e acesso à cena, histórico de propostas e versões/comparação. Filtros por etapa e pendência; Atualizar painel consulta o disco. Voltar a Escritor restaura a biblioteca. Autoria/responsabilidade continuam declaradas, sem autenticação ou permissões.

**Acompanhar obra** guarda responsável declarado (100 caracteres), etapa, observações e próximos passos (10 mil caracteres cada). A preferência de perspectiva fica no navegador; acompanhamento pertence à obra e acompanha backup, restauração e duplicação. O primeiro salvamento exige backup integral verificado antes do **formato 6**. Abrir painel ou cancelar não migra. Leitura aceita formatos 1–6; propostas, fontes, anexos e editor visual não rebaixam o formato. Conflito de acompanhamento mantém os campos locais e pede reabertura explícita. `tracking_hash` é derivado e não entra na recuperação/restauração.

Validação em 2026-11-03, Linux x86_64 / Node v26.13.0: baseline 205 testes; **210 testes Node aprovados, sem falhas/skips** após implementação. **85 fluxos Firefox amplos + 9 de redline + 11 de perspectiva Editor** aprovados. Testes cobrem validação atômica/CAS, migração e falha de backup, contagens/comentários/lixeira, preservação de formato 6, backup gerenciado/restauração/reabertura, troca de modo, filtros, navegação, aceite existente e viewport de 500 px. Captura móvel inspecionada. Artefatos temporários: `/tmp/writingroom-browser-nm4ctp3f`, `/tmp/writingroom-browser-4sjm2sxe`, `/tmp/writingroom-browser-k0x4ff8k`.

Caso privado: 78 documentos em cópia restaurada isolada; acompanhamento salvo/reaberto/restaurado, migração com backup verificado, texto e snapshots preservados; checksum do backup-base inalterado. Relatório privado `writingroom-private/VALIDACAO-ALPHA15-EDITOR.json`, sem conteúdo do manuscrito na documentação.

Limites: obras ativas no painel; arquivadas pela biblioteca existente. Sem edição em lote, autenticação, permissões remotas ou criptografia. Painel consulta dados confirmados no disco; precisa atualizar após alterações externas. Próxima etapa: contrato do pacote editorial criptografado, antes da implementação. ADR-0020.

## Histórico — alpha.14

A alpha.14 acrescenta **Revisão** e **Propor alteração**: selecione texto na cena ou no original de leitura do diálogo, informe autor/papel (Escritor/Editor), substituição e justificativa. O painel mostra original riscado e proposta sublinhada; guardar não altera o manuscrito. Aceitar preserva versão anterior e registra a decisão; rejeitar mantém o texto. Filtros distinguem estado/papel e o histórico acompanha backup/restauração.

O aceite é bloqueado se texto/formatação mudou; atualize a lista e faça nova proposta sobre a base atual, ou rejeite a antiga. A primeira proposta migra a obra para **formato 5**, somente após backup integral verificado. A identificação é local e declarada, sem autenticação, compartilhamento ou permissões remotas. No editor visual, as propostas são limitadas a trechos de um bloco, sem novas quebras ou inserção em cursor vazio.

Persistência schema 5, registro de autor/papel/base/intervalo/textos/decisão e snapshot anterior. Criação/aceite usam hash visual/textual, decisão usa hash da proposta e pendência. Rejeitar após alteração não muda texto. Sem rebase automático; outros pendentes podem conflitar após um aceite. Restore remapeia propostas/cenas/versão anterior. Novos campos auxiliares review_hashes excluídos de recuperação/restauração. Esquemas anteriores permanecem legíveis.

Evidência: **205 testes Node sem falhas/skips**, incluindo migração para 5/falha de backup, CAS/conflitos, autoria, rejeição, Unicode, visual e restore. **85 fluxos Firefox amplos + 9 específicos**: seleção/prévia, proposta sem mutar, aceite/snapshot, filtro/rejeição, conflito, visual preservado, ausência na publicação, backup e reload. Capturas de proposta/painel inspecionadas. Artefatos /tmp/writingroom-browser-3szm33hi/ e /tmp/writingroom-browser-ki2dcwrg/.

Caso privado em cópia restaurada de O Grito no Mármore: proposta preservou texto até aceitar; aceite guardou original em snapshot; novo restore remapeou todos os vínculos. Backup original intacto, sem rede/texto público; relatório writingroom-private/VALIDACAO-ALPHA14-REDLINE.json. Não houve edição do manuscrito/modelo-base.

Limites: 1000 propostas/4 MB, 20 mil caracteres por lado, 30 MB por obra. Sem edição/apagamento de proposta histórica, multiceleção/aceite em lote, rebase, Track Changes Word ou diff visual de marcas. Histórico aceito pode ser superado por edições posteriores. Nome/papel são autodeclarados, não permissões. Próximos: modo Editor local e pacote criptografado; autenticação online/publicação permanecem na fila. ADR-0019.

## Histórico — alpha.13

A alpha.13 entrega **Versões → Comparar duas versões lado a lado**: escolha dois snapshots ou o texto atual no disco, inverta os lados, veja linhas inseridas/removidas e filtre somente alterações. Navegue pelas diferenças e carregue mais linhas quando necessário. Em telas estreitas, os lados ficam empilhados. Comparação é somente leitura; restauração continua no fluxo existente com preservação da versão anterior.

A análise é textual. Diferenças de formatação/anotações são avisadas, sem diff visual detalhado. Trechos grandes usam comparação simplificada identificada, com contagens aproximadas; texto não é descartado. Alterar as seleções pede nova consulta. Isto entrega comparação de versões; propostas de redline e aceitar/rejeitar continuam como a próxima etapa.

API compare-versions apenas deriva dados e recusa versões de outra cena. LCS limitado a 250 mil células, fallback por blocos e proteção de 20 mil linhas; finais de linha/Unicode/texto vazio mantidos. DOM via textContent, paginação de 500 linhas e seleção invalida resultado antigo. Sem schema novo, restauração ou gravação implícita.

Evidência: **193 testes Node sem falhas/skips; 85 fluxos Firefox amplos e 4 focados**. Fluxos específicos cobrem dois snapshots, inversão, filtro, foco/navegação, atual e HTML literal, ausência de gravação e largura móvel. Captura lado a lado inspecionada. Caso privado: **103 comparações** em cópia restaurada, 2 com diferenças de texto, nenhum fallback, maior resultado 187 linhas; backup original e cópia idênticos após comparação. Relatório writingroom-private/VALIDACAO-ALPHA13-COMPARACAO.json, sem texto público.

Limites: diff por linha, não por palavra/marca visual; sem redline/autor atribuído/aceitar-rejeitar. Modo simplificado pode incluir linhas iguais em blocos alterados e conta blocos de forma aproximada. Próxima etapa: propostas versionadas de revisão com CAS, autoria explícita e snapshots antes de aplicar; depois modo Editor/pacote criptografado/publicação. Nuvem antes do desktop, desktop por último. ADR-0018.

## Histórico — alpha.12

A alpha.12 permite guardar qualquer tipo de anexo como original para download e **extrair texto de PDF, Word DOCX, ODT, TXT e Markdown** no projeto. Em **Caderno → Anexos → Abrir → Extrair texto / pesquisar / traduzir**, revise a prévia ou selecione um trecho e crie pesquisa vinculada ou original de tradução. Arquivos sem extrator aceitam transcrição manual; não há OCR ou execução de anexos.

**Dicionário e idiomas** ganhou consulta offline às bases MyThes pt/en instaladas, importação/exportação de base lexical JSON compartilhada e conector LibreTranslate com autorização de envio, prévia e confirmação separadas. Tradução automática precisa de um serviço configurado; não há motor neural incluído. Credenciais ficam no processo do servidor, fora das obras. Definições/traduções offline dependem da base importada, sem alegação de dicionário universal pré-instalado.

Novos anexos desconhecidos usam MIME application/octet-stream, download attachment e nunca renderização ativa. DOCX/ODT com parser ZIP/XML limitado; PDF via pdftotext. Extração é leitura com limite de 1 milhão de caracteres, confirmação/seleção de até 200 mil por documento, SHA esperado e referências ao anexo preservadas no restore. Sem novo schema; versões anteriores podem recusar formatos novos. Backup antes de migrar para fontes continua obrigatório.

Evidências públicas: **186 testes Node sem falhas/skips**, incluindo PDF/DOCX/ODT reais sintéticos, DTD rejeitado, pesquisa/tradução, remapeamento, base lexical/symlink/validação e contrato LibreTranslate via loopback. **84 fluxos Firefox amplos + 6 específicos de anexos/idiomas + 3 móveis**. Teste novo faz importação Word, extração, documento de pesquisa, consulta do SO, base lexical importada, consentimento e prévia de tradução por servidor sintético, criação/reload. Não houve envio a terceiros ou validação de qualidade de tradução real. Bases reais consultadas: casa→th_pt_PT_v2.dat (5 termos), house→th_en_US_v2.dat (14 sentidos/57 termos); bases não redistribuídas.

Caso privado: extração em memória de DOCX do autor, **5934 parágrafos e 833639 caracteres**, SHA do original inalterado e bytes do anexo preservados. Relatório writingroom-private/VALIDACAO-ALPHA12-EXTRACAO.json, sem publicação do texto/novo projeto persistido. Não é teste de importação rica ou de entrega editorial.

Limites: mesmas quotas 8 MB/anexo/16 MB total/30 MB obra; sem OCR, DOC antigo, formatação/layout preservado, bases universais licenciadas ou motor de tradução incluído. Base lexical global tem backup/download separado e não vai nas obras. Serviço/credenciais precisam ser configurados. Veja ADR-0017 e análise global para hipótese de uso e fila remanescente.

## Histórico — alpha.11

Quatro modelos de tradução (livro/artigo/documento/outros), catálogo total de 20. Briefing orientado ao suporte, direitos/créditos/variantes/público/estilo/revisão. Ambiente Tradução em qualquer obra, criação atômica de pares com idiomas, original TXT/MD por prévia, original como fonte fora da publicação e destino no manuscrito. Editor existente lado a lado, lang/direção por trecho, estados/progresso/filtro e alerta literal de números; alterar texto original devolve destino Concluído para Revisão e sincroniza estado no cliente. Export MD bilíngue independente da publicação.

Dicionário e idiomas em qualquer projeto: glossário pessoal (definição, sinônimos/antônimos, equivalentes, contexto/proveniência), edição pelo documento e lixeira reversível, export MD. Busca textual em até 30 pares traduzidos da própria obra. Links externos explícitos para Wikcionário/Priberam/Google Tradutor/DeepL, sem envio automático de cena, scraping, resultados integrados ou API. Não há base completa offline pré-instalada. Projetos não compartilham verbetes automaticamente.

Persistência usa fontes schema 4 e referências existentes; nenhuma migração ao abrir. Criar par/verbete em obra anterior exige backup integral antes de confirmar. Falha preserva fonte anterior; restore remapeia vínculos e originais/glossário não entram na compilação. Sem tocar no livro privado/base autorizada para testes anteriores.

Evidências: **174 testes Node sem falhas/skips**; **84 grupos Firefox no smoke amplo e 3 verificações móveis em perfil próprio** incluindo modelos, original por prévia, edição/reload/restauração bilíngue, exclusão da publicação, exports reais MD, memória local, revisão reaberta e isolamento do glossário entre obras. Build do editor/sintaxe aprovados. Capturas de escrita, dicionário, painel e celular inspecionadas. Verificação focada adicional confirmou viewport real de 500 px (mínimo efetivo do Firefox headless) e diálogo contido na largura, em /tmp/writingroom-browser-7rm3wopg/. O teste móvel separado aguarda o redimensionamento assíncrono e verifica geometria do editor empilhado; o smoke amplo não alega viewport móvel. Evidência final: /tmp/writingroom-browser-qgemwnm5/ (84 fluxos) e /tmp/writingroom-browser-uvm39_9d/ (3 fluxos móveis, 500 px). Não houve consulta automática aos sites nos testes; validar links por fonte web é diferente de testar resultados de APIs. Não repetir ensaios anteriores de LibreOffice/EPUB como evidência nova deste incremento.

Limites e fila CAT/lexical: [TRANSLATION_AND_LANGUAGE_TOOLS.md](../specifications/TRANSLATION_AND_LANGUAGE_TOOLS.md). Sem TMX/XLIFF/TBX, OCR, alinhamento/rolagem sincronizada, base lexical licenciada completa ou tradução automática. Textos de pares têm limite de 200 mil unidades UTF-16 por lado. Não promove gates de colaboração/segurança/desktop. ADR-0016.

## Histórico — alpha.10

Galeria de aparência alpha.10: **20 opções** no botão **◐** ou em **Configurações → Temas e aparência**. Inclui WritingRoom claro/escuro, Windows 10/11 claro/escuro, Office 365 claro/escuro, Office 2010 claro, retrô, GNOME 50 claro/escuro, macOS claro/escuro, KDE Plasma 6 claro/escuro, WordStar 4, DOS colorido, Cores divertidas e Adaptar ao sistema.

Selecione para experimentar; **Aplicar tema** confirma, **Cancelar/Escape** restaura. A preferência fica neste navegador, separada dos projetos e backups; preferências antigas claro/escuro são reconhecidas. Adaptar ao sistema acompanha `prefers-color-scheme`, usando WritingRoom claro/escuro. São interpretações visuais originais, com fontes locais; os temas de terminal não emulam atalhos ou formatos antigos. A aparência não altera o conteúdo do manuscrito. Impressão tem estilo de papel claro.

Evidências: **166 testes Node**, sem falhas/skips; **74 grupos Firefox**, incluindo todos os presets pedidos, prévia sem persistência, cancelar/Escape, aplicar/recarregar, preferência atual do sistema e entrada em Configurações. Pares principais de texto/fundo dos presets conferidos para contraste mínimo 4,5:1. A troca real da preferência do OS durante a sessão e a saída física de impressão não foram verificadas; o listener e o CSS estão implementados. Sem mudança de schema ou conversão de obras. ADR-0015.

## Histórico — alpha.9

Central de backup na biblioteca/Publicar/configurações: cópia no destino do servidor, verificação atual, download JSON e restauração em outro projeto; filtro de obra e até 200 gerações por filtro. Arquivados aceitam manual, não rotina. Configuração/estado separados da obra, destino selecionado por ID e paths administrados pelo servidor. Perfil/contatos excluídos dos backups de obra.

Rotina opt-in desligada por padrão: timer no servidor, intervalos 15/30/60/180/1440 min, retenção 2–50 automáticas verificadas por obra. Funciona sem browser, mas exige servidor ligado. Evita duplicar obra inalterada somente após conferir cópia anterior. Retenção após nova geração válida, sem apagar manuais, migrações, corrompidas/incompletas ou fonte. Publicação de diretório temporário por rename, limites/bytes/checksums/envelope/schema e symlinks conferidos. Fila central→projeto evita sobreposição/deadlock na instância; estado auxiliar com avisos. ADR-0014.

Evidências: baseline 151; final **162 testes Node sem falhas/skips**, incluindo temporizador real sem browser, corrupção, retenção, limites, falha de destino, symlink e CAS. **69 verificações Firefox**: central/criar/verificar/baixar, configuração, rotina/sem mudanças, edição posterior, geração anterior restaurada, reload e filtro. Build/sintaxe passaram. DOCX LibreOffice/EPUB estrutural mantidos, sem EPUBCheck. Captura da central inspecionada. Artefatos `/tmp/writingroom-browser-lkkjg9us/`, `/tmp/writingroom-export-vnjcfee6/`.

Caso privado longo: **23 verificações** em biblioteca isolada, com cópia gerenciada/restore preservando capítulos/103 snapshots/4 anexos/fontes e rotina opt-in sem duplicar inalterados. Relatório VALIDACAO-ALPHA9.json; original/pacote-base preservados. Não somar à suíte pública.

Limites: 32 MB/cópia, destinos preconfigurados, servidor precisa estar ativo; sem agendador OS/criptografia/nuvem/backup externo garantido. Perfil tem seu próprio backup. Não há lock entre processos, histórico de migração na central ou exclusão manual de gerações. Não aprovar G1 completo. Próximos: comparação lado a lado/revisão local/sessão de publicação; IA/compartilhamento depois dos gates, cloud imediatamente antes do desktop.

## Histórico — alpha.8

Catálogo com 16 modelos editáveis de escrita e preset histórico, tipo/metadados em novos projetos; sem alterar obras antigas ao abrir e sem prometer motores especializados. Perfil do autor separado em .settings, hash/base, validação, cópia privada/restore/limpeza; nome/pseudônimo só entra em nova obra por ação explícita, contatos fora dos projetos. Atalhos Personagem/Cenário/Rascunho em Pesquisa.

Caderno/Fontes com autoria/URL/acervo/data/classificação e vínculos por IDs a cenas/fichas/anexos; backlinks no inspetor, busca, edição de metadados independente do texto, menus/lixeira/duplicação. Sem fetch externo ou inclusão no livro. Primeira fonte eleva 1/2/3→4 após cópia integral verificada. Restore remapeia refs; duplicação remapeia internas; rich/anexos mantêm formato maior. ADR-0013.

Evidências: baseline 139; final **151 testes Node sem falhas/skips**, com loopback autorizado; **62 verificações Firefox**, incluindo perfil salvar/backup/limpar/restore/reabertura, pseudônimo explícito, roteiro histórico, atalhos, fonte com três vínculos/backlinks, notas intactas, backup/remapeamento e contatos ausentes da obra. Build/sintaxe passaram; DOCX LibreOffice e EPUB estrutural mantidos, sem EPUBCheck. Capturas inspecionadas. Artefatos: `/tmp/writingroom-browser-_pwtfl7_/`, `/tmp/writingroom-export-2zz59i02/`.

Caso privado: **20 verificações** em cópia restaurada do modelo longo, com fonte vinculando capítulo/anexo, migração 3→4, backup/refs remapeadas e perfil sintético fora da obra. Relatório novo VALIDACAO-ALPHA8.json; pacote-base, original e arquivos manifestados foram preservados. Não somar esses fluxos aos testes públicos.

Limites: catálogo é scaffold geral, não suporte completo a todos os formatos; perfil sem cifragem/autenticação/lock entre processos, fontes sem indexação web/OCR/leitor PDF/histórico de metadados. Cronologia é pasta de pesquisa, não timeline tipada. Pendem perfil editorial/rodadas, redline formal, comparação lado a lado, sessão de submissão, central de backup automático, IA e compartilhamento seguro. Google/Drive/OneDrive/Dropbox só imediatamente antes do desktop. G1/G2/G7 completos não aprovados; não houve conta, conexão remota ou envio do livro.

## Histórico — alpha.7

Ordem corrigida pelo usuário: recursos locais agora; Google/Drive/OneDrive/Dropbox na última etapa antes do desktop. Menus da biblioteca: editar dados/renomear, duplicar, baixar backup, arquivar/remover da lista ativa e restaurar no filtro Arquivados. Arquivamento move a pasta inteira por rename para .archived, com validação/identidade/symlink/destino, sem exclusão permanente nem conversão de formato. Duplicação remapeia IDs/textos/ricos/snapshots/anexos.

Menus de documentos na estrutura/cartões/outline/leitura/fichas/anexos, com renomear/duplicar/mover/lixeira. Arraste interno por Pointer Events com alça, marcador e ghost, antes/depois/dentro de pasta; botões usam mesmo comando. Hash estrutural e reversão da última movimentação na sessão; texto/metadata não são revertidos. Escape cancela, pastas recolhem/expandem por preferência local e seleção revela ancestrais. Nenhuma dependência nova/schema migration. ADR-0011.

Evidências: baseline 129; final **139 testes Node, zero falhas/skips**, com loopback autorizado. **56 verificações Firefox**, incluindo menus, arquivar/restaurar, duplicação rica, arraste por movimentos reais de mouse, desfazer, Escape e recolher/reabrir. Build/sintaxe passaram. DOCX LibreOffice e EPUB estrutural continuam passando; EPUBCheck ausente. Capturas inspecionadas. Artefatos sintéticos: `/tmp/writingroom-browser-osw3i1oa/`, `/tmp/writingroom-export-9hbsm503/`. A tentativa inicial com drag-and-drop nativo não concluiu o drop no harness; versão final usa captura de ponteiro validada.

Caso autorizado do livro: **17 verificações privadas** em restauração isolada, incluindo duplicar 45 capítulos/103 versões/4 anexos, reorganizar/desfazer com texto/rico intacto e arquivar/restaurar. Relatório separado `writingroom-private/.../VALIDACAO-ALPHA7.json`; original e backup-base não foram alterados. Não somar esse fluxo à suíte sintética nem publicar seu conteúdo.

Pendências: UX-URG-001/002 têm as ações principais, sem exclusão definitiva; 003/004 têm arraste e pastas, sem multisseleção/busca rápida/validação mobile real. Perfil do autor, pesquisa histórica/fontes vinculadas e backup automático local ainda pendentes. Cloud adiado, desktop por último. Sem exclusividade entre processos, undo estrutural durável ou aprovação G1/G2 completos.

## Histórico — alpha.6

Anexos locais de pesquisa integrados: Caderno/Anexos com seleção de arquivo, prévia sem save, confirmação, busca, imagem/texto para leitura e download dos bytes originais. PNG/JPEG/PDF/TXT/Markdown; sem leitura ativa PDF, HTML/SVG ou URLs de origem. Anexos são nós research fora do livro, com metadados usuais; lixeira mantém arquivo. Backup/recuperação inclui bytes/checksums e restauração remapeia referências. Sem dependências novas.

Formato 3 somente ao confirmar primeiro anexo, com backup integral verificado antes de save; suporta origem 1 ou 2. Visual mantém 3, abertura não migra, leitores antigos rejeitam. Limites: 8 MB/arquivo, 16 MB de bytes/projeto, 100 anexos, agregado até 30 MB. Bytes base64 no JSON evitam transações multi-arquivo incompletas nesta arquitetura, com custo explícito de memória/IO. Não é storage de produção de acervos grandes; SQLite segue separado. ADR-0010.

Evidências: baseline 115; final **129 testes Node sem falhas/skips** com loopback autorizado. **47 verificações Firefox** incluem importar quatro formatos (texto, PNG, JPEG, PDF), cancelar sem gravar, imagens realmente decodificadas, downloads byte-a-byte, lixeira/restauração/busca, exclusão da compilação e backup/reabertura com IDs remapeados. DOCX LibreOffice/PDF e EPUB estrutural continuam passando; EPUBCheck ausente. Build/sintaxe passaram. Captura de imagem de pesquisa inspecionada. Artefatos finais: `/tmp/writingroom-browser-aaa637jl/` e `/tmp/writingroom-export-4d3x63v_/`. Nenhum projeto/arquivo real usado como fixture.

Limites: PDF somente download, sem parser/leitor/indexação; imagens são anexos de pesquisa, ainda não inline ou exportadas com o livro. Verificações de assinatura/estrutura/CRC PNG e limites não sanitizam PDF/imagens. Sem leitoras mobile reais, Windows/macOS ou corpus amplo de codecs. Desktop, importadores ricos, imagens inline, idiomas/acessibilidade e durabilidade completos continuam pendentes. G1/G2 completos não aprovados.

## Histórico — alpha.5

Comentários privados e notas de publicação ligados aos trechos do editor visual. Painel no inspetor permite editar, ir ao trecho, buscar, resolver/reabrir e excluir com snapshot anterior. Âncoras são marcas semânticas que acompanham inserções/remoções e fragmentação por estilo. Texto projetado não muda ao anotar; hash completo protege revisões apenas de corpo/estado. Limites de anotação/schema e substituições entre âncoras são validados.

Comentários são omitidos das saídas de livro e previews, mantidos em backup/recuperação/snapshots. Notas ganham referência e seção ao fim de cada cena em TXT/HTML/DOCX/EPUB; Markdown usa definições footnote. Impressão aguarda notas renderizadas. Não é rodapé nativo Word nem revisão colaborativa. ADR-0009 registra contrato/reversão/limites.

Evidências: baseline **102 testes**; final **115 passaram, zero falhas/skips**, com `node --test --test-isolation=none packages/core/test/*.test.mjs` e loopback autorizado. **41 verificações Firefox**, incluindo busca, exclusão/snapshot/undo, privacidade nos downloads e restauração/reabertura. DOCX abriu no LibreOffice e PDF/texto conferido com nota/sem comentário privado; EPUB estrutura/ZIP/XML verificados, EPUBCheck ausente. Build local e sintaxe passaram. Artefatos sintéticos: `/tmp/writingroom-browser-1mhw1uyj/` e `/tmp/writingroom-export-9doxym24/`. Captura de revisão inspecionada; projetos reais não usados/modificados.

Não há novo pacote, migração na abertura, SQLite integrado nem desktop. Pendem anexos/imagens/tabelas/importadores ricos, rodapés nativos, conversão de tipos e busca global de anotações, i18n/acessibilidade/IME completo e durabilidade entre processos. G1/G2 completos não aprovados.

## Histórico — alpha.4

Editor visual ProseMirror integrado à aplicação aberta: marcas, títulos, blocos, listas, links, undo/redo, preview, snapshots, recuperação local, backup e exports. Legado permanece textual até conversão explícita. Primeira conversão gera backup integral verificado antes de schema 2; falha impede gravação. Conteúdo visual é JSON estrito, sem HTML arbitrário; clipboard recebe texto simples e drop é bloqueado. Hash inclui formatação; API textual não sobrescreve cena visual. Substituição inline preserva marcas e rejeita limites entre blocos. Desktop por último.

Evidências finais: **102 testes Node sem falhas/skips**, **35 verificações Firefox**, DOCX aberto no LibreOffice e EPUB estruturalmente verificado. Build do editor passou. Captura visual inspecionada. Artefatos sintéticos: `/tmp/writingroom-browser-wxq6wtt5/` e `/tmp/writingroom-export-t7akdlvz/`. Nenhum projeto real convertido. Comando de testes efetivo: `node --test --test-isolation=none packages/core/test/*.test.mjs` com loopback autorizado; execução inicial no sandbox de `npm test` falhou no HTTP por restrição do ambiente.

Limites: EPUBCheck ausente, sem validação Word/Windows/macOS/IME completo/leitores de tela. Listas DOCX têm marcadores visíveis, Markdown não garante round-trip. Dividir cena e máquina de escrever indisponíveis no visual. Ainda pendentes comentários/footnotes ancorados, imagens/tabelas/anexos, importadores ricos, estilos avançados, i18n completo e durabilidade entre processos. G1 continua não aprovado; SQLite isolado. ADR-0003 detalha conversão e reversão; README explica instalação/build e backups.

## Histórico — alpha.3


Prioridade corrigida pelo usuário: **desktop por último**. Nenhum trabalho Tauri/instaladores foi iniciado. ADR-0008 registra a ordem e os limites.

- Busca/substituição integrada com preview literal por ocorrência, escopo, case e palavra inteira; seleção individual e snapshot anterior por cena. Fingerprint de query/escopo/textos impede aplicar prévia velha e o lote é atômico no JSON.
- Aba Caderno com fichas editáveis de Pesquisa (seis tipos), coleções manuais por IDs, consultas salvas por texto/estado e capturas rápidas com autosave/hash/cópia local. Remover da coleção não apaga documento. Captura vira cena sem consumir a origem.
- Backup/restauração inclui fichas, coleções e capturas; referências de coleções são remapeadas com novos IDs. Campos opcionais no schema 1.
- Exportação DOCX básica e EPUB experimental no painel Publicar, como ZIP real/CRC/XML. DOCX aberto no LibreOffice Linux, convertido em PDF e texto conferido. EPUB validado estruturalmente, sem EPUBCheck/reader real.
- Versão/protocolo alpha.3/studio-2: reiniciar servidor anterior e recarregar. O bloqueio de protocolo incompatível continua ativo.

### Evidências desta etapa

| Comando | Resultado |
|---|---|
| Baseline | 66 testes passaram |
| `node --test --test-isolation=none packages/core/test/*.test.mjs` | **85 passaram, 0 falhas, 0 skips** |
| `python3 scripts/verify-studio-firefox.py` | **26 verificações de fluxo passaram** |
| `python3 scripts/verify-book-exports.py` | DOCX abriu no LibreOffice, PDF/texto conferidos; ZIP/XML/manifest/spine do EPUB verificados |
| `node --check` módulos novos e app/server | Passou |

Artefatos sintéticos: `/tmp/writingroom-browser-ar0d6ul2/` e `/tmp/writingroom-export-y6y2h_7s/`. Capturas de substituição e caderno inspecionadas. Não contêm manuscritos reais. Novos testes: 13 editorial/notebook, 3 exportação ZIP e 3 HTTP; 66 anteriores preservados. Todos em Linux/Node 26; não há testes Word/Windows/macOS/EPUBCheck. Os scripts fecham seus próprios processos e usam perfis temporários.

### Limites restantes

Ainda não há editor semântico/rich-text, comentários/footnotes ancorados, anexos, importadores Scrivener/DOCX/RTF, renderização completa de Markdown, PDF nativo, i18n/dicionários próprios completos, relações/timeline avançadas, sync, IA ou plugins. EPUB é experimental e DOCX básico. Fichas são templates de texto, não um grafo/CRUD tipado completo. A busca/substituição não aceita regex.

SQLite e lock entre processos continuam isolados; JSON de produção ainda usa fila por servidor. A preservação dos projetos não foi dispensada pela ordem desktop-last. G1 não aprovado. Não houve escrita em projetos reais durante os testes.

## Histórico da entrega visível alpha.2

Solicitação explícita do usuário: implementar na aplicação aberta, pois as provas isoladas não mudavam a experiência. ADR-0007 registra a decisão de ampliar o protótipo JSON, sem fingir integração SQLite ou aprovação dos gates de produção.

- Biblioteca refeita, modelos vazio/romance/não ficção e configurações persistentes de projeto.
- Navegação Escrever / Planejar / Manuscrito / Publicar. Cartões e outline usam IDs e comandos da mesma árvore, filtros de pasta/estado e reordenação. Lixeira com restauração individual, mover para pasta e acesso à pesquisa.
- Inspector de sinopse, notas, status, etiqueta, keywords e meta; busca inclui notas/keywords. Metas e contagens da cena/livro/sessão.
- Editor textarea com inserção de sintaxe Markdown, fonte, tema claro/escuro, foco, rolagem aproximada e referência lateral de leitura. Não é editor rich-text.
- Leitura contínua dos compiláveis, com retorno à edição de cada cena.
- Snapshots nomeados, leitura, comparação do bloco alterado e restauração com preservação anterior. Divisão de cena no cursor com snapshot, mesma ordem e validação Unicode.
- Importação UTF-8 TXT/Markdown com preview, divisão por headings, limites/avisos e commit completo. Fonte não é alterada; headings em código não dividem cenas.
- Publicação: prévia textual, sumário, seleção/omissões/contagens, Markdown/TXT/HTML escapado e impressão/salvar PDF do navegador. HTML não interpreta toda a sintaxe Markdown.
- Backup JSON completo com checksum e restauração em novo projeto, remapeando IDs conhecidos de árvore/documentos/snapshots. Diferente da prova SQLite. Nenhum original é substituído.
- Cópia local de texto até confirmação; recuperação após reabrir, retry e escolha explícita em conflito com snapshot do texto do disco; download de recuperação. Metadados com falha ainda exigem recuperar antes de recarregar.
- `/api/status` identifica interface compatível. Cliente antigo/servidor antigo não pode confirmar campos que ignora: aviso de reinício e bloqueio das ações. `npm run dev` agora acompanha módulos do servidor; `npm start` executa sem watch.

## Arquivos e compatibilidade

UI em `apps/web/{index.html,style.css,app.js}`, rotas em `server.mjs`, workflows em `packages/core/src/workspace.mjs` e validações opcionais em `core.mjs`. Versão de app/lockfile atualizada; schema JSON continua 1. Campos novos são opcionais e aparecem apenas quando o usuário os edita. Não houve alteração dos arquivos existentes em `writingroom-projects` durante os testes.

A prova `packages/storage-spike` permanece separada: revisão monotônica e lock entre processos ainda **não** protegem o servidor JSON de produção. Ele mantém fila de uma instância e hash de conteúdo. Não anunciar G1 aprovado.

## Evidências reproduzidas

| Verificação | Resultado |
|---|---|
| Baseline antes da entrega | 50 testes passaram |
| `node --test --test-isolation=none packages/core/test/*.test.mjs` final | **66 passaram, 0 falhas, 0 skips** |
| `python3 scripts/verify-studio-firefox.py` final | **19 verificações de fluxo passaram** em Firefox real, perfil/projetos/downloads temporários |
| `node --check` app, server, core e workspace | Passou |
| Inspeção de capturas | Biblioteca, cartões, editor/referência, publicação, versões, tema escuro e viewport estreito; contraste corrigido |

Distribuição da suíte: 8 core, 10 regressão, 12 HTTP, 13 prova SQLite, 2 storage legado, 11 DOM/fetch simulados, 10 workspace. No Node sem SQLite os 13 casos da prova têm skip explícito. Scripts de lint/typecheck/build não existem neste protótipo; não foram inventados resultados.

Firefox real: criar modelo; escrever/salvar; cartões/outline; notas/metas; referência; leitura/publicação; reabrir e conferir persistência; viewport estreito; importar pelo controle File com preview; snapshot/compare/restore usando diálogos nativos; dividir no cursor; configurações; tema; download de backup; falha sintética no projeto temporário e conflito resolvido preservando ambas versões; restaurar arquivo de backup em novo projeto. Algumas interações usam JS no DOM; não é auditoria de todos os eventos de teclado/leitores de tela.

Artefatos finais: `/tmp/writingroom-browser-73f_s_0j/` (capturas, perfil e downloads sintéticos). O script informa novo caminho a cada execução. Não são screenshots dos projetos do usuário. Execuções intermediárias corrigiram o harness de diálogos nativos e espera de transições CSS; as afirmações acima referem-se à execução final que passou.

## Limites de qualidade e escopo

- Na alpha.2 ainda não havia DOCX/ePub; a alpha.3 os acrescenta nos limites descritos acima. Demais recursos avançados continuam pendentes.
- Contagens são aproximações por whitespace. Painel lateral e manuscrito contínuo são leitura. Comparação de versões usa bloco por prefixo/sufixo, não diff mínimo de palavras. Rolagem máquina de escrever estima linhas explícitas.
- Limites: importação 1,5 MB/200 cenas; requests de importação até 10 MB para acomodar JSON escapado; restauração pela UI até 32 MB, request até 33 MB. Demais requests continuam 2 MB. Backup é checksum, não autenticação/assinatura.
- localStorage pode falhar, ser limpo ou não existir entre origens diferentes. Cópia não é criptografada nem backup independente. UI sinaliza falha e preserva edição na página; metadados não têm revisão/CAS.
- Gate de storage/durabilidade, migração, crash/OS/hardware e reader de schema futuro continuam pendentes. Não usar dois processos escritores no mesmo projeto JSON.
- Firefox/Linux foi testado; Windows/macOS, leitores de tela, navegador mobile real, impressão/PDF resultante e performance de livros enormes não foram validados.

## Histórico preservado

Etapas anteriores: catálogo SCR-001–084; domínio all-or-nothing nos casos cobertos, compile aninhado/lixeira; API Host/Origin/JSON/bytes, erros públicos e biblioteca com entradas indisponíveis; prova isolada SQLite com revisões, lock, idempotência, backup/restauração e testes SIGKILL. As provas de SQLite não são funcionalidades da UI atual.

## Caso real privado autorizado pelo autor — 2026-11-02

A pedido explícito do usuário, foi gerado um modelo completo a partir de seu DOCX privado, sem modificar o original nem incluir texto real nas fixtures públicas. Fonte: 3 partes, 45 capítulos, 5.934 parágrafos, aproximadamente 147 mil palavras. Cabeçalhos foram transferidos para navegação; narrativa reconstruída e comparada integralmente. Backup JSON restaurável e pacote privado com DOCX original, relatórios e exports foram criados em writingroom-private (ignorado pelo controle de versão); ULTIMO_MODELO.txt aponta para a pasta. Uma cópia restaurada está na biblioteca local padrão.

Modelo: 20 fichas por menções, 103 snapshots, 6 coleções e 4 anexos. Exemplos editoriais permanecem em Pesquisa, fora das 48 seções publicadas. Não são uma revisão literária ou fatos novos do enredo. 14 verificações de interface privada passaram em Firefox isolado, incluindo restauração pelo seletor nativo, manuscrito/planejamento/coleções/anexos e reload. DOCX exportado teve 5.888 parágrafos na sequência esperada e abriu no LibreOffice; EPUB teve sequência textual e estrutura XML conferidas, sem EPUBCheck. Fonte e arquivos do pacote conferidos por SHA-256.

Testes públicos continuam sintéticos (129 casos registrados na alpha.6); este teste real separado não altera essa contagem nem prova cobertura integral. Preferências de navegador, undo de sessão, filas/conflitos/rascunhos locais não são serializados no backup. Usar cópias restauradas do modelo para testes destrutivos futuros, nunca editar a fonte ou o backup-base. Capturas/relatórios/textos privados não devem ser redistribuídos no código.

## Auditoria solicitada — ações, organização e configurações (2026-11-02)

Sem alteração de versão ou código da aplicação nesta auditoria. Conferidos library/renderTree/renderStory/renderNotebook/settingsForm, ações da API e domínio de fichas/anexos. Faltam menus de projeto/ações diretas consistentes, arquivamento/remoção de projeto, drag-and-drop estrutural, perfil civil/pseudônimo/contatos, central de backup e conexões Google/Drive/OneDrive/Dropbox. Personagens/lugares, imagens/PDF de pesquisa e backup manual existem parcialmente; faltam vínculos/fontes estruturadas e fluxo mais visível.

Criada a fila urgente UX-URG-001–012 em docs/roadmap/URGENT_UX_AND_SETTINGS.md, com estado existente versus pendente, ordem, dependências e critérios de aceite. NEXT/NEXT_SESSION priorizam essa fila antes de imagens inline/importadores. Nenhuma conta conectada, dado enviado, projeto alterado ou migração executada. Verificação desta etapa é inspeção estática/documental; não foram executados novos testes e os resultados anteriores permanecem históricos.

## Planejamento profissional solicitado — 2026-11-02

Somente documentação, sem alteração da alpha.7/studio-6. Criadas especificação PROFESSIONAL_EDITORIAL_WORKSPACE, roadmap PRO-001–027, threat model EDITORIAL_SHARING_AND_AI e ADR-0012. Atualizados spec/master/README/NEXT/NEXT_SESSION. Decisões confirmadas com o usuário: alterações rastreadas mais comparação lado a lado; ambos compartilhamentos, pacote criptografado primeiro e acesso online por convite/e-mail depois.

Escopo: Autor/Editor e carteira de múltiplas obras com grants, área editorial, redlines/camadas/aceite/conflitos, sessão independente de publicação e pacote para editora, IA contextual opt-in e catálogo extensível de tipos. Documentadas diferenças entre papel e UI, e-mail e chaves, checksum e cifra, cópia/expiração/revogação, exportar e enviar, e contexto de IA versus treinamento. Os 14 critérios de aceite propostos não são testes executados. Sem conta, convite, envio, segredo, migração ou conexão criada; nenhum manuscrito enviado. Validação apenas de coerência/links/IDs e decisões documentadas. Gates continuam; cloud imediatamente antes do desktop, desktop por último.
