# ADR-0040 — Recuperação independente de duas contas em HTTPS/OIDC

2026-11-05. Aceita para fixture sintética de duas contas. Continua sem integração com a aplicação alpha.20/studio-19, identidade real ou E2EE/v4.

## Problema e decisão

A fixture da ADR-0038 reinicia todo o RP ao ativar o diretório recuperado. Aplicar essa estratégia a duas contas derrubaria também as sessões da conta não recuperada. A composição da ADR-0039 passa a ter uma fixture HTTPS/OIDC própria: cada conta possui um harness de sessão/prova e um par diretório/diário testemunhado, servidos na mesma origem. A ativação privada substitui somente o harness da conta recuperada e mantém o servidor HTTPS, o provedor OIDC e os outros harnesses vivos.

`oidc-fixture-session.mjs` aceita opcionalmente `subjectContexts`, fornecido pelo controlador privado. A configuração anterior continua sendo o padrão. Cada contexto exige um diretório testemunhado de um subject, pin ativo, epoch válido, diário não suspenso e domínio esperado correspondente. Contextos de contas distintas não podem compartilhar instâncias ou domínios de diário/diretório. O mapa inicial deve corresponder às contas OIDC configuradas.

Não existe seletor de conta/contexto/domínio em uma requisição. Login começa sem conta escolhida e cria apenas estado, PKCE, nonce e vínculo com o navegador. Depois da verificação criptográfica do ID token e das claims, issuer/sub é mapeado para o subject interno e seleciona o harness correspondente. O callback realiza um handoff privado ao emissor sintético desse harness; login continua sem conferir posse de dispositivo. Não há uso de e-mail, nome ou chave enviada pelo cliente para selecionar a confiança.

Para operações posteriores, o cookie opaco deve ser reconhecido por uma sessão válida de um harness. Esse vínculo autenticado seleciona a composição; binding, corpo, CSRF e domínios enviados não alteram a escolha. O harness selecionado mantém as verificações de Origin, CSRF, dispositivo/subject, posse e domínios atuais. O transporte mantém sua allowlist e recusa campos como subject/actor na requisição.

## Callbacks, resultados e concorrência

Prelogins guardam referências privadas aos contextos e seus epochs/gerações no momento da abertura. Não precisam saber a conta antes da assinatura ser verificada. O callback revalida prazo, geração global e, após resolver a identidade, a referência/epoch/geração daquela conta. Uma transição de Alice não invalida um callback de Bob, inclusive quando o token está em troca assíncrona durante a transição. Um callback antigo de Alice é recusado após compromisso ou ativação. Um login iniciado enquanto o diretório de Alice está bloqueado não ganha confiança por posterior ativação; exige início novo.

Resultados OIDC de uso único ficam vinculados ao cookie e contexto que os criou. Ativar outra conta não limpa esses resultados. Logout/revogação de sessão aumenta a geração apenas da conta correspondente e remove seus resultados pendentes. Prelogins de outras contas permanecem independentes. Reinício/fechamento completo invalida todo o estado volátil.

A ativação privada exige subject já cadastrado, contexto testemunhado válido, novos domínios de diretório e diário e epoch exatamente seguinte ao contexto substituído. Não permite reset no mesmo domínio. O controlador abre o destino contra o witness já confirmado antes de substituir o contexto; não faz bootstrap ou fallback se esse destino falhar. O wrapper anterior já bloqueia sessões/operações de Alice assim que o witness confirma, mesmo antes da ativação. Bob continua atendido nesse intervalo.

## Controle privado e mapa de destinos

`scripts/fixtures/subject-recovery-https-fixture.mjs` prepara Alice e Bob com autoridades de reconferência distintas, diários/diretórios/witnesses separados e projetos homônimos apenas sintéticos. Bootstrap, preparação do candidato, prova de posse pré-recuperação, aprovação, compromisso, reconciliação, ativação e seleção dos arquivos permanecem em funções privadas. O launcher expõe esse controle somente por stdin/stdout. Não há rota pública de recovery, pin, seleção de conta, aprovação ou bootstrap.

O mapa conta → arquivos/âncora/contexto é **volátil e privado**, mantido no controlador. O witness é a fonte do compromisso de confiança; o mapa não pode avançar uma âncora. `reconcile_recovery` exige a revisão privada conhecida e correspondência exata de anchorId, subject, sequência/epoch, fingerprint, checkpoint e diário de destino. Uma falha injetada após confirmar o witness e antes do reconhecimento pode ser reconciliada e ativada sem repetir aprovação nem alterar Bob.

`restart_current` reabre todos os bancos do mapa atual e reinicia RP/OIDC na mesma origem. Exige que nenhuma composição esteja divergente/aguardando ativação; não escolhe o diretório antigo para contornar a falta de destino reconciliado. Após ativação, preserva os dois witnesses, domínios e recibos, mas descarta sessões, prelogins e provas. As chaves privadas editoriais/de reconferência continuam no controlador; chaves de dispositivos Firefox ficam em documentos vivos. Não é reinício completo do controlador/navegador ou recuperação de privadas.

## Evidência

A suíte Node dedicada cobre preservação de sessão/domínios/recibos de outra conta; callbacks antigos por subject; bindings/respostas HPKE/CSRF/domínios cruzados e campos de seleção recusados; Origin/Fetch Metadata; ausência de rotas de controle; reinício completo; confirmação perdida e reconciliação; logout por conta; e recuperação durante o await real de troca de token, para ambas as contas.

O script Firefox usa TLS validado por CA restrita ao perfil temporário, redirects reais e privadas de dispositivo não extraíveis. Exercita sessões/contextos/recibos de Bob antes e depois da recuperação de Alice, callbacks pendentes distintos, prova nova, ausência de grants/recibos herdados, operações novas/idempotência e reabertura dos dois domínios com prova nova após reinício. Os relatórios contêm nomes de checks e limites, sem cookies/JWT/chaves ou conteúdo autoral.

```bash
node --test --test-isolation=none packages/core/test/sharing-subject-recovery-https.test.mjs
python3 scripts/verify-sharing-subject-recovery-firefox.py
node --test --test-isolation=none packages/core/test/*.test.mjs
```

Resultados finais e artefatos desta execução constam em PROGRESS/NEXT_SESSION. As suítes Firefox anteriores de recuperação, OIDC/operações, posse e cookies também foram executadas por alterarmos os módulos compartilhados.

## Limites e próxima fase

Esta fixture executa uma recuperação por conta por instância. Não implementa compartilhamento de recursos entre diários de contas, cadastro/mapa durável de destinos, descoberta após crash do controlador, custódia/rotação da autoridade, notificação ou independência operacional do witness. Rollback conjunto de diretório e witness continua um limite demonstrado. Não introduz dependências, schemas ou formatos de obra/pacote, contas reais, rede pública, e-mail, manuscrito ou implantação.

Próximo incremento: contrato e prova sintética de retomada do controlador/mapa de conta → âncora/domínios após falha, incluindo compromisso confirmado antes de persistir o destino e mapa antigo/substituído. Evitar que um mapa local antigo reative confiança ou invalide outras contas. Definir quais referências públicas podem persistir e quais controles exigem reconferência independente; não persistir privadas/JWT ou inferir confiança por existência de arquivo. O mapa não substitui o witness independente nem resolve rollback conjunto. Compartilhamento entre diários permanece uma etapa posterior separada.

## Resultado desta sessão

**Regressão final: 405 testes Node aprovados, zero falhas/skips**, incluindo os oito novos. Log `/tmp/writingroom-subject-https-final-node-2.log`. `git diff --check` sem erros.

Oito testes HTTPS novos também aprovados isoladamente (`/tmp/writingroom-subject-https-isolated-final.log`). Firefox: **58 novos + 52 recuperação + 53 OIDC/operações + 38 posse + 27 cookies = 228 verificações aprovadas**. Relatório novo `/tmp/writingroom-browser-mb4yls86/report.json`; regressões `/tmp/writingroom-browser-pr9cg8tp/report.json`, `/tmp/writingroom-browser-_zxluz5i/report.json`, `/tmp/writingroom-browser-4ilwi0ib/report.json`, `/tmp/writingroom-browser-bscnqwj5/report.json`.

As primeiras tentativas OIDC oscilaram na injeção de resposta perdida. O launcher de teste agora mantém a interrupção das respostas de operações armada até o comando privado `resume_operations`, em vez de interromper apenas a primeira resposta e permitir que um retry de transporte receba resposta normal. A suíte final de 53 verificações passou, incluindo compromisso/recibo/idempotência de convite e aceite. As regras normais do transporte não foram relaxadas.
