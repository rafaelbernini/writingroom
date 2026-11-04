# ADR-0037 — Recuperação/reconferência sintética e registro de confiança separado

2026-11-04. Aceita para prova isolada de contrato. Aplicativo alpha.20/studio-19, obras 1–7, pacotes v1/v2/v3 e manuscrito privado preservados. Não implementa recuperação de conta/e-mail real ou de privadas perdidas.

## Decisão e alcance

A prova acrescenta `trust-witness.mjs`, `witnessed-device-directory.mjs`, `directory-checkpoint.mjs` e `recovery-fixture.mjs`. Um registro SQLite separado conserva o último compromisso público de confiança aceito. O wrapper só autoriza o diretório que coincidir exatamente com esse registro. Recuperação exige reconferência independente simulada e posse da nova chave, e passa a usar **diretório e diário novos**, sem projetos, grants ou recibos herdados.

É uma prova de **substituição da identidade de confiança de um subject por âncora**, não migração dos dados nem suporte completo a contas/dispositivos múltiplos. A composição nova ainda não está na fixture HTTPS/OIDC padrão. Os serviços anteriores permanecem em suas configurações de teste, sem essa proteção adicional até integração explícita. Não importar esses módulos na UI ou promover o gate de serviço real.

## Compromisso de estado e bootstrap

`directoryCheckpoint` normaliza domínio, revisão, suspensão, pins/revogações, hashes de bindings com subject/device/status e hashes revogados, ordenando IDs por comparação ASCII. O SHA-256 desse estado público detecta divergência; hashes de bindings já vinculam as públicas/contextos assinados, verificados pelo diretório. Não inclui privada, nonce, manuscrito, sessão ou token editorial.

O witness guarda anchorId, sequência de atualizações, epoch de recuperação, subject, fingerprint editorial pinada, domínio do diário, checkpoint do diretório e JWK pública da autoridade de reconferência. Schema próprio v1, arquivo 0600, abertura sem criar arquivo ausente, checksum/estrutura/CAS e SQLite FULL. Não é tabela nova no banco de obras; diretório continua v1 e diário mantém o contrato v1/v2 anterior.

Bootstrap é controle privado explícito. Exige diretório recém-criado, um subject/pin não revogado, nenhum binding/revogação, diário vazio não suspenso que reconheça o subject, fingerprint completa esperada e thumbprint JWK da autoridade de reconferência conferida pelo controle independente de teste. A chave de reconferência não vem da requisição de recuperação; sua pública fica pinada no witness. Arquivo ausente ou diretório divergente nunca provoca bootstrap automático.

## Operações sob o wrapper

Antes de usar o diretório, o wrapper compara domínio/revisão/hash completos com o witness e a fingerprint do subject. Revisão maior sozinha não autoriza avançar. Snapshot antigo, domínio de restore e substituição coerente de pin/binding na mesma revisão são negados.

Ativação/revogação usa a transação do diretório e o hook interno pré-commit. Sob lock do diretório, verifica-se o checkpoint anterior e reserva-se o witness por BEGIN IMMEDIATE com comparação do registro inteiro. Depois do commit do diretório, o wrapper confirma no witness exatamente a revisão seguinte, incrementando sequência. Não há Web Crypto pendente nessa reserva final; não aceita callback de usuário/rede. Uma mutação por conexão do wrapper, conflitos recusados conservadoramente.

Autorização e callback de operação usam ordem diretório → witness → diário. O witness permanece reservado durante o callback síncrono: outra transição não pode confirmar entre a verificação e a operação já admitida. `withAuthorizedBinding` passa também checkpointHash, calculado sob o lock do diretório. Metadados adicionais são internos; contextos de operação da ADR-0036 não passam a vir do cliente.

Se houver falha/SIGKILL após commit do diretório e antes do witness, o witness antigo fica preservado e o estado fica **bloqueado por divergência**. Não se adota automaticamente o diretório mais novo. Reconferência independente em domínios novos é a saída exercitada. Isso aceita indisponibilidade para não fingir atomicidade entre arquivos.

Bindings recebidos pelo wrapper são copiados antes de awaits. A composição de sessão reconhece `expectedJournalDomain` e recusa parear um diretório recuperado com o diário antigo. Mesmo com binding já ativo no candidato, nova sessão continua exigindo prova de posse por sessão antes de `/operations/context` ou escopo.

## Reconferência e nova identidade

A autoridade de teste gera ES256 com `jose` já fixada como devDependency; não acrescenta dependência ou algoritmo artesanal. Sua privada fica exclusivamente no controle de teste, fora de diretórios/journals/witness. Ela simula uma confirmação por canal independente; não verifica identidade civil ou e-mail e não pode ser substituída por login OIDC.

Fluxo privado:

1. Criar candidato em diretório novo com nova identidade Ed25519 pinada explicitamente e um dispositivo X25519 com vínculo assinado. Provar posse pelo HPKE existente antes de pedir recuperação.
2. Criar diário novo, vazio, não suspenso, que reconheça o mesmo subject opaco. A prova exige um pin e um binding ativo no candidato, revisão inicial de ativação, sem revogações ou herança do diretório antigo.
3. `begin` exige fingerprints completas antiga/nova, diferentes entre si, e produz revisão com anchorId, sequência/epoch atuais, subject, fingerprints, checkpoints origem/destino, domínio novo do diário, bindingHash, nonce de 256 bits e prazo de cinco minutos. Até 20 revisões pendentes; estado somente em memória.
4. O controle independente `approve` exige conferir subject, fingerprints antiga/nova e domínio de destino. Emite JWT ES256 por 60 segundos, com issuer/purpose/audience fixos, nonce/revisão exatos e challengeId como jti. Não existem campos nome/e-mail para conferir confiança por coincidência.
5. `confirm` reivindica o desafio uma vez antes de awaits, verifica JWT com a pública pinada do witness e revalida sequência/epoch/checkpoints/prazo. Sob reserva do diretório candidato, do witness e do diário vazio, confere posse atual, mesma revisão/hash e ausência de eventos antes de avançar o witness para novo domínio/fingerprint/diário. Incrementa sequência e epoch; a chave da autoridade de reconferência permanece pinada.

Assinatura de binding sem posse não basta. Outro emissor de reconferência, token adulterado/expirado, revisão antiga, replay, candidato revogado ou diário que ganhou conteúdo são recusados. Duas recuperações aprovadas competem por CAS: só uma confirma. Reiniciar coordenador descarta os desafios; precisa de revisão nova, não restaurar aprovação antiga.

O mecanismo **não recupera privadas, conteúdo cifrado, backups de identidade, senha ou grants antigos**. O diretório antigo e seu histórico não são reescritos; o wrapper antigo deixa de coincidir com a âncora atual. Mesmo subject textual no candidato não autoriza usar o diário antigo: a sessão exige o domínio novo vazio. Restore suspenso nunca é convertido em candidato ativo nem reativado.

## Consistência e falha de resposta

Não há transação distribuída. Reserva de witness e CAS serializam a confiança admitida, não tornam commits em arquivos diferentes atomicamente restauráveis. A troca de epoch pode confirmar e a resposta se perder; o controle pode consultar o registro persistido para identificar o destino atual. O token/desafio não é repetido automaticamente.

`withEmptyDomain` é controle interno do diário, sem rota: reserva a escrita, exige domínio vazio e subject esperado e executa callback síncrono. Nenhum evento de concessão é copiado. A autorização de recuperação é verificada em memória; a prova ainda não oferece histórico assinado de todas as reconferências ou recibo externo inviolável.

## Modelo de ameaça e limite demonstrado

A garantia exige witness e autoridade de reconferência **independentes do estado que o atacante pode substituir**. No teste são arquivos/controladores locais separados para exercitar o protocolo, não um serviço/hardware externo com proteção operacional homologada. `reserve/advance/recover` são controles internos confiáveis: não podem ser expostos a JSON, plugin ou processo não confiável. A fixture não impede que quem controla o código do serviço ou os arquivos do witness abuse desses controles.

Um teste explícito reverte o diretório **e** o witness juntos: o par antigo volta a coincidir e a chave revogada pode ser aceita. Logo, armazenar ambos no mesmo domínio de backup/ataque **não resolve rollback hostil**. Checksum local não substitui âncora independente, contador monotônico protegido, serviço externo autenticado ou procedimento independente que preserve a revisão mais recente. Esse gate continua aberto; a prova não libera E2EE, conteúdo real ou produção.

Para produção também faltam custódia/rotação/recuperação da autoridade de reconferência, perda do próprio witness, múltiplos subjects/dispositivos, persistência segura de transições/revisões no cliente, política de suporte/reprova e notificações auditáveis por canal independente. A prova não envia notificações ou e-mails e não afirma conformidade NIST ou auditoria criptográfica externa.

## Evidência

19 testes Node novos cobrem avanço e persistência do witness, ausência de privadas, reset de epoch em domínios novos sem grants, sessão com domínio de diário errado, nova prova por sessão, candidato sem posse, fingerprints explícitas, autoridade falsa/token adulterado, prazo/restart/replay, duas recuperações concorrentes, revogação/conteúdo novo após aprovação, rollback antigo, substituição coerente na mesma revisão, restore suspenso, falha/SIGKILL entre commits, disputa entre processos e reserva do witness durante callback. Testes também documentam a limitação do rollback conjunto e a recusa de relabeling do subject durante await.

```bash
node --test --test-isolation=none packages/core/test/sharing-recovery.test.mjs
node --test --test-isolation=none packages/core/test/*.test.mjs
```

Firefox reexecutado somente como regressão dos fluxos anteriores (53 OIDC/operações, 38 posse, 27 cookies). Não há teste browser da recuperação nova; os 19 testes exercitam APIs internas/SQLite/processos e composição de sessão em memória. UI móvel inalterada, sem nova execução de seus scripts.

## Próxima fase

Integrar wrapper/witness a uma fixture HTTPS dedicada de um subject e exercitar no Firefox o ciclo de reconferência por controle privado, troca de domínios e invalidação de sessões/recibos antigos, sem rota pública de aprovação ou bootstrap. Manter o witness fora do restore dos componentes protegidos e o limite de rollback conjunto explícito. Independência operacional real e modelo multiusuário continuam decisões/gates antes de escolher provedor/serviço real.

Sem manuscrito privado, credencial real, conta, envio, deploy ou alteração dos formatos autorais nesta etapa.

## Fontes primárias verificadas

- [NIST SP 800-63B-4 — Authenticator Event Management](https://pages.nist.gov/800-63-4/sp800-63b/events/): distinção entre vínculo de autenticador, recuperação e eventos de ciclo de vida; referência para o contrato futuro, sem alegar conformidade desta fixture.
- [SQLite — transações](https://sqlite.org/lang_transaction.html): reserva de escrita, concorrência e erros de commit; não fornece proteção independente contra rollback de todos os arquivos.

Evidência final em 2026-11-04: **383 testes Node sem falhas/skips**, incluindo **19 novos também aprovados isoladamente**. Logs `/tmp/writingroom-recovery-final-node.log` e `/tmp/writingroom-recovery-isolated-node.log`. Regressão Firefox: **53 OIDC/operações + 38 posse + 27 cookies**; relatórios `/tmp/writingroom-browser-0fi3y6_7/report.json`, `/tmp/writingroom-browser-frkvgpu4/report.json` e `/tmp/writingroom-browser-3j_yjljg/report.json`. Não são execução browser da recuperação nova.
