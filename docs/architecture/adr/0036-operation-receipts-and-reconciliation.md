# ADR-0036 — Operações idempotentes, recibos e reconciliação sintética

2026-11-04. Aceita para prova sintética. Sem mudança da UI alpha.20/studio-19, obras 1–7, pacotes v1/v2/v3, credenciais ou serviços reais.

## Problema e decisão

Uma operação pode confirmar no diário e perder a resposta antes de liberar a reserva do diretório ou responder ao cliente. A admissão da ADR-0032 não torna os dois bancos uma transação distribuída. Erro, logout depois do compromisso, timeout ou conexão encerrada não provam rollback da mutação.

Adicionamos um contrato explícito para **invite, accept e revoke** nas rotas `/operations/execute` e `/operations/reconcile`. Mutação e metadados do recibo ficam no **mesmo evento/transação do diário**. O diretório continua reservando a admissão e verificando vínculo/revogação; não recebe uma segunda gravação de operação que precisaria ser reconciliada atomicamente. Não há compensação que apague um grant confirmado para simular rollback conjunto.

As rotas legadas de convites continuam nas fixtures de regressão, sem adquirir idempotência retroativa. A garantia exige usar este novo contrato desde a primeira tentativa. Ele não está integrado ao aplicativo ou a conteúdo real.

## Contexto, pedido e identidade

Todas as três rotas são POST com Origin/CSRF/sessão válidos e prova de posse naquela sessão. `/operations/context` aceita corpo vazio e devolve os domínios atuais do diário e do diretório. Sem prova, não há consulta de contexto ou recibo.

Pedido de execute/reconcile:

```json
{
  "operationId": "UUID v4 novo, gerado pelo cliente",
  "journalDomain": "domínio esperado do diário",
  "directoryDomain": "domínio esperado do diretório",
  "action": "invite | accept | revoke",
  "input": "corpo permitido para aquela ação"
}
```

O mesmo pedido e ID são retidos pelo cliente para reconciliação/repetição explícita. UUIDs são canônicos, minúsculos e v4. Nenhum ID de grant/ator/dispositivo/contexto de admissão é aceito do cliente. A operação é identificada por `(subject da sessão, operationId)`, vinculada a dispositivo, hash do binding e par de domínios. Outro subject não vê o recibo; outro dispositivo/binding da mesma conta não herda o direito de reconciliá-lo.

Inputs são allowlists exatas: invite recebe projectId/recipient/scope/capabilities/expiresAt; accept recebe token/explicit=true; revoke recebe projectId/invitationId. O fingerprint SHA-256 usa uma projeção canônica, com scope/capabilities ordenados sem aceitar duplicatas. No accept, inclui somente hash do token, nunca token em claro. Mudança de ação, conteúdo, escopo, destinatário, prazo ou domínio com mesmo ID é recusada. Ordem dos conjuntos não muda a operação.

A revisão atual do diretório pode ter avançado sem mudar a autorização do vínculo; isso não torna a operação nova. A revisão de admissão original entra no recibo, mas não é requisito de igualdade no retry. Em cada chamada, vínculo, sessão e suspensão são verificados novamente.

## Admissão e compromisso

`directory.withAuthorizedBinding` passa ao callback interno síncrono um snapshot congelado de domain/revision/bindingHash já revalidado sob BEGIN IMMEDIATE. Esse contexto não vem da rede. Ordem de lock permanece diretório → diário. O dispatcher revalida a sessão imediatamente antes de entrar no diário.

`durable-authority.mjs` procura o recibo dentro da transação SQLite. Se existe e o pedido/contexto coincidem, retorna o mesmo recibo sem inserir evento. Se não existe, reavalia a política atual, executa a ação e insere evento+metadados juntos. Processos concorrentes serializam a gravação; só um cria o evento. Falha antes do COMMIT não deixa recibo ou consumo de convite. Depois do COMMIT, falha de resposta não desfaz a mutação.

Erros semânticos de pedido retornam negativa uniforme sem invalidar uma sessão válida. Falha de revalidação do vínculo continua invalidando a sessão conforme ADR-0032. Logout enquanto a admissão aguarda impede gravação; logout depois do compromisso não remove histórico durável.

## Recibo e estado atual

Sucesso retorna `status=committed`, `replayed`, e receipt contendo operationId, checksum do evento como receiptId, ação, sequência, domínios, revisão de admissão e invitationId; accept também tem o grantId externo estável.

O checksum identifica o conteúdo do evento e detecta inconsistência acidental. **Não é assinatura, prova externa ou log inviolável contra alguém que pode editar todo o banco/checksums.** Reopen valida fingerprint e unicidade dos metadados em conjunto com o replay da política.

`receipt.effect` descreve o estado atual do convite no diário: pending, accepted, revoked ou expired. Um recibo de aceite confirmado continua existindo após revogação/expiração; repetir a operação só devolve esse histórico e não recria ou renova grant. Recibo nunca é autorização para ler conteúdo: `/access/check` continua verificando o estado atual. Dispositivo revogado nem consulta seu recibo via serviço, embora o evento continue persistido.

Sem registro, reconcile retorna `not_found` com o par explícito de domínios consultado, sem gravar nada. Isso significa ausência de recibo **naquele diário/domínio atual**, não prova universal de que nunca houve compromisso, ausência em outro fork ou proteção contra rollback hostil do filesystem. Não escolher outro ID nem repetir automaticamente a partir de erro genérico.

## Convite: segredo entregue uma única vez

Invite inicialmente retorna token aleatório do servidor e `secretDelivery=returned-once`. Só hash fica no evento, inclusive no modo idempotente. Reconcile/retry retornam o mesmo invitationId/recibo, **sem token**, com `secretDelivery=not-recoverable`.

Se a resposta inicial com o token se perder, o cliente confirma o compromisso pelo recibo, revoga explicitamente aquele convite pelo invitationId e pode criar outro com novo ID. Não se regenera token, não se guarda segredo em texto claro para repetir a resposta e não se cria outro convite silenciosamente. O Firefox exercita essa sequência. Se o cliente ainda possui o token da primeira resposta, pode continuar a usá-lo enquanto válido; retry não o devolve de novo.

No accept, o cliente já recebeu o token e o retém apenas no contexto da fixture para repetir o mesmo pedido. O servidor persiste somente seu hash e o grantId confirmado. Persistência segura do pedido/segredo no cliente de produção ainda precisa contrato; não escrevemos tokens em projetos, backups autorais ou localStorage nesta etapa.

## Persistência, schema e restore

O diário sintético continua com as tabelas existentes. Lê user_version 1 e 2. A primeira operação com recibo promove **somente esse banco sintético** para user_version=2, na mesma transação do evento. Leitura/reconcile ausente e falha pré-commit não promovem. Binário antigo que só aceita v1 recusa o banco promovido em vez de ignorar a nova semântica. Isso não migra biblioteca, dispositivo ou schema de obra.

Metadados são `{id, device, bindingHash, directoryDomain, directoryRevision, journalDomain, requestHash}`. Há um recibo por evento; os limites existentes de 2000 eventos/1 MB de payload e banco de até 8 MB continuam. Nada expira/remove o recibo para reutilizar silenciosamente um ID. Limite atingido bloqueia nova mutação; uma repetição já registrada não precisa de outro evento.

Backup inclui eventos/recibos e valida replay. Restore mantém histórico, mas cria domínio novo suspenso. Restore de diário ou diretório bloqueia execute/reconcile/prova; pedidos com domínio antigo também não coincidem com o atual. Não há reativação de backup antigo nem recuperação que herde confiança automaticamente. Reinício comum conserva os domínios/recibos, descarta sessões/provas; nova sessão precisa de posse do mesmo binding para consultar histórico.

## Evidência

16 testes novos em `sharing-operations.test.mjs`: criação e segredo de uso único, schema v1→v2, ausência de token no banco, pedido alterado, conjuntos canônicos, aceite/revogação/expiração, isolamento por subject/dispositivo, ausência explícita, rollback antes de commit, resposta perdida após commit, reinício/reprova, revogação atual de dispositivo, restore suspenso dos componentes, adulteração/duplicação de metadados, concorrência entre processos, logout durante admissão e SIGKILL antes/depois do compromisso.

O SIGKILL pós-commit ocorre em processo que ainda mantém a reserva do diretório enquanto o diário já confirmou. Após matar o processo, o serviço consulta o recibo, recupera o lock e não grava segunda operação. Não é uma simulação de transação distribuída ou queda de energia do hardware.

Dois testes HTTPS novos: socket destruído após operação confirmada, reconciliação/retry sem segredo/duplicata, Origin/CSRF/posse e recusa de contexto de admissão enviado pelo cliente. O hook privado `shouldDropOperationResponse` exige fixture explícita, não é rota e só destrói a resposta bem-sucedida de execute; não altera o compromisso.

O script OIDC Firefox passa a usar operações no fluxo editorial e cresce de 41 para **53 verificações**: inclui perda real de conexão após convite/aceite, recibos estáveis, revogação explícita de convite sem token recuperável, alteração de escopo com ID reaproveitado negada e recibo histórico sem reativar grant. Os 38 testes browser do ciclo anterior e 27 de cookies permanecem regressões separadas.

```bash
node --test --test-isolation=none packages/core/test/sharing-operations.test.mjs
node --test --test-isolation=none packages/core/test/sharing-https.test.mjs
python3 scripts/verify-sharing-oidc-firefox.py
node --test --test-isolation=none packages/core/test/*.test.mjs
```

## Continuidade

Próximo: contrato e prova sintética de recuperação/reconferência de dispositivos e confiança, incluindo substituição e rollback de estado antigo. Não reativar backup suspenso nem associar chave nova por coincidência de nome/e-mail. Ameaça de substituição arbitrária de arquivos por administrador/servidor comprometido continua gate explícito; os checksums de hoje não a resolvem.

Sem credencial/conta real, e-mail enviado, manuscrito privado, implantação, dependência nova ou promessa de E2EE/v4. UI móvel não mudou nem foi reexecutada. Recibos de fixture não liberam conteúdo real ou remoção dos gates de recuperação e revisão de segurança.

## Fontes primárias verificadas

- [SQLite — transações](https://sqlite.org/lang_transaction.html): BEGIN IMMEDIATE e serialização de escrita.
- [SQLite — commit atômico](https://sqlite.org/atomiccommit.html): atomicidade local e seus limites; não supõe compromisso conjunto destes dois bancos independentes.
- [SQLite — PRAGMA user_version](https://sqlite.org/pragma.html#pragma_user_version): marcador de versão gerido pela aplicação.

Evidência final em 2026-11-04: **364 testes Node aprovados sem falhas/skips**, incluindo **16 operações + 2 HTTPS novos**. Node `/tmp/writingroom-operations-final-node.log`, isolado `/tmp/writingroom-operations-unit-node.log`. **53 verificações Firefox OIDC/operações + 38 ciclo anterior + 27 cookies**, aprovadas: `/tmp/writingroom-browser-r64415to/report.json`, `/tmp/writingroom-browser-txm3qpyd/report.json`, `/tmp/writingroom-browser-lb4m48m4/report.json`.
