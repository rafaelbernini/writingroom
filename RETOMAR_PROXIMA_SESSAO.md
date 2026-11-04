# WritingRoom — retomar na próxima sessão

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


Validação de sessões sintéticas (2026-11-03): **256 testes Node aprovados, sem falhas/skips**, incluindo sete novos de sessões e seis anteriores de autorização. Log `/tmp/writingroom-synthetic-sessions-tests.log`. Interface inalterada; Firefox não reexecutado (139 fluxos anteriores da alpha.18). Sem manuscrito privado ou tráfego externo.


Validação desta etapa (2026-11-03): **249 testes Node aprovados, sem falhas/skips**, incluindo seis novos da prova sintética. Log: `/tmp/writingroom-online-contract-tests.log`. Interface inalterada; Firefox não reexecutado nesta etapa (139 fluxos são evidência anterior da alpha.18). Nenhum manuscrito privado utilizado.

Encerramento: 2026-11-03. Versão atual: **0.1.0-alpha.20**, interface **studio-19**. Este é o ponto de entrada da próxima sessão; prioridades antigas nos históricos não substituem este documento.

Sessões sintéticas — 2026-11-03: ADR-0025 e `session-harness.mjs` acrescentam state/código de uso único, rotação, CSRF/Origin, expiração, logout e revogação por dispositivo. Sete testes novos; transporte por chamadas em memória, sem OIDC, e-mail, HTTP, persistência ou mudança da interface alpha.18. Próximo: storage transacional de convites/grants/recibos, com concorrência e recuperação.

## Alpha.19 — leitura e escrita no celular (2026-11-03)

Validação alpha.19: **256 testes Node aprovados, sem falhas/skips**, e **175 verificações Firefox** (85 amplas, 9 revisão, 11 Editor, 11 pacote v1, 11 chaves/v2, 12 rodadas e 36 novas responsivas). Log Node `/tmp/writingroom-alpha19-final-node.log`. Móvel final: `/tmp/writingroom-browser-7szuf6i5/report.json`, capturas de escrita, estrutura, foco, leitura e visual. Não houve homologação em celular físico nem uso de manuscrito privado.

Ferramentas recolhíveis, abas deslizantes com seleção visível, editor com mais espaço, leitura com margens/entrelinha confortáveis, salvamento visível e diálogos adaptados. Painéis com fechamento, Escape, foco de retorno e conteúdo coberto inert. Aplicativo studio-18; formatos 1–7 e pacotes v1/v2/v3 preservados. Análise detalhada em MOBILE_RESPONSIVENESS.md. Nenhum arquivo de node_modules editado.

Ajuste móvel solicitado entregue nesta etapa. Teste em aparelho físico (Safari/iPhone e Chrome/Android, teclado virtual/IME/toque) permanece pendente. Antes de retomar online, ler docs/development/MOBILE_RESPONSIVENESS.md. Persistência transacional sintética entregue posteriormente na ADR-0026; próxima implementação: transporte HTTP isolado; não confundir esta UI com colaboração online.

## Onde paramos

**Rodadas e devolutivas offline entregues na alpha.18:** Revisão → Nova rodada editorial seleciona cenas, participantes e base congelada, assina/cifra wrapper v3. Primeira criação exige backup integral verificado antes do **formato 7**. Abrir/cancelar antes de confirmar não migra. Leitura aceita 1–7; acompanhamento/anexos/fontes/visual/propostas não rebaixam. ADR-0023.

Abrir rodada / devolutiva na biblioteca verifica assinatura/pin/participantes. Oferta cria obra nova com rodada reviewer, mapa por IDs opacos e base sem comentários privados. Proponha sobre texto/formatação ainda na base e mantenha sugestões pendentes; Preparar devolutiva não envia edições livres nem sugestões já aceitas na cópia. Cópias v1/v2 continuam independentes, sem associação retroativa por nome/texto.

Receber devolutiva na origem exige escolha explícita da obra, compara original/proposto e mostra duplicatas/conflitos. Confirmação revalida rodada aberta/pin/base completa e registra somente pendências, após backup manual integral verificado no destino selecionado da central. Aceite individual preserva snapshot e comentários privados. Mudança textual/visual/comentário bloqueia a devolutiva inteira. Encerrar rodada bloqueia novos recebimentos, sem decidir pendências importadas.

Recibos `proposal_id/hash/review_id` e `return_id/hash` entram no backup. Replay com recibo não duplica após aceite/restart/restore; IDs externos estáveis, cenas/reviews/snapshots locais remapeados. Backup anterior ao recebimento não conhece esse recibo; forks são independentes e o usuário escolhe o destino. `round_hashes` é derivado, excluído de recuperação/restauração. Até 10 rodadas/12 MB, 200 cenas, 1000 propostas/4 MB e obra até 30 MB. Confirmação já em gravação é protegida contra cancelamento na UI; cancelar/expirar staging antes do compromisso final não importa.

Sem e-mail autenticado, E2EE, cifragem para chave pública, serviço remoto ou auditoria externa. Cifra por frase compartilhada e assinatura por pin, conforme ADRs 0021–0023. Disco/backups locais continuam JSON em claro. Não promover os gates remotos pela conclusão do ciclo offline.

**Chaves e assinatura offline entregues na alpha.17:** Biblioteca → Chaves editoriais cria Ed25519 com privada cifrada por frase; cartão público, backup cifrado/restauração e troca ativa com confirmação da impressão anterior. Até 5 identidades e 50 contatos. Persistência separada em `.settings/editorial-identities.json`, CAS/fila, arquivos privados na criação, sem chaves/frases nos backups das obras. Chaves antigas são preservadas/inativas. Backup de chave sem frase não recupera acesso; se perdê-la, gerar nova identidade e refazer conferências externas.

Contatos só são pinados após o usuário informar fingerprint SHA-256 completo conferido por outro canal. Nome permanece declarado; app não verifica e-mail ou identidade civil. Chave nova com mesmo nome não herda confiança. Revogação é local, mantém o pin e bloqueia novas operações e confirmação de staging; não apaga pacotes entregues nem reativa pin antigo.

Em Publicar, escolher Assinar com chave conferida — v2. Prévia vincula conteúdo/chaves/estado; chave privada desbloqueada somente para a operação. Wrapper Ed25519 assina envelope cifrado inteiro e destinatário. Abertura verifica pin/assinatura/destinatário antes da KDF e revalida revogação ao confirmar. UI exige assinatura por padrão; v1 exige opt-out explícito e aparece sem assinatura. V2 inválido nunca é tratado como v1. Fingerprints/chave pública externos permitem correlação; cifra continua dependente de frase compartilhada, sem leitura exclusiva por chave pública, E2EE/grants ou autenticação de e-mail. Cópias v1/v2 continuam independentes; a alpha.18 acrescenta rodadas vinculadas em formato 7, sem afirmar log inviolável. ADR-0022.

**Pacote cifrado v1 entregue como primeiro incremento local:** em Publicar, escolher cenas e conferir prévia antes de Cifrar e baixar. Na biblioteca, Abrir pacote cifrado verifica integridade/frase e destinatário declarado, apresenta staging e só cria obra independente após confirmar. Cifra AES-256-GCM, scrypt fixo N=131072/r=8/p=1; salt/IV aleatórios, AAD, tag de 16 bytes; limites 8 MB em claro/11 MB de arquivo/200 cenas. ADR-0021.

Projeção por allowlist: texto/título/formatação e notas de publicação das cenas escolhidas. Pesquisa, anexos, lixeira, comentários privados, notas do inspetor, metadados, perfil, acompanhamento, versões e propostas ficam fora. Não há migração da origem. Obra importada e seus backups continuam **JSON em claro no disco**; pacote cifrado não converte o armazenamento local em cofre.

Frase de 16–256 caracteres, combinada por outro canal e não guardada pelo app. Sem recuperação: precisa gerar outro pacote pela origem se a perder. Remetente/destinatário declarados; quem tem a frase pode abrir e criar pacotes. **V1 não tem assinatura.** A alpha.17 acrescenta assinatura v2 e revogação de confiança local; E2EE, e-mail autenticado e permissões remotas continuam pendentes; devolutiva offline por rodada foi acrescentada na alpha.18. Não promover PRO-AC-06–09. Staging em memória 5 min/4 entradas, uma KDF por instância; repetir mesmo token confirmado retorna mesma cópia enquanto válido, nova abertura pode criar outra. Não existe idempotência durável de devolutiva.

**Modo Editor local entregue:** Configurações · Escritor/Editor no cabeçalho troca a perspectiva e a entrada da biblioteca. Painel deriva propostas pendentes, conflitos e comentários abertos, filtra etapa/pendências e encaminha à cena, histórico e versões/comparação. Acompanhar obra guarda responsável declarado, etapa, observações e próximos passos. Sem autenticação ou permissões remotas. Preferência só no navegador; acompanhamento na obra/backups. ADR-0020.

Primeiro acompanhamento exige backup integral verificado antes do **formato 6**. Leitura aceita 1–6; abrir/cancelar não migra. Hash de acompanhamento recusa salvamento concorrente sem perder campos locais. `tracking_hash` é derivado e excluído de recuperação/restauração. Propostas/fontes/anexos/visual não rebaixam schema 6.

O redline local por propostas está implementado. Na cena, **Propor alteração** abre a seleção do original, autor/papel declarado (escritor/editor), substituição e justificativa. A aba **Revisão** reúne pendentes e histórico, filtros e decisões. Guardar proposta não altera o manuscrito; aceitar preserva snapshot anterior; rejeitar não altera texto. Texto/formatação diferentes da base bloqueiam o aceite. Autoria é declarada localmente, sem autenticação ou permissões remotas.

Também estão disponíveis comparação lado a lado entre versões, modelos e ambiente de tradução, ferramentas de idioma, extração textual de anexos, temas, perfil do autor e central de backup local. Consultar [estado verificado](docs/development/PROGRESS.md) para alcance e limites reais, sem tratar o roadmap como funcionalidades entregues.

## Próximo passo — isolamento de confiança por subject

ADR-0032 integra sessão sintética + prova de dispositivo + diretório durável + diário de permissões. Não repetir as provas isoladas/responsivo. Modo HTTPS com directory exige prova por sessão; fixtures antigas sem diretório são legadas, não configuração de produção.

1. Ciclo combinado entregue pela ADR-0033: 38 verificações Firefox, incluindo sessão cruzada/reinício. Preservar a suíte; emissor e pins só por pipes/controle de teste, nunca em rota.
2. Contrato/provedor OIDC em memória (ADR-0034) e HTTPS/Firefox (ADR-0035) entregues. Preservar identidade somente pelo controle privado; claims sintéticos não são e-mail real verificado. Próxima implementação: idempotência/recibos/reconciliação do item 3.
3. Contrato e prova de idempotência/recibos/reconciliação entregues pela ADR-0036 nas novas rotas de operações. Manter testes CAS/crash/backup/suspensão/revogação/await/logout; lock de admissão não é transação distribuída e falha de resposta pode ocorrer após compromisso.
4. Recovery/reconferência isolada (ADR-0037) e fixture HTTPS/Firefox dedicada (ADR-0038) entregues. Próximo: contrato/prova de isolamento de confiança por subject para múltiplas contas/dispositivos, sem redefinir outras identidades. Não reativar backup suspenso nem confiar em chave nova por nome/e-mail. Rollback conjunto do witness e diretório continua limite demonstrado; independência real e multiusuário são gates antes de E2EE/v4/conteúdo real. Preservar obras 1–7/v1–v3 e responsivo.
5. Não criar conta/credencial real, enviar mensagens/arquivos, implantar ou abrir 4173 sem autorização específica. Publicação/IA depois do online; nuvem antes do desktop; desktop por último.

## Ordem posterior já definida pelo usuário

1. Modo Editor local e acompanhamento editorial — entregue alpha.15; manter regressão.
2. Pacote editorial **criptografado**, primeiro fluxo escolhido — cópia por frase secreta entregue parcialmente na alpha.16; chaves/pins/assinatura v2 entregues na alpha.17; rodadas/devolutivas offline entregues alpha.18; revisar E1/contrato de identidade/autorização antes de online. Definir contrato, destinatários, gestão de chaves/segredos, integridade, limites e recuperação antes de implementar; não chamar de E2EE sem satisfazer seus requisitos. Não enviar e-mails ou arquivos durante testes.
3. Compartilhamento online autenticado por e-mail, com permissões reais por obra/pasta e controle de acesso.
4. Sessão de publicação e entrega à editora: apresentação, sinopse/resumo, proposta e arquivos finais, com revisão antes de exportar.
5. IA contextual por obra, opt-in, respeitando os gates de credenciais, privacidade e envio mínimo. O conector LibreTranslate existente não equivale a essa IA.
6. Google, Drive, OneDrive e Dropbox **imediatamente antes do desktop**.
7. **Desktop por último**.

Os requisitos completos de E2EE/serviço remoto e as etapas posteriores continuam pendentes. Não inferir autorização para enviar mensagens a terceiros a partir da autorização de implementação.

## Persistência: cuidados obrigatórios

- Leitura de projetos nos formatos **1–7**. A primeira proposta exige backup integral verificado antes de salvar no formato 5. Abrir ou cancelar uma proposta não migra a obra.
- Não rebaixar formatos 5/6/7 ao adicionar fontes, anexos ou editor visual.
- Restaurar remapeia IDs de proposta, cena e `snapshot_id` da decisão. Backup gerenciado também foi validado com formato 5.
- `round_hashes`, `tracking_hash` e `review_hashes` são dados derivados da API, excluído da recuperação/restauração. Não salvar hashes auxiliares como conteúdo autoral.
- Propostas têm limite de 1.000 registros/4 MB, 20 mil unidades UTF-16 por lado e projeto de até 30 MB. Aceitação é conservadora: qualquer mudança na base visual/textual exige nova proposta, sem rebase automático.
- No editor visual, a revisão aceita substituição/exclusão dentro de um bloco e dos limites suportados de anotações. Inserções em cursor vazio, novas quebras e rastreamento de formatação não estão implementados nesse modo.
- Decisões aceitas são histórico; edições ou restaurações posteriores podem superar o texto aplicado. Não reescrever o histórico para fingir que ele é o estado atual.

Arquivos centrais: `packages/core/src/reviews.mjs`, `review-schema.mjs`, `core.mjs`, `workspace.mjs`, `migration-backup.mjs`, `apps/web/server.mjs`, `app.js`, `index.html` e `style.css`.

## Livro de teste: preservar os originais

O autor autorizou o uso privado de **O Grito no Mármore — Rascunho 1**. O DOCX e o modelo-base permanecem intactos. Para testar mutações, restaurar primeiro o backup em biblioteca isolada; não editar o modelo-base e não publicar trechos em fixtures/documentação.

Backup-base privado:

`writingroom-private/o-grito-no-marmore-rascunho1-2yn29ims/O-Grito-no-Marmore-Rascunho1-Modelo-Completo.wroom-backup.json`

Relatórios recentes, sem conteúdo público do manuscrito:

- `writingroom-private/VALIDACAO-ALPHA12-EXTRACAO.json`: 5.934 parágrafos/833.639 caracteres extraídos, original preservado.
- `writingroom-private/VALIDACAO-ALPHA13-COMPARACAO.json`: 103 comparações em cópia restaurada, sem mutação.
- `writingroom-private/VALIDACAO-ALPHA18-RODADAS.json`: 48 cenas/1.954.430 bytes, migração verificada, oferta/devolutiva, pendência sem mudar texto, aceite com snapshot e replay após restore sem duplicar; somente cópia restaurada modificada, backup-base intacto.
- `writingroom-private/VALIDACAO-ALPHA17-ASSINATURAS.json`: 48 cenas/1.954.435 bytes de projeção em cópia restaurada, assinatura/pins sintéticos e recuperação de chave isolada; origem e checksum do backup-base preservados.
- `writingroom-private/VALIDACAO-ALPHA16-PACOTE.json`: 48 cenas/1.954.433 bytes de projeção, cifrar/arquivo/decifrar/staging/criar cópia/backup/restauração; textos selecionados e checksum do backup-base preservados.
- `writingroom-private/VALIDACAO-ALPHA15-EDITOR.json`: 78 documentos em cópia restaurada; acompanhamento salvo/reaberto/restaurado, backup de migração verificado, documentos/snapshots e checksum do backup-base preservados.
- `writingroom-private/VALIDACAO-ALPHA14-REDLINE.json`: proposta, aceite, snapshot e nova restauração em cópia; backup original inalterado.

## Evidência disponível ao encerrar

**243 testes Node aprovados**, sem falhas ou skips. **139 fluxos Firefox: 85 amplos + 9 revisão + 11 Editor + 11 pacote v1 + 11 chaves/v2 + 12 rodadas/devolutivas**, incluindo persistência/CAS, migração/falha de backup, contagens, filtros, navegação e layout de 500 px. Baseline da sessão: 231 testes aprovados em Node v26.13.0.

Comandos utilizados, a executar na próxima sessão conforme o alcance das alterações:

```bash
node --test --test-isolation=none packages/core/test/*.test.mjs
python3 scripts/verify-studio-firefox.py
python3 scripts/verify-reviews-firefox.py
python3 scripts/verify-editor-perspective-firefox.py
python3 scripts/verify-editorial-package-firefox.py
python3 scripts/verify-editorial-identities-firefox.py
python3 scripts/verify-editorial-rounds-firefox.py
```

Scripts Firefox precisam de Firefox/Python e permissão para servidor loopback; usam bibliotecas/perfis isolados. Artefatos em `/tmp` são temporários e podem desaparecer. Não declarar testes antigos como nova execução.

## Abrir a aplicação

Requer Node.js 20+ e dependências instaladas. Se já houver servidor antigo, encerrá-lo com Ctrl+C antes de iniciar outro sobre a mesma biblioteca.

```bash
npm run dev
```

Abrir `http://127.0.0.1:4173` e recarregar até aparecer **α18**. Não iniciar duas instâncias sobre os mesmos projetos. O workspace não dispõe de um repositório Git utilizável; não inicializar um por iniciativa própria.

## Limites que continuam vigentes

- Sem autenticação de e-mail/civil, E2EE, grants ou permissões remotas. Devolutivas offline por rodada disponíveis. Cópia por frase secreta e assinatura v2 por chave pinada disponíveis, sem auditoria criptográfica independente. Revogação somente nesta instalação.
- Tradução automática depende de serviço LibreTranslate configurado; testes usaram servidor sintético local. Sinônimos dependem das bases MyThes instaladas; definições/traduções offline dependem da base lexical importada, sem dicionário universal incluído.
- Extração PDF/DOCX/ODT/TXT/MD; outros formatos podem ser guardados/transcritos, sem OCR ou importador universal.
- Anexos: 8 MB por arquivo, 16 MB no total, 100 arquivos, incluindo lixeira. O manual Scrivener local de 13 MB não cabe no limite atual; preservar o original.
- Sem Track Changes nativo do Word, captura de toda tecla ou aprovação automática de qualidade editorial.

## Mensagem para retomar

> Leia RETOMAR_PROXIMA_SESSAO.md e continue da alpha.18. Rodadas/devolutivas offline com base, assinatura, recibos, backup e conflito estão entregues. Revise E1 e defina o contrato de identidade por e-mail, autorização por escopo, chaves/dispositivos/recuperação e transporte antes de implementar online. Não expor loopback nem anunciar E2EE da modalidade por frase. Preserve livro e backups; sem envios/deploy/credenciais reais não autorizados. Nuvem imediatamente antes do desktop, desktop por último.
