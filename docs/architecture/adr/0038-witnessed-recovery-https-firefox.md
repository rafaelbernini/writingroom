# ADR-0038 — Recuperação testemunhada em HTTPS e Firefox

2026-11-04. Aceita para fixture dedicada de um subject remoto. Aplicativo alpha.20/studio-19, obras 1–7 e pacotes v1/v2/v3 preservados. Sem contas, credenciais ou manuscritos reais.

## Integração e fronteira

`scripts/fixtures/recovery-https-fixture.mjs` compõe o wrapper/witness da ADR-0037, OIDC HTTPS da ADR-0035 e operações da ADR-0036. O launcher `sharing-recovery-browser-server.mjs` oferece somente um controle por stdin/stdout. O RP e o provedor OIDC escutam exclusivamente em 127.0.0.1/portas efêmeras; o provedor é acessado como localhost para os redirects entre sites já validados.

Esta fixture usa um único subject OIDC (`owner`). A política sintética também conhece `editor` para representar um grant anterior; isso não abre login remoto para outra identidade. A fixture OIDC multi-identidade anterior continua separada e não ganha proteção do witness por consequência deste teste. Não há alteração do servidor 4173 ou da UI.

O bootstrap cria diretório e diário vazios, confere fingerprint/raiz pública e instala o witness antes de preparar uma obra/grant **somente sintéticos**. Depois abre exclusivamente `openWitnessedDeviceDirectory` no runtime HTTP. Nenhuma rota ou campo de requisição escolhe witness, fingerprint, autoridade de reconferência, arquivo SQLite ou par de domínios servido.

## Candidato e aprovação fora da rede

Preparação da identidade nova, revisão, assinatura de aprovação, compromisso e ativação são comandos privados de teste. Não há `/recovery/*`, `/witness/*`, `/directory/pin` ou equivalente público; até uma sessão autenticada/provada recebe negativa nessas rotas.

O Firefox gera privadas X25519 não extraíveis em documentos vivos. O controle privado assina o vínculo público do candidato e entrega o desafio HPKE; o Firefox calcula a resposta e o controle a verifica. A prova de posse **pré-recuperação** passa por pipes, não por uma rota de ativação aberta no HTTPS. Só então se pode criar a revisão de recuperação. A aprovação exige subject, fingerprints antiga/nova completas e domínio de destino conferidos explicitamente. O JWT de reconferência permanece dentro do controle, sem ir para URL, relatório ou resposta HTTP.

O diretório/diário candidatos são novos e isolados. Não são servidos ao navegador antes da confirmação do witness. Reconferência errada ou candidato sem posse não muda o runtime atual nem seu epoch.

## Compromisso, bloqueio e ativação explícita

O comando privado `commit_recovery` verifica a autorização pelo coordenador da ADR-0037 e confirma o witness. Antes mesmo de fechar ou substituir o RP, o wrapper antigo deixa de coincidir com a âncora atual. O runtime antigo recusa `/session`, leitura do escopo antigo e consulta de recibos. Isso é exercitado por requisições reais, não apenas consultando o banco.

A transição tem duas etapas visíveis ao controlador: confiança confirmada e ativação do par novo. `activate_recovered` fecha o RP/handles antigos, abre o diretório candidato com o witness atual e reinicia o RP na mesma porta/origem usando o diário candidato. Não há fallback para o par antigo se a abertura falhar. Reinício comum é recusado enquanto a transição confirmada aguarda ativação, sem desmontar o servidor que ainda está bloqueando o estado antigo.

Depois da ativação:

- Cookie de sessão e callback OIDC pendente anteriores são recusados.
- Novo login continua usando o mesmo subject declarado, mas não confere posse nem confiança na chave antiga.
- A chave antiga assinada não ativa dispositivo no diretório novo.
- A privada nova precisa provar posse **novamente naquela sessão**, agora pelo HTTPS normal.
- `/operations/context` revela somente os domínios novos. Pedido/recibo com domínio antigo é negado; consultar o mesmo ID explicitamente no domínio novo retorna ausência local, sem importar o recibo antigo.
- O diário novo tem zero eventos e nenhum grant/recibo. A antiga obra/allowlist não existe ali. O teste só prepara um projeto novo por controle explícito depois de verificar esse vazio, e então valida operação nova/idempotência.

Os arquivos antigos permanecem históricos e não são reescritos, apagados ou importados no destino. A recusa de abrir o diretório antigo contra o witness atual também é verificada.

## Reconciliação de confirmação perdida

`reconcile_recovery` é controle privado, sem rota. Exige witness persistido com exatamente a sequência/epoch esperados, fingerprint e checkpoint/destino do diário da revisão aprovada. Revisão ainda não confirmada não passa. Reconciliação identifica o mesmo destino e permite ativá-lo sem repetir o JWT, gerar outro pin ou refazer bootstrap.

Um teste Node injeta falha **depois** do compromisso do witness e **antes** de o controlador atualizar seu estado local/retornar reconhecimento. O runtime antigo continua bloqueado, replay da autorização falha e a reconciliação recupera o destino confirmado. É uma injeção de erro no controle privado, não novo ensaio de queda de energia ou de SIGKILL do fluxo inteiro. Os ensaios de SIGKILL entre diretório/witness pertencem à ADR-0037 e permanecem na regressão.

## Reinício e limites

`restart_current` fecha transporte, diretório, diário, witness e coordenador; reabre os arquivos atuais e recria o estado OIDC. Mantém epoch/domínios e recibos do novo diário, descarta sessão/prova e exige novo login + posse antes de reconciliar. As privadas do navegador ficam nos documentos vivos; as privadas do emissor editorial e da autoridade de reconferência continuam no processo controlador. Isso não valida reinício do navegador, persistência de privadas ou reinício completo do controlador.

A fixture executa um ciclo de substituição por instância. Não adiciona múltiplos subjects/dispositivos, serviço externo de witness, custódia durável da autoridade de reconferência ou recuperação de privadas. O limite da ADR-0037 permanece: rollback conjunto do diretório e witness local pode reaceitar estado antigo. Aprovação por pipes simula controle independente; não fornece independência operacional contra servidor/administrador comprometido.

Sem E2EE/v4, verificação de e-mail real, envio de notificação, serviço público ou implantação. Recuperação não equivale a restaurar grants, desfazer revogação antiga ou recuperar conteúdo cifrado.

## Validação

Sete testes novos em `sharing-recovery-https.test.mjs`: bloqueio do runtime antigo e domínios vazios, ausência de rotas públicas de confiança, aprovação errada/candidato sem posse, reinício com recibo novo, snapshot antigo recusado sem derrubar sessão atual, Origin/CSRF preservados e reconciliação de reconhecimento perdido.

`scripts/verify-sharing-recovery-firefox.py` acrescenta **52 verificações reais no Firefox**, incluindo redirects OIDC, cookie/sessão, provas HPKE, fingerprint distinta, aprovação explícita, replay, bloqueio antes do cutover, ausência de grants/recibos herdados, sessão nova com chave antiga negada, nova posse, operação nova e persistência após reinício. TLS permanece verificado com CA restrita ao perfil NSS temporário. Aprovações e diagnósticos de snapshots usam apenas pipes privados. O relatório contém nomes de checks e limites, sem chaves, tokens, JWT ou conteúdo autoral.

```bash
node --test --test-isolation=none packages/core/test/sharing-recovery-https.test.mjs
python3 scripts/verify-sharing-recovery-firefox.py
node --test --test-isolation=none packages/core/test/*.test.mjs
```

A regressão completa Node foi executada. As 118 verificações Firefox anteriores da ADR-0037 **não foram reexecutadas nesta etapa**; os módulos comuns e a UI não foram alterados. A execução nova é a suíte dedicada de 52 verificações. Não houve nova homologação móvel.

## Continuidade

Próximo: contrato e prova sintética de isolamento de confiança por subject, permitindo múltiplas contas/dispositivos sem redefinir confiança de outras identidades. Definir limites de recuperação, concorrência e revogação por conta antes de estender a fixture atual. Independência real do witness, custódia/rotação da autoridade e recuperação das próprias âncoras seguem gates de produção. Preservar os testes da transição e os formatos autorais; não criar conta real, enviar dados ou implantar como consequência desta prova.

Evidência final em 2026-11-04: **390 testes Node aprovados, sem falhas/skips**, incluindo **7 novos HTTPS também aprovados isoladamente**. Log `/tmp/writingroom-recovery-https-final-node.log`; isolado `/tmp/writingroom-recovery-https-isolated-node.log`. **52 verificações Firefox novas aprovadas**, relatório `/tmp/writingroom-browser-k9j45auj/report.json` e log `/tmp/writingroom-recovery-https-firefox.log`.
