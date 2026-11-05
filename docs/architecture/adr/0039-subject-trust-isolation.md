# ADR-0039 — Isolamento sintético da confiança por subject

2026-11-05. Aceita como contrato e prova de composição em memória/SQLite. Aplicativo alpha.20/studio-19 preservado. Não integra múltiplas contas à fixture HTTPS de recuperação.

## Decisão

Cada conta opaca possui uma âncora de witness, um diretório de dispositivos e um domínio de diário próprios. A recuperação troca somente o diretório e o diário associados àquela âncora. A composição reutiliza as primitivas das ADRs 0037/0038, sem alterar schemas ou introduzir um reset global. Múltiplos dispositivos da mesma conta usam o mesmo pin editorial e bindings distintos; múltiplas contas não compartilham um diretório testemunhado.

O subject é a identidade interna já resolvida pelo controle confiável. Na futura integração OIDC, a resolução deve partir do par issuer/sub previamente mapeado; subject, arquivos, witness e domínios não podem ser escolhidos pelo corpo de uma operação. Nome/e-mail coincidentes não permitem selecionar outra conta. Esta etapa não implementa esse roteamento nem um cadastro persistente de contas.

`sharing-subject-isolation.test.mjs` prepara Alice e Bob por controle privado, com duas chaves de dispositivo por conta. Cada conta recebe uma autoridade de reconferência própria. Os journals reconhecem ambos os subjects para exercitar recusas mesmo quando a identidade textual existe no banco errado; continuam sendo domínios distintos. Não há segredo, manuscrito, conta ou provedor real nas fixtures.

## Recuperação, concorrência e revogação

A aprovação continua vinculada a anchorId, subject, fingerprints completas, sequência/epoch, checkpoints origem/destino, domínio do diário e desafio. O candidato contém um único dispositivo novo com posse comprovada. A recuperação invalida todos os dispositivos da conta antiga; não é um procedimento de adição de dispositivo nem preserva automaticamente dispositivos anteriores. Novos dispositivos exigem vínculo e posse explícitos pelo contrato existente.

Recuperações de contas distintas podem confirmar independentemente. Recuperações concorrentes da mesma âncora mantêm o CAS da ADR-0037. Uma aprovação de Bob apresentada ao desafio de Alice é recusada e consome aquele desafio de Alice, sem consumir a revisão pendente de Bob. Isso é controle privado, sem rota pública para provocar consumo de desafios.

Revogar um binding de Alice preserva seu segundo dispositivo e o estado de Bob. A recuperação de Alice bloqueia imediatamente os dois dispositivos antigos e suas sessões protegidas. Sessões já provadas de Bob conservam seus contextos/domínios e continuam utilizáveis. A troca não herda projetos, permissões ou recibos de Alice no diário novo e não reescreve o diário de Bob.

O domínio esperado no diretório recuperado impede pareá-lo com o diário de Bob, mesmo que esse diário reconheça o subject Alice. Uma sessão sem essa correspondência recebe 403 antes da prova/operação. Isso não constitui integração de compartilhamento entre diários: concessões entre contas em um serviço multiusuário exigirão um contrato separado de propriedade, armazenamento e autorização de recursos. Não copiar grants para resolver essa fronteira.

## Falhas e persistência

Uma falha injetada entre o commit do diretório de Alice e o witness deixa apenas aquela composição bloqueada por divergência. Bob continua usando uma sessão existente e pode confirmar sua recuperação já aprovada. A prova injeta uma exceção no hook existente; não é um novo ensaio de SIGKILL ou queda de energia. Os testes de processos/crash da ADR-0037 permanecem na regressão.

Reabrir cada witness após recuperações paralelas preserva seu registro exato. Não existe neste incremento descoberta automática dos destinos, mapa durável de contas ou ativação HTTP. Não reconstruir o mapa usando conteúdo de requisições, nomes/e-mails ou arquivos de backup. Estado ausente/divergente continua exigindo controle privado explícito, sem bootstrap automático ou fallback ao domínio anterior.

## Evidência e limites

Sete testes novos verificam recuperação de uma conta com quatro sessões/dispositivos ativos, aprovação cruzada, recuperações paralelas com reabertura dos witnesses, candidato/binding/witness de conta errada, revogação individual durante aprovação de outra conta, falha entre commits isolada e sessão com diário de outra conta. Reutilizam APIs reais de prova HPKE, SQLite, JWT e sessão sintética; não simulam o resultado da recuperação.

```bash
node --test --test-isolation=none packages/core/test/sharing-subject-isolation.test.mjs
node --test --test-isolation=none packages/core/test/*.test.mjs
```

Não foram reexecutadas verificações Firefox nesta etapa. A prova demonstra isolamento por separação de domínios, não serviço multiusuário concluído, isolamento de processos, custódia de privadas ou independência operacional do witness. Rollback conjunto do witness e diretório continua limite demonstrado. Sem E2EE/v4, envio, implantação, dependência nova ou alteração dos formatos autorais.

## Próximo incremento

Integrar o contrato a uma fixture HTTPS/OIDC de duas contas: selecionar a composição exclusivamente pela identidade autenticada, preservar a origem e as sessões da conta não recuperada, ativar somente o destino confirmado da conta recuperada e testar no Firefox os callbacks/provas/operações cruzados e reinício. Definir o mapa de conta → âncora/domínios no controle privado e sua reconciliação antes de introduzir persistência desse mapa. O compartilhamento de recursos entre diários e a independência operacional/custódia das autoridades permanecem gates posteriores explícitos.

**Regressão final: 397 testes Node aprovados, zero falhas/skips**, incluindo os sete novos, em 2026-11-05. Log temporário: `/tmp/writingroom-subject-isolation-final-20261105.log`. `git diff --check` sem erros. Firefox não reexecutado.

