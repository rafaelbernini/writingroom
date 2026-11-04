# ADR-0033 — Ciclo integrado de sessão, dispositivo e convites no Firefox

2026-11-04. Aceita para validação sintética. Aplicativo permanece alpha.20/studio-19, formatos 1–7 e pacotes v1/v2/v3 preservados.

## Decisão e fronteira

A suíte `scripts/verify-sharing-bound-firefox.py` valida a composição da ADR-0032 no Firefox real com perfil NSS temporário, CA restrita àquele perfil e validação TLS ativa. Usa dois bancos SQLite sintéticos, sem importar obras, identidades ou chaves do aplicativo. Servidor exclusivamente 127.0.0.1; não abre 4173, LAN ou implantação.

O controlador `scripts/fixtures/sharing-bound-browser-server.mjs` emite códigos, cria bindings assinados, instala pins iniciais e revoga bindings somente por pipes privados. Nenhuma dessas ações ganha rota HTTP. As privadas Ed25519 sintéticas ficam no controlador em memória; as privadas X25519 não extraíveis são geradas no Firefox, sem exportação ou persistência. Tokens, cookies, respostas de posse e chaves não entram no relatório.

O adaptador HTTPS admite duas opções exclusivas de fixture: `fixturePort` permite reutilizar a porta efêmera inicial durante reinício, exigindo `enableBrowserFixture` para porta não zero; `browserFixtureScript` fornece o bundle público de teste em GET `/_synthetic/proof.js`, somente com fixture habilitada e conteúdo fornecido. Ausência mantém a rota bloqueada. Não serve paths arbitrários, arquivos do disco ou código recebido por requisição. Documento de fixture permite scripts da própria origem; APIs e documentos do aplicativo não mudam.

O bundle precisa ser carregado pelo documento no contexto nativo do navegador. Injetá-lo como texto em WebDriver produz objetos de realms diferentes (por exemplo TextEncoder/Uint8Array), recusados pelas verificações de tipo de HPKE. O teste não remove nem afrouxa essas verificações para acomodar a automação.

## Cenários

38 verificações: privadas não extraíveis; login sem posse bloqueado; segunda sessão do mesmo subject/device não confirma desafio da primeira; a primeira ainda confirma; replay negado; nova sessão não herda vínculo ativo; remetente e destinatário comprovam posse; subject/CSRF incorretos negados; prévia por allowlist; aceite explícito e recibo único; read/propose concedidos; pesquisa, outra obra e gestão negadas; revogação de convite e de dispositivo; sessão invalidada; relogin não reativa dispositivo revogado; controles administrativos ausentes das rotas; logout disponível sem posse.

Para sessões independentes, WebDriver remove o cookie local antes do novo login e restaura cookies HttpOnly pelo protocolo de automação, sem acesso por JavaScript da página. Login com cookie existente continua tendo a rotação/invalidação da ADR-0025; não confundir reautenticação com dois clientes independentes.

Reinício fecha o transporte e ambos os bancos, reabre os arquivos e mantém a origem/porta. Cookies antigos e resposta de desafio ainda pendente são recusados. Recibo e bindings ativos persistem; novo login exige nova posse antes de recuperar o grant existente. O processo controlador e o documento Firefox permanecem vivos, conservando suas chaves de teste. Isso verifica reinício do serviço, não SIGKILL, reinício do navegador ou recuperação de chaves; evidências de crash nos testes Node anteriores são distintas.

## Validação

```bash
python3 scripts/verify-sharing-bound-firefox.py
python3 scripts/verify-sharing-cookies-firefox.py
node --test --test-isolation=none packages/core/test/*.test.mjs
```

Relatórios em diretórios temporários indicados no PROGRESS e no documento de retomada. A regressão de cookies permanece separada: suas 27 verificações não substituem as 38 da composição. A suíte Node acrescenta cobertura das opções de porta/rota de fixture. Suítes de UI móvel não são reexecutadas nesta etapa, sem alteração do aplicativo.

## Continuidade

Próxima fase: registrar contrato OIDC detalhado e implementar provedor/adaptador exclusivamente de fixture para issuer, audience, nonce, state, PKCE S256 e redirect exatos, assinatura/prazos e replay. O emissor sintético atual não verifica e-mail nem implementa OIDC; não promover seus subjects declarados a contas autenticadas.

Depois: idempotência/recibos e reconciliação entre diário e diretório. O lock de admissão não é transação distribuída; queda após compromisso pode deixar mutação durável sem resposta. Recovery/reconferência e resistência a substituição/rollback hostil continuam gates antes de conteúdo real ou E2EE/v4. Sem contas/credenciais reais, envios ou deploy nesta etapa.

Evidência final em 2026-11-04: **313 testes Node sem falhas/skips; 38 verificações integradas e 27 de cookies no Firefox aprovadas**. Node `/tmp/writingroom-combined-final-node.log`; integrado `/tmp/writingroom-browser-08510kbe/report.json`; cookies `/tmp/writingroom-browser-b8fal6sm/report.json`.
