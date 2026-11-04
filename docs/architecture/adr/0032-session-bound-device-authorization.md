# ADR-0032 — Sessão vinculada ao dispositivo no serviço sintético

2026-11-03. Aceita para integração de provas. Aplicativo permanece alpha.20/studio-19, sem mudança de UI, projetos ou pacotes. Não implementa conta real/OIDC/e-mail.

## Sessão e prova

`device-bound-session.mjs` compõe a sessão sintética da ADR-0025 com o diretório durável da ADR-0031. `https-transport.mjs` seleciona essa composição quando recebe `directory`; ausência mantém o harness legado para suas fixtures antigas. Não existe fallback se um diretório fornecido falhar, e esse modo legado não deve ser interpretado como configuração de serviço real.

Após o login sintético, a sessão tem um handle opaco interno novo. Não transmite esse handle, hash de cookie ou estado privado em respostas. Métodos captureSession/validateSession/invalidateSession são controles internos do harness, não rotas de rede. Validação reconsulta sessão/época/prazo; no POST exige CSRF e Origin.

Duas rotas novas exclusivamente sintéticas, sujeitas à mesma allowlist/limites/TLS:

- POST /device-proof/begin com binding assinado. Subject e dispositivo precisam coincidir com a sessão. O desafio de posse fica associado em memória àquele handle, binding, domínio do diretório e prazo; vínculo e request são copiados antes dos awaits.
- POST /device-proof/confirm com response. Só a mesma sessão pode confirmar. Outra sessão do mesmo subject/dispositivo não herda autorização nem consome a resposta legítima. Claims do desafio da ADR-0031 mantêm CAS/nonce/assinatura/pin/prazo. Hook síncrono valida a sessão de novo imediatamente antes da ativação SQL, impedindo logout durante await de produzir ativação.

Essa vinculação é estado privado no controlador, não uma alegação de que HPKE inclui cookie/session_id no AAD. Nonce isolado continua insuficiente para autenticar conta. Roubo de sessão e dispositivo comprometido permanecem fora dessa garantia.

## Operações protegidas

Create/preview/accept/revoke de convites e access/check exigem prova naquela sessão e autorização atual do vínculo durável. Novo login, mesmo de dispositivo ativo, precisa comprovar posse novamente; outro subject/device é recusado. Não confundir autorização do dispositivo com permissões da obra: as duas são verificadas.

GET /session pode mostrar a identidade de sessão ainda sem prova. Se já há vínculo associado, reconsulta diretório antes de responder; vínculo revogado/expirado ou falha de revalidação invalida essa sessão. Operação protegida associada a vínculo que falha também elimina a associação e invalida sessão. Conflitos conservadores de revisão podem exigir autenticar/provar de novo, em vez de conservar autorização possivelmente obsoleta.

Logout permanece disponível sem prova de dispositivo. /devices/revoke existente continua sendo revogação de **sessões/códigos** daquele subject/dispositivo, não revogação durável da chave. Pins e revogação durável de chaves permanecem controles da fixture fora das rotas, até contrato específico de administração/reautenticação. Emissor de identidade também continua fora da rede.

## Dois bancos: limite explícito de consistência

`directory.withAuthorizedBinding` verifica assinatura fora do lock, depois adquire BEGIN IMMEDIATE no diretório e revalida revisão/pin/prazo/status/slot. Executa callback **síncrono e interno** de validação final da sessão + dispatcher do diário, mantendo a reserva de escrita do diretório até a conclusão. Não aguarda Web Crypto com o lock aberto e não aceita callback assíncrono. Ordem de lock é diretório → diário; timeout fecha a operação em caso de disputa.

Assim, outro processo não consegue confirmar revogação do diretório durante uma operação já admitida. Uma revogação anterior bloqueia a operação; uma posterior governa a próxima. O callback não pode ser recebido por JSON ou implementado por usuário/plugin não confiável.

**Não há transação distribuída.** Diário pode confirmar sua mutação e o processo falhar antes de liberar lock/responder; sessão pode desaparecer após compromisso. Uma negativa/queda de conexão não prova ausência de mutação. Não se desfaz recibo ou concessão confirmada para fingir rollback conjunto. Não há retry automático: recibos/idempotência de operações e reconciliação precisam contrato antes de integração real. Vínculo ativo durável também pode sobreviver a logout que ocorre depois do compromisso, mas nenhuma nova sessão herda a prova local. A garantia testada é invalidação antes do compromisso e serialização da admissão, não atomicidade/crash recovery de dois bancos.

## Reinício e restore

Handles, associação sessão→vínculo e desafios da composição são voláteis. Reiniciar recusa cookies/provas anteriores; pins/vínculos/recibos duráveis permanecem sujeitos aos próprios controles. Suspensão do diretório **ou** do diário restaurado impede begin e operações protegidas. Não existe reativação automática. Não oferece defesa contra rollback arbitrário por quem pode substituir arquivos no filesystem (limite da ADR-0031).

Até 100 desafios no controlador por instância; prazos e limites do diretório/harness permanecem. Sem privadas ou nonce em log/relatório/SQLite novo. Nenhum manuscrito é lido/enviado, e servidor 4173 não importa esta composição.

## Evidência

Nove testes novos de composição: ausência de prova, sessão cruzada/replay, subject/dispositivo/CSRF errados, revogação por outra conexão e invalidação de sessão, logout durante confirmação, reinício, diretório restaurado suspenso, diário restaurado suspenso e logout durante admissão sem gravação.

Dois testes HTTPS novos: remetente e destinatário precisam prova antes de criar/aceitar convite e ler escopo; revogação invalida sessão e não há rota pública de pin/revogação. Um teste adicional no diretório comprova que outro processo não adquire reserva de escrita durante callback protegido. Regressão Firefox de cookies da ADR-0028 reexecutada; não representa teste browser do ciclo combinado de posse+convites.

```bash
node --test --test-isolation=none packages/core/test/sharing-bound-session.test.mjs packages/core/test/sharing-https.test.mjs
python3 scripts/verify-sharing-cookies-firefox.py
```

## Continuidade

Validar ciclo combinado no Firefox com chaves/identidades sintéticas e emissor somente em pipes: login → posse por sessão → convite/escopo → revogação → negativa. Cobrir sessão cruzada e reinício sem herança de prova. Depois contrato/adaptador OIDC com provedor de fixture (issuer/audience/nonce/state/PKCE/callback estrito), antes de escolher/configurar provedor real. Reconciliar compromisso/recibo entre bancos antes de liberar conteúdo real.

Manter gates de recovery/reconferência, diretório resistente a substituição, E2EE e pacotes v4. Conta, credencial real, envio e implantação continuam fora desta prova. Responsivo e formatos 1–7/v1–v3 permanecem intactos. Decisão interna, sem auditoria externa; bases de sessão, HPKE e transação já referenciadas nas ADRs 0025–31.

Evidência final: 312 testes Node sem falhas/skips e 27 verificações Firefox de cookies aprovadas. Log `/tmp/writingroom-bound-session-node.log`; relatório `/tmp/writingroom-browser-amxz9i89/report.json`. Ciclo browser combinado ainda pendente.
