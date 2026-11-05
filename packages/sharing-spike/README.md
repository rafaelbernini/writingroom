# Prova sintética de autorização

Modelo de política isolado, sem servidor ou persistência. Não autentica usuários: `actor` é injetado por testes e não pode ser aceito de requisição de rede. Não usa obras, identidades ou chaves do aplicativo. Reiniciar descarta convites e concessões. O transporte é chamada de função em memória; não há envio de e-mail/arquivo nem criptografia.

Execute da raiz:

```bash
node --test --test-isolation=none packages/core/test/sharing-authorization.test.mjs
```

A fixture cria owner/editor/other e duas obras sintéticas. Os testes mostram prévia de escopo, aceite explícito pelo destinatário, leitura/proposta autorizadas apenas na allowlist, rejeição entre obras, convite reutilizado, revogação e expiração. Tokens são aleatórios e só seus hashes ficam no mapa interno; nenhum token é registrado no console.

`previewFolder` expande uma pasta para IDs explícitos; a autorização nunca consulta uma pasta dinamicamente. O chamador deve apresentar a lista antes de `invite`. Somente read/propose existem; editar/aceitar texto e gerir concessões não são capacidades delegáveis. O owner pode criar/revogar convite, sem delegação transitiva.

Limites e próximos passos na [ADR-0024](../../docs/architecture/adr/0024-online-identity-and-authorization-contract.md). Sessão/CSRF têm prova sintética descrita abaixo. Armazenamento transacional, recibos duráveis, confiança criptográfica de dispositivo e cifra por destinatário continuam pendentes. Não integrar este modelo como endpoint autenticado.

## Sessões sintéticas

`src/session-harness.mjs` acrescenta um dispatcher de objetos de requisição, sem HTTP. Subject vem de sessão criada por um emissor **exclusivo de fixture**. Não implementa OIDC/e-mail. Não expor `dispatch` nem `issueSyntheticCode` à rede.

```bash
node --test --test-isolation=none packages/core/test/sharing-*.test.mjs
```

Sete testes adicionais verificam rotação/fixação, state/código/CSRF/replay, dois dispositivos, logout/revogação, expiração e escopo derivado da sessão. Cabeçalhos de cookie são modelados, sem garantia de comportamento em navegador. Limites e lacunas na [ADR-0025](../../docs/architecture/adr/0025-synthetic-sessions-and-csrf.md). Sessões, códigos e concessões desaparecem no reinício. Nenhuma chave de conteúdo ou confiança criptográfica de dispositivo é criada.

## Diário durável sintético

`src/durable-authority.mjs` oferece `createDurableSyntheticAuthority`, `openDurableSyntheticAuthority` e `restoreDurableSyntheticAuthority`. Exige SQLite nativo; não substitui o armazenamento JSON do aplicativo. Operações têm a mesma política sintética; eventos/recibos persistem em banco separado, tokens apenas como hash, sem manuscritos.

```bash
node --test --test-isolation=none packages/core/test/sharing-*.test.mjs
```

Backup retorna checksum separado. Restore cria domínio novo **suspenso**, para consulta histórica, sem reativar grants ou convites. Não há reativação implementada; sessão continua em memória e não é restaurada. Ver [ADR-0026](../../docs/architecture/adr/0026-durable-synthetic-sharing-journal.md) para limites, concorrência, rollback e recuperação. Não expor a fixture na rede.

## Transporte HTTPS loopback

`src/https-transport.mjs` cria servidor separado, exclusivamente 127.0.0.1/porta efêmera, com TLS e dados sintéticos. Não há script de deploy ou login real. Emissor de código só existe como controle privado do teste, nunca em rota. Ver [ADR-0027](../../docs/architecture/adr/0027-isolated-synthetic-https-transport.md).

```bash
node --test --test-isolation=none packages/core/test/sharing-https.test.mjs
```

Dez testes usam SQLite nativo, openssl local e certificado temporário explicitamente verificado pelo cliente HTTPS. Sem credenciais reais, trust store global ou envio externo. Validam escopo durável, Origin/Host/CSRF, cookies no protocolo, limites/parsing/replay/lock/reinício. Aplicação das flags de cookie em navegador permanece pendente. A restrição antiga de não expor o dispatcher foi refinada pela ADR-0027: somente este adaptador sintético e restrito é admitido, sem integração com 4173.

## Cookies no Firefox

```bash
python3 scripts/verify-sharing-cookies-firefox.py
```

Exige Firefox, openssl e certutil locais, além de Node com SQLite. Gera CA/certificado e importa confiança apenas no perfil NSS temporário; validação TLS fica ativa. Emissor sintético permanece em pipes, fora da rede. Verifica HttpOnly, prefixo __Host, SameSite com controle positivo, CSRF/Origin em sites e origens diferentes e logout. Veja [ADR-0028](../../docs/architecture/adr/0028-firefox-cookie-and-origin-validation.md), inclusive o envio Secure observado no HTTP loopback; isso não homologa implantação pública.

Documento HTML constante e observação booleana são opcionais da fixture, desativados por padrão no adaptador. O aplicativo 4173 não os importa.

## HPKE offline

`src/hpke-proof.mjs`: experimento X25519/HKDF-SHA256/AES-256-GCM Base, até 64 KiB sintéticos. Biblioteca `hpke` 1.1.8 fixada apenas como devDependency. Não é pacote editorial, autenticação de remetente, diretório de chaves ou E2EE de produção.

```bash
node --test --test-isolation=none packages/core/test/sharing-hpke.test.mjs
python3 scripts/verify-hpke-firefox.py
```

Vetores CFRG públicos, 257 ciphertexts sequenciais, troca Node/Firefox nos dois sentidos e erros adversariais. Nunca usar as chaves conhecidas da fixture fora do teste. Contrato do próximo vínculo de dispositivos e limites na [ADR-0029](../../docs/architecture/adr/0029-offline-hpke-proof.md).

## Vínculo sintético por dispositivo

`src/device-binding-proof.mjs`: identidade Ed25519 pinada assina pública X25519 e contexto do dispositivo; desafio HPKE de nonce confirma posse antes de ativar. Pin/subject/dispositivo esperados são explícitos; assinatura sozinha não ativa. Revogação e substituição só valem na instância em memória; não é diretório de produção ou recovery.

```bash
node --test --test-isolation=none packages/core/test/sharing-device-binding.test.mjs
python3 scripts/verify-hpke-firefox.py
```

Oito testes novos Node e 11 verificações totais de HPKE/vínculo no Firefox. Limites, corridas e próximo armazenamento na [ADR-0030](../../docs/architecture/adr/0030-synthetic-device-binding-and-possession.md). Não expor métodos de controle em rotas nem usar com manuscritos.

## Diretório durável sintético

`src/durable-device-directory.mjs` persiste pins, vínculos públicos assinados e revogações em SQLite separado. Chaves privadas e desafios não entram no banco. Ativação exige prova de posse e revisão atual; revogação exige CAS explícito. Restart descarta desafios, preservando vínculos ativos/revogados. Restore cria domínio novo **suspenso**, sem reativação automática.

```bash
node --test --test-isolation=none packages/core/test/sharing-device-directory.test.mjs
```

Nove testes, incluindo outro processo, SIGKILL, rollback, backup antigo e permissões 0600. Ver [ADR-0031](../../docs/architecture/adr/0031-durable-synthetic-device-directory.md), inclusive o limite contra rollback manual do filesystem. Ainda não está ligado a sessões/HTTP ou obras reais.

## Sessão e dispositivo integrados

`src/device-bound-session.mjs` exige posse na mesma sessão e vínculo atual para operações de convites/acesso. O adaptador HTTPS ativa esse modo quando recebe `directory`; fixtures legadas continuam explícitas sem diretório. Emissor/pins/revogação de chave permanecem fora das rotas. Reautenticar exige nova posse, mesmo com vínculo ativo durável.

```bash
node --test --test-isolation=none packages/core/test/sharing-bound-session.test.mjs packages/core/test/sharing-https.test.mjs
```

Ver [ADR-0032](../../docs/architecture/adr/0032-session-bound-device-authorization.md): logout/revogação/restart, bancos separados sem transação distribuída e próximo ciclo browser combinado. /devices/revoke legado revoga sessões, não a chave durável.

## Ciclo integrado no Firefox

```bash
python3 scripts/verify-sharing-bound-firefox.py
```

38 verificações do fluxo login → posse por sessão → convite/escopo → revogação, sessão cruzada e reinício do transporte com reabertura dos dois bancos. Bundle público e reutilização da porta efêmera exigem fixture explícita; emissão de identidade/pins/revogação permanecem em pipes. Reinício mantém controlador/browser vivos, sem alegação de recovery de privadas ou crash de processo. Ver [ADR-0033](../../docs/architecture/adr/0033-firefox-session-device-invitation-cycle.md). Próximo: contrato e provedor OIDC de fixture; sem conta ou e-mail real.

## Contrato OIDC e provedor de fixture

`oidc-fixture-provider.mjs` + `oidc-fixture-session.mjs`: Code + PKCE S256, cookie de prelogin vinculado ao navegador, issuer/redirect/state/nonce estritos e ID Token ES256 verificado com `jose` 6.2.15 (devDependency MIT). Contas são mapeadas por issuer/sub; e-mail `@example.invalid` não autentica caixa real. Novo login continua exigindo posse de dispositivo e escopo.

```bash
node --test --test-isolation=none packages/core/test/sharing-oidc.test.mjs
```

22 testes novos, sem rede ou rota OIDC: chamadas em memória e endereços `.invalid` reservados. [ADR-0034](../../docs/architecture/adr/0034-oidc-contract-and-isolated-fixture.md) registra limites e próximo adaptador HTTPS/Firefox de fixture. Não importar no aplicativo nem usar como cliente/provedor OIDC de produção.

## OIDC no HTTPS e Firefox de fixture

```bash
node --test --test-isolation=none packages/core/test/sharing-oidc-https.test.mjs
python3 scripts/verify-sharing-oidc-firefox.py
```

11 testes HTTPS e 41 verificações Firefox para redirects reais, callback de documento, cookie Lax entre sites, TLS verificado no token endpoint, resultado CSRF de uso único e fluxo de posse/convite/revogação. RP e provedor escutam somente em 127.0.0.1; escolha de subject e preparação da autorização continuam em pipes privados. [ADR-0035](../../docs/architecture/adr/0035-oidc-https-and-firefox-fixture.md). Sem conta real, discovery, publicação ou integração à UI. Próximo: idempotência/recibos e reconciliação entre os dois bancos.

## Operações idempotentes e reconciliação

```bash
node --test --test-isolation=none packages/core/test/sharing-operations.test.mjs
python3 scripts/verify-sharing-oidc-firefox.py
```

Novas rotas protegidas `/operations/context`, `/operations/execute` e `/operations/reconcile`: UUID de operação e domínios explícitos, recibo no mesmo evento da mutação, sem novo efeito no retry. Convite retorna token só uma vez; se a resposta se perder, reconciliar e revogar explicitamente antes de criar outro. Aceite/revogação preservam recibo e respeitam acesso atual. Diário sintético lê versões 1/2 e promove a 2 na primeira operação, sem migrar obras. [ADR-0036](../../docs/architecture/adr/0036-operation-receipts-and-reconciliation.md): 16 testes de operações, dois HTTPS e 53 verificações OIDC/operações no Firefox. Próximo: recuperação/reconferência; sem transação distribuída, defesa de rollback hostil ou idempotência retroativa das rotas legadas.

## Recuperação/reconferência e witness isolados

```bash
node --test --test-isolation=none packages/core/test/sharing-recovery.test.mjs
```

19 testes de um subject por âncora: checkpoint público/witness separado, wrapper que bloqueia rollback/substituição/crash gap, reconferência ES256 privada e posse antes de trocar para domínios vazios, sem grants herdados. [ADR-0037](../../docs/architecture/adr/0037-synthetic-trust-recovery-and-witness.md). A fixture HTTPS padrão ainda não usa o wrapper; próximo ciclo é integrá-lo a fixture dedicada e Firefox. Rollback conjunto de diretório+witness local é limitação testada: âncora realmente independente continua gate. Não recupera privadas ou autentica e-mail; sem conta real, conteúdo real ou E2EE liberados.

## Recuperação testemunhada no HTTPS/Firefox

```bash
node --test --test-isolation=none packages/core/test/sharing-recovery-https.test.mjs
python3 scripts/verify-sharing-recovery-firefox.py
```

Fixture dedicada de um subject: witness confirmado bloqueia o runtime antigo, ativação privada troca para domínios vazios e login novo exige posse da chave nova. Sete testes HTTPS e 52 verificações Firefox; sem rotas públicas de reconferência/bootstrap. [ADR-0038](../../docs/architecture/adr/0038-witnessed-recovery-https-firefox.md). Não recupera privadas/grants e não resolve rollback conjunto do witness local. Próximo: isolamento de confiança por subject para múltiplas contas/dispositivos; independência operacional segue gate.

## Isolamento por conta e retomada do mapa

A [ADR-0039](../../docs/architecture/adr/0039-subject-trust-isolation.md) prova separação por subject; a [ADR-0040](../../docs/architecture/adr/0040-subject-recovery-https.md) integra duas contas em HTTPS/OIDC sem reiniciar a sessão da conta não recuperada. A [ADR-0041](../../docs/architecture/adr/0041-subject-recovery-map.md) acrescenta um índice isolado de referências públicas, sempre subordinado aos witnesses configurados fora do mapa.

```bash
node --test --test-isolation=none packages/core/test/sharing-subject-recovery-map.test.mjs
```

O índice reabre somente o destino confirmado pelo witness. Uma queda sem registrar esse destino bloqueia a conta afetada até reparação privada; não volta ao diretório anterior. Testes de processos/SIGKILL não persistem privadas/JWT e uma sessão retomada ainda exige prova nova. O índice ainda não foi ligado à fixture HTTPS; não resolve perda de privadas, rollback conjunto ou independência operacional das âncoras.
