# Alterações

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

## Preparação online — 2026-11-03 (sem nova versão do aplicativo)

ADR-0024 e revisão E1 interna; prova sintética de autorização com seis testes adversariais. Não muda obras, pacotes ou interface alpha.18. Backend autenticado, persistência e HPKE continuam pendentes.


## 0.1.0-alpha.18 — 2026-11-03

A alpha.18 entrega **Revisão → Nova rodada editorial**: selecionar cenas, título e participantes declarados, conferir a projeção e assinar/cifrar uma base congelada. A primeira rodada exige backup integral verificado antes do **formato 7**. Abrir o diálogo/cancelar antes de confirmar não migra. Leitura aceita formatos 1–7; acompanhamento, visual, fontes, anexos e propostas não rebaixam o formato.

Na biblioteca, **Abrir rodada / devolutiva** confere assinatura/pin e frase. Uma oferta cria cópia de trabalho nova com vínculos por IDs opacos, sem expor IDs da origem ou comentários privados. Na cópia, use **Propor alteração** mantendo texto/formatação na base; **Preparar devolutiva** exporta somente propostas pendentes vinculadas. Aceitar na cópia não altera o original nem equivale a devolver sugestões. Cópias independentes v1/v2 não são associadas retroativamente a uma obra.

Na origem, **Receber devolutiva** exige escolha explícita da obra, mostra original/proposto, duplicatas e conflitos. A confirmação revalida participante, rodada, confiança e base completa e cria apenas pendências; antes de gravar uma entrada nova, gera backup manual integral verificado no destino selecionado da central. Aceitar texto continua decisão individual com snapshot, preservando as anotações privadas do original. Qualquer mudança de texto/formatação/comentário bloqueia a devolutiva inteira sem aplicar parcialmente. Encerrar rodada bloqueia novos recebimentos, sem decidir pendências já importadas.

Recibos de proposal_id/hash/review_id e return_id/hash ficam na obra. Replay conhecido não duplica nem reabre decisão, inclusive após aceite/reinício e backup/restauração que contém esses recibos. Restauração remapeia cenas/review_id/snapshots, preservando IDs externos de rodada/proposta. Backup anterior a um recebimento não conhece esse recibo; forks restaurados são independentes e o destino precisa ser escolhido pelo usuário. Não há idempotência global entre forks ou log inviolável.

Limites: 10 rodadas/12 MB de bases e metadados, 200 cenas por rodada, 1000 propostas/4 MB por devolutiva, 20 mil unidades UTF-16 por lado e obra de até 30 MB. Quatro prévias de rodada por instância, 5 minutos, além das prévias legadas. Envelope v3 assinado Ed25519 sobre a cifra AES-GCM/scrypt existente; kind/participantes/base/escopo conferidos. Chaves/pins globais permanecem fora da obra e de seus backups. Confidencialidade continua por frase compartilhada; sem autenticação de e-mail, E2EE, serviço online ou auditoria externa. Formato 7 é JSON em claro no disco. ADR-0023.

Verificação em 2026-11-03, Linux x86_64 / Node v26.13.0: baseline **231 testes Node**; **243 testes Node aprovados, sem falhas/skips**, e **139 fluxos Firefox** (85 amplos, 9 redline, 11 Editor, 11 pacote v1, 11 chaves/v2, 12 rodada/devolutiva). Cobertura nova: ciclo entre instalações, privacidade/IDs opacos, base textual/visual e comentário privado, importação sem alterar manuscrito, aceite com snapshot, replay após reinício/restauração/reexportação, remapeamento de recibos, IDs/base/escopo adulterados, revogação/encerramento, edição livre na cópia, limites e mil pendências em um agregado, staging, falha de migração/checkpoint e conflito após prévia. Captura móvel inspecionada.

Livro privado somente em cópia restaurada: **48 cenas / 1.954.430 bytes de projeção**, migração com backup verificado, oferta/devolutiva assinadas, sugestão recebida sem alterar texto, aceite individual com snapshot e replay após novo restore sem duplicar. O modelo-base e checksum do backup original permaneceram intactos. Relatório privado `writingroom-private/VALIDACAO-ALPHA18-RODADAS.json`; nenhum trecho publicado.


## 0.1.0-alpha.17 — 2026-11-03

A alpha.17 acrescenta **Biblioteca → Chaves editoriais**: criar identidade Ed25519 com chave privada cifrada por frase, baixar cartão público e backup cifrado da chave, restaurar backup e trocar a identidade ativa com confirmação da impressão anterior. Chaves antigas ficam preservadas/inativas; até 5 identidades e 50 contatos. O arquivo separado `.settings/editorial-identities.json` não entra nos backups das obras. Frases não são guardadas pelo app; backup de chave sem a frase não recupera acesso.

Cartão de contato só vira chave conferida quando o usuário informa a impressão SHA-256 completa confirmada por outro canal. Nome permanece declarado; a conferência do canal é declaração do usuário, não autenticação de e-mail/civil pelo app. Chave nova com nome igual exige nova conferência. Revogar mantém o registro e bloqueia novas operações e confirmações pendentes nessa instalação; não apaga arquivos entregues nem reativa o pin.

Em **Publicar → Pacote editorial cifrado**, escolha **Assinar com chave conferida — v2**, o destinatário conferido e informe a frase de desbloqueio da sua chave, separada da frase do pacote. A prévia vincula chaves/estado/conteúdo. Assinatura Ed25519 cobre o envelope cifrado inteiro e o destinatário, com domínio próprio. Verificação usa o pin já conferido, antes de decifrar. O arquivo expõe chave pública do remetente e fingerprints para roteamento/verificação, permitindo vinculação entre arquivos.

A abertura exige assinatura por padrão na UI. Para v1, desative explicitamente essa exigência e veja “Sem assinatura”; v2 inválido não cai para v1. Antes de confirmar staging, a confiança/revogação é conferida novamente. A assinatura prova controle da chave pinada, não identidade civil ou e-mail. A cifra ainda depende da frase compartilhada; não cifra para a chave pública do destinatário nem oferece E2EE/grants. Cópia importada continua independente, JSON em claro, sem atribuição autenticada ou proveniência assinada persistida na obra. **Rodadas, bases e devolutivas ao original continuam pendentes.** ADR-0022; obras permanecem nos formatos 1–6.

Validação em 2026-11-03, Linux x86_64 / Node v26.13.0: baseline **221 testes Node**; **231 testes Node aprovados, sem falhas/skips**, e **127 fluxos Firefox** (85 amplos, 9 redline, 11 Editor, 11 pacote v1 e 11 chaves/assinatura). Testes novos: geração e backup protegido, unlock incorreto, privada divergente mesmo com AEAD válida, CAS, rotação explícita, persistência/arquivo inválido/symlinks, pin externo divergente/revogado/substituído, assinatura interoperável com Node, adulteração de chave/cifra/destinatário, downgrade, duas instalações HTTP, revogação entre staging/confirm e ausência de chave privada/frase na listagem. Firefox exercitou três instalações locais isoladas, download de cartão/backup, conferência manual, assinatura, erro de frase, importação, revogação, recuperação e viewport de 500 px; captura móvel inspecionada.

Caso privado em cópia restaurada: **48 cenas, 1.954.435 bytes de projeção**, cifradas/assinadas e conferidas por pin sintético antes de abrir, cópia independente e backup/restauração preservaram textos; recuperação da chave em instalação isolada funcionou. Origem restaurada e checksum do backup-base intactos. Relatório `writingroom-private/VALIDACAO-ALPHA17-ASSINATURAS.json`, sem trechos publicados. Sem envios externos, dependências novas ou promoção dos gates de autenticação remota/E1 completo.


## 0.1.0-alpha.16 — 2026-11-03

A alpha.16 acrescenta **Publicar → Pacote editorial cifrado** e **Abrir pacote cifrado** na biblioteca. Escolha de 1–200 cenas do Manuscrito, título compartilhado e remetente/destinatário declarados; confira o texto e as notas incluídas antes de cifrar. A projeção preserva texto/formatação suportada e notas de publicação, excluindo pesquisa, anexos, lixeira, comentários privados, notas do inspetor, metadados, acompanhamento, perfil, versões e propostas. Não há envio automático.

O arquivo `.wroom-package.json` usa AES-256-GCM e scrypt (N=131072, r=8, p=1), com salt/IV aleatórios e cabeçalho autenticado. Parâmetros fixos e uma operação criptográfica por instância limitam recursos. Frase secreta de 16–256 caracteres, confirmada na exportação, combinada por outro canal; não é persistida pelo app. Tamanho mínimo não garante entropia: use frase longa e exclusiva. Sem recuperação: perdida a frase, gere outro pacote pela origem preservada.

A abertura confere integridade e destinatário declarado e apresenta prévia temporária (5 minutos, até 4 entradas) antes de criar uma **nova obra independente**. Cancelar/expirar não cria obra; repetir a confirmação do mesmo token não duplica. Reabrir o arquivo em nova prévia pode criar outra cópia. A obra importada e seus backups são **JSON sem criptografia no disco**, como os projetos locais existentes. Não há migração nem sobrescrita da origem.

Este é um primeiro incremento de cópia editorial protegida por segredo compartilhado: **sem autenticação de e-mail, assinatura de remetente, grants, E2EE ou devolutiva/merge ao original**. Quem tem a frase pode abrir e criar pacotes. Não há revogação de arquivo já entregue nem cofre/recuperação de chaves. Cifra executada no servidor local confiável; frase/conteúdo passam pelo loopback. ADR-0021 registra contrato, ameaças, limites e fontes primárias.

Verificação em 2026-11-03, Linux x86_64 / Node v26.13.0: baseline **210 testes Node**; implementação **221 testes Node aprovados, sem falhas ou skips**. **85 fluxos Firefox amplos + 9 de redline + 11 de perspectiva Editor + 11 de pacote**, com bibliotecas/perfis isolados. Cobertura nova: allowlist/ordem/privacidade, plain/visual/notas, CAS da prévia, frases divergentes/incorretas, destinatário divergente, adulteração de cifra/tag/IV/salt, versões/KDF/base64/JSON duplicado/profundidade/tamanho, conteúdo inválido mesmo com tag válida, staging/expiração/cancelamento/capacidade/repetição/falha de gravação e limite HTTP de concorrência. Firefox cobre download, segredo limpo dos campos, cancelamento, cópia independente e viewport de 500 px. Captura móvel inspecionada.

Livro privado: **48 cenas do Manuscrito, 1.954.433 bytes de projeção**, em cópia restaurada isolada; cifrar/gravar arquivo/decifrar/staging/criar cópia e backup/restauração preservaram todos os textos selecionados. Origem restaurada e checksum do backup-base inalterados. Relatório privado `writingroom-private/VALIDACAO-ALPHA16-PACOTE.json`, sem trechos publicados.


## 0.1.0-alpha.15 — 2026-11-03

A alpha.15 entrega **Configurações · Escritor/Editor** no cabeçalho. Editor abre um painel das obras locais com propostas pendentes, conflitos, comentários visuais abertos e acesso à cena, histórico de propostas e versões/comparação. Filtros por etapa e pendência; Atualizar painel consulta o disco. Voltar a Escritor restaura a biblioteca. Autoria/responsabilidade continuam declaradas, sem autenticação ou permissões.

**Acompanhar obra** guarda responsável declarado (100 caracteres), etapa, observações e próximos passos (10 mil caracteres cada). A preferência de perspectiva fica no navegador; acompanhamento pertence à obra e acompanha backup, restauração e duplicação. O primeiro salvamento exige backup integral verificado antes do **formato 6**. Abrir painel ou cancelar não migra. Leitura aceita formatos 1–6; propostas, fontes, anexos e editor visual não rebaixam o formato. Conflito de acompanhamento mantém os campos locais e pede reabertura explícita. `tracking_hash` é derivado e não entra na recuperação/restauração.

Validação em 2026-11-03, Linux x86_64 / Node v26.13.0: baseline 205 testes; **210 testes Node aprovados, sem falhas/skips** após implementação. **85 fluxos Firefox amplos + 9 de redline + 11 de perspectiva Editor** aprovados. Testes cobrem validação atômica/CAS, migração e falha de backup, contagens/comentários/lixeira, preservação de formato 6, backup gerenciado/restauração/reabertura, troca de modo, filtros, navegação, aceite existente e viewport de 500 px. Captura móvel inspecionada. Artefatos temporários: `/tmp/writingroom-browser-nm4ctp3f`, `/tmp/writingroom-browser-4sjm2sxe`, `/tmp/writingroom-browser-k0x4ff8k`.

Caso privado: 78 documentos em cópia restaurada isolada; acompanhamento salvo/reaberto/restaurado, migração com backup verificado, texto e snapshots preservados; checksum do backup-base inalterado. Relatório privado `writingroom-private/VALIDACAO-ALPHA15-EDITOR.json`, sem conteúdo do manuscrito na documentação.


## Não lançado — 2026-11-02

- Corrigidas alterações parciais de metadados e proveniência após rejeição de exclusão de raiz; validações adicionais de domínio.
- Corrigidas inclusão inicial de cenas aninhadas na compilação, busca de subárvores na lixeira e restauração com pai excluído.
- Adicionadas versões nomeadas, lista com prévia e restauração do texto com preservação da versão anterior.
- Flush antes de navegação/exportação/snapshots e bloqueio de saída após falha de salvamento.
- Catálogo complementar com 84 itens do manual Windows, critérios de aceite e dependências; documentação de continuidade e 14 testes novos.
- Sem mudança de schema, instalação de dependências ou migração de projetos.

### Segunda etapa — proteção da API local

- Servidor importável para testes HTTP; fila por projeto protege load→command→save na mesma instância.
- Texto/criação de snapshot/restauração exigem hash de base; conflitos não sobrescrevem texto.
- Biblioteca mantém projetos inválidos visíveis; mensagens públicas não expõem caminhos, stack ou conteúdo.
- Host/Origin/JSON/bytes/métodos/rotas validados; symlinks diretos e identidade incompatível bloqueados.
- Temporários exclusivos com limpeza específica em falhas; schema 1 preservado.
- Suíte ampliada de 22 para 37 testes; ADR-0006 e política da API documentadas.

- Rejeitados containers de documentos e datas inválidos antes da gravação; corrigido risco de perda na serialização de arrays.

### Terceira etapa — prova isolada de storage (não integrada à aplicação)

- ADR-0002, DDL de prova e repository SQLite separado, sem dependências externas ou alteração do JSON legado.
- Revisões monotônicas, comandos idempotentes, transação de texto/histórico e escritor único cooperante.
- Backup independente de WAL, manifesto e verificação de integridade; restore em destino novo sem sobrescrita.
- 13 testes novos: concorrência entre processos, SIGKILL antes/depois de COMMIT, rollback SQL, corrupção e preservação de destinos; suíte total 50 passando.
- `npm run storage:demo` cria somente dados sintéticos em diretório temporário. Não há migração ou UI de backup entregue.

## 0.1.0-alpha.2 — estúdio visível, 2026-11-02

- Biblioteca e UI refeitas, modelos de projeto e ambientes Escrever/Planejar/Manuscrito/Publicar.
- Cartões e outline da mesma árvore, notas/etiquetas/keywords/metas, busca ampliada, referência de leitura e tema/fonte/foco.
- Importação TXT/Markdown com preview, divisão no cursor, comparação de versões e restauração protegida.
- Publish Room com preview textual, relatórios, MD/TXT/HTML, impressão do navegador e backup/restauração JSON em novo projeto.
- Cópia local, recuperação e resolução explícita de conflitos com snapshot do disco; bloqueio de interface conectada a servidor antigo.
- 66 testes Node e 19 verificações de fluxo Firefox; nenhuma migração dos projetos existentes. SQLite continua uma prova separada. Funcionalidades avançadas do manual seguem parciais/planejadas.

## 0.1.0-alpha.3 — caderno, revisão e novos formatos, 2026-11-02

- Busca/substituição literal com prévia por ocorrência, seleção, escopos e proteção contra lote obsoleto; snapshots antes de alterar.
- Aba Caderno: fichas textuais de seis tipos, coleções manuais/dinâmicas e capturas com cópia para cena sem apagar origem.
- Hashes de base em coleções/capturas, backup com remapeamento de referências e recuperação local preservando caderno remoto em Pesquisa.
- DOCX básico e EPUB experimental como arquivos ZIP reais, sem dependências em runtime. DOCX abriu no LibreOffice; EPUB passou em verificações estruturais, sem EPUBCheck.
- 85 testes Node e 26 verificações de fluxo Firefox passaram; desktop/instaladores explicitamente ficam por último.

### Alpha.4 — editor visual integrado

- Formatação semântica ProseMirror, estilos/listas/links, undo/redo por cena; bundle local e licenças MIT preservadas.
- Conversão explícita com snapshot, backup integral verificado e schema 2 para impedir gravação destrutiva por clientes antigos; abertura não migra.
- Autosave/recuperação/conflitos incluem JSON e hash de formatação; snapshot/backup/restauração e exports preservam elementos suportados.
- Clipboard texto simples, URLs/schema/limites estritos, substituição visual inline com preservação de marcas; edição textual visual bloqueada inclusive na prova SQLite.
- 102 testes Node, 35 fluxos Firefox; DOCX aberto no LibreOffice, EPUB estrutural sem EPUBCheck. Desktop por último; comentários/footnotes/anexos ainda pendentes.

### Alpha.5 — revisão vinculada ao texto

- Comentários privados e notas de publicação em seleções visuais, com editar/localizar/buscar/resolver/reabrir. Excluir guarda snapshot e permite undo.
- Âncoras semânticas acompanham texto, estilos e quebras; validação rejeita metadados divergentes/limites; hash inclui corpo e estado.
- Notas finais por cena em TXT/HTML/DOCX/EPUB e definições Markdown. Comentários excluídos de saídas de livro, mantidos no backup. Impressão aguarda render das notas.
- 115 testes Node e 41 verificações Firefox passaram; DOCX LibreOffice/PDF/texto e EPUB estrutural. Sem novo pacote ou desktop; rodapé nativo Word ainda pendente. ADR-0009.

### Alpha.6 — anexos de pesquisa

- Caderno/Anexos: importar PNG/JPEG/PDF/TXT/MD com prévia/confirmação/cancelamento, buscar, consultar imagens/texto e baixar original. PDF só download.
- Bytes/checksum/referências incorporados ao agregado e ao backup; lixeira mantém arquivos, restauração remapeia IDs. 8 MB/arquivo, 16 MB/projeto, 100 anexos e agregado até 30 MB.
- Formato 3 após backup integral verificado; abertura não migra e visual não rebaixa. Confirmação vincula checksum da prévia e hash da biblioteca. Sem pacotes novos.
- 129 testes Node e 47 verificações Firefox; DOCX LibreOffice e EPUB estrutural continuam passando. Desktop por último; imagens inline e importadores ricos seguem pendentes. ADR-0010.

### Alpha.7 — biblioteca e organização direta

- Menus editar/renomear, duplicar, backup, arquivar/restaurar na biblioteca; arquivos são preservados. Menus equivalentes por tipo em documentos, fichas e anexos.
- Arraste por captura de ponteiro em árvore/cartões/outline/leitura; antes/depois/dentro, Escape, hash da estrutura e desfazer última movimentação da sessão. Botões e seletor usam o mesmo fluxo.
- Pastas recolhidas/expandidas por projeto no navegador. Duplicação preserva/remapeia texto rico, versões e anexos.
- 139 testes Node/56 verificações Firefox, exports mantidos e 17 verificações privadas com livro longo. Sem migração/schema novo.
- Nova ordem do usuário: conexões Google/Drive/OneDrive/Dropbox somente na última etapa antes do desktop; continuar pesquisa/perfil/backup locais. ADR-0011.

### Planejamento profissional — sem alteração de versão

- Especificados modo Editor, carteira/permissões por obra, área de revisão, redline de autor/editor e comparação lado a lado.
- Confirmados com o usuário: pacote criptografado primeiro, acesso online por convite/e-mail depois; ambos permanecem no escopo.
- Sessão editável de publicação, pacote para editora, IA orientada por projeto e catálogo de formas de escrita documentados.
- Adicionados 27 itens PRO e 14 critérios de aceite, threat model e ADR-0012; sem código, conexão, envio de conteúdo ou alegação de E2EE existente.

### Alpha.8 — modelos, perfil privado e pesquisa vinculada

- Novo projeto com 16 modelos e preset histórico; estruturas editáveis, sem prometer exportadores ou motores especializados. Autoria explicitamente escolhida.
- Perfil local com nome civil/pseudônimo/contatos, CAS e backup/restauração próprios; contatos separados do projeto.
- Atalhos Personagem/Cenário/Rascunho; Caderno/Fontes com URL/metadados/classificação e vínculos/backlinks, sem fetch automático.
- Formato 4 após backup integral antes da primeira fonte; restore e duplicação remapeiam referências, rich/anexos não rebaixam formato.
- 151 testes Node/62 fluxos Firefox; 20 verificações privadas do livro longo. Exports DOCX/EPUB mantidos nos limites anteriores. ADR-0013; IA/compartilhamento/redline formal continuam pendentes.

### Alpha.9 — central de backup local

- Criar/verificar/baixar/restaurar cópias gerenciadas, histórico por obra e destinos por ID configurados no servidor.
- Rotina opt-in com intervalo/retencão persistidos, ativa somente com servidor ligado; evita nova geração sem alterações após verificar anterior.
- Retenção somente de automáticas verificadas após nova cópia válida; manuais/migrações/corrompidas/incompletas e origem preservadas.
- Limite de 32 MB/cópia, staging/rename, checksums/envelope/schema, symlinks e erros visíveis; perfil separado.
- 162 testes Node/69 fluxos Firefox e 23 verificações privadas do caso longo. ADR-0014. Sem cloud, cifra ou agendador do OS; comparação/revisão local seguem próximas.

## Aparência alpha.10 — 2026-11-02

Galeria de aparência alpha.10: **20 opções** no botão **◐** ou em **Configurações → Temas e aparência**. Inclui WritingRoom claro/escuro, Windows 10/11 claro/escuro, Office 365 claro/escuro, Office 2010 claro, retrô, GNOME 50 claro/escuro, macOS claro/escuro, KDE Plasma 6 claro/escuro, WordStar 4, DOS colorido, Cores divertidas e Adaptar ao sistema.

Selecione para experimentar; **Aplicar tema** confirma, **Cancelar/Escape** restaura. A preferência fica neste navegador, separada dos projetos e backups; preferências antigas claro/escuro são reconhecidas. Adaptar ao sistema acompanha `prefers-color-scheme`, usando WritingRoom claro/escuro. São interpretações visuais originais, com fontes locais; os temas de terminal não emulam atalhos ou formatos antigos. A aparência não altera o conteúdo do manuscrito. Impressão tem estilo de papel claro.

Implementação: themes.js, appearance.js, themes.css e diálogo da interface; ADR-0015. Evidência: 166 testes Node e 74 grupos Firefox. Sem alteração do formato de projeto.

## Tradução e idiomas — alpha.11 (2026-11-02)

A alpha.11 acrescenta **Tradução** em todos os projetos e quatro modelos em **Novo projeto → Tradução — livro/artigo/documento/outros textos**. Crie trechos com original e idioma de destino, escreva lado a lado, acompanhe estados e exporte revisão bilíngue MD. Originais e glossário ficam em Pesquisa e fora da publicação; backups preservam os vínculos. Alterar o texto original reabre traduções concluídas para Revisão.

**Dicionário e idiomas** oferece verbetes pessoais (definição, sinônimos, equivalentes, contexto e fonte), busca no glossário e em trechos traduzidos, exportação MD e links explícitos de consulta externa. O glossário funciona offline por obra; **não há base lexical completa offline ou tradução automática integrada**. Nenhuma cena é enviada automaticamente. Veja [especificação de tradução e idiomas](../specifications/TRANSLATION_AND_LANGUAGE_TOOLS.md) para limites e evolução.

Implementação: translation.mjs, project-catalog.mjs, workspace.mjs, API translation/glossary/bilingual e interface. ADR-0016. Sem schema novo; backup antes da migração para fontes schema 4.

Evidência alpha.11: 174 testes Node sem falhas/skips e 84 grupos Firefox no smoke amplo e 3 verificações móveis em perfil próprio. Revisão reaberta após original alterado, estado sincronizado e conflitos rejeitados sem alteração. Não inclui nova validação do manuscrito privado.

## Pesquisa de anexos e idiomas — alpha.12 (2026-11-02)

A alpha.12 permite guardar qualquer tipo de anexo como original para download e **extrair texto de PDF, Word DOCX, ODT, TXT e Markdown** no projeto. Em **Caderno → Anexos → Abrir → Extrair texto / pesquisar / traduzir**, revise a prévia ou selecione um trecho e crie pesquisa vinculada ou original de tradução. Arquivos sem extrator aceitam transcrição manual; não há OCR ou execução de anexos.

**Dicionário e idiomas** ganhou consulta offline às bases MyThes pt/en instaladas, importação/exportação de base lexical JSON compartilhada e conector LibreTranslate com autorização de envio, prévia e confirmação separadas. Tradução automática precisa de um serviço configurado; não há motor neural incluído. Credenciais ficam no processo do servidor, fora das obras. Definições/traduções offline dependem da base importada, sem alegação de dicionário universal pré-instalado.

ADR-0017 e ATTACHMENT_RESEARCH_TRANSLATION_ANALYSIS.md detalham a hipótese implementada, matriz de formatos, limites, fontes lexicais, dependências locais e contrato LibreTranslate. Schema 3/4 preservado; novos tipos de anexo exigem esta versão para leitura. Desktop por último.

## Comparação editorial — alpha.13 (2026-11-02)

A alpha.13 entrega **Versões → Comparar duas versões lado a lado**: escolha dois snapshots ou o texto atual no disco, inverta os lados, veja linhas inseridas/removidas e filtre somente alterações. Navegue pelas diferenças e carregue mais linhas quando necessário. Em telas estreitas, os lados ficam empilhados. Comparação é somente leitura; restauração continua no fluxo existente com preservação da versão anterior.

A análise é textual. Diferenças de formatação/anotações são avisadas, sem diff visual detalhado. Trechos grandes usam comparação simplificada identificada, com contagens aproximadas; texto não é descartado. Alterar as seleções pede nova consulta. Isto entrega comparação de versões; propostas de redline e aceitar/rejeitar continuam como a próxima etapa.

ADR-0018; PRO-006 comparação textual entregue com limites explícitos. Evidência: 193 testes Node, 85 fluxos Firefox amplos e 4 focados. Caso privado: 103 comparações em cópia restaurada, sem alterar originais. Sem promoção dos gates de redline, autenticação, criptografia ou desktop.

## Revisão editorial local — alpha.14 (2026-11-02)

A alpha.14 acrescenta **Revisão** e **Propor alteração**: selecione texto na cena ou no original de leitura do diálogo, informe autor/papel (Escritor/Editor), substituição e justificativa. O painel mostra original riscado e proposta sublinhada; guardar não altera o manuscrito. Aceitar preserva versão anterior e registra a decisão; rejeitar mantém o texto. Filtros distinguem estado/papel e o histórico acompanha backup/restauração.

O aceite é bloqueado se texto/formatação mudou; atualize a lista e faça nova proposta sobre a base atual, ou rejeite a antiga. A primeira proposta migra a obra para **formato 5**, somente após backup integral verificado. A identificação é local e declarada, sem autenticação, compartilhamento ou permissões remotas. No editor visual, as propostas são limitadas a trechos de um bloco, sem novas quebras ou inserção em cursor vazio.

ADR-0019. 205 testes Node, 85 fluxos Firefox amplos e 9 focados; caso privado em cópia restaurada. PRO-007–011 parcialmente atendidos: propostas/decisões locais com CAS e snapshot, sem autenticação, permissões por usuário, rastreamento automático ou colaboração remota. Desktop por último; nuvem imediatamente antes.
