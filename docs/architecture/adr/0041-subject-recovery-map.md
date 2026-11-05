# ADR-0041 — Índice público de destinos e retomada do controlador

2026-11-05. Aceita como contrato e prova isolada de SQLite/processos. Não integra o mapa à fixture HTTPS da ADR-0040 ou ao aplicativo alpha.20/studio-19.

## Decisão e fronteira de confiança

`subject-recovery-map.mjs` persiste um índice de localizadores públicos. O mapa não é uma âncora de confiança e não decide qual recuperação foi confirmada. A configuração privada fornece, fora desse mapa, a raiz de arquivos e a associação subject → handle do witness/anchorId esperado. Não se descobre witness, subject ou autoridade de reconferência por nomes/e-mails, caminhos contidos no mapa ou existência de arquivos.

Cada registro contém somente subject, anchorId, epoch, fingerprint editorial, domínios do diretório/diário e dois nomes de arquivo. Não contém privada, assinatura de aprovação, JWT, nonce de recuperação, cookie, sessão, token editorial, manuscrito ou cópia do witness. Os nomes aceitos são basenames ASCII limitados com extensão `.sqlite`, sob a raiz previamente resolvida; paths absolutos, subdiretórios, traversal e symlinks de arquivo são recusados. Isso não constitui defesa completa contra um administrador que altera o filesystem entre verificações.

Schema próprio v1, tabela `locators`, referências de diretório/diário únicas, payload/checksum e verificação do schema/quick_check. Abertura recusa tabelas/triggers adicionais, versão desconhecida e arquivo ausente/symlink. Criação é explícita, exclusiva e 0600, com sincronização do arquivo/diretório. Limites da prova: 100 âncoras configuradas, 100 referências por subject e 16 MB na abertura. Não há remoção automática, coleta de arquivos antigos ou migração de obras/diários/diretórios.

## Por que não persistir um ponteiro ativo depois do witness

Existem dois compromissos independentes: registrar onde procurar os arquivos e confirmar a confiança no witness. Uma queda entre ambos não pode fazer o mapa autorizar o destino anterior ou promover um candidato ainda não aprovado. Por isso o índice admite referências de candidatos antes do compromisso; **somente a referência correspondente ao witness atual pode ser resolvida**.

`prepareTarget` recebe uma revisão pública do coordenador privado e os localizadores. Confere subject/anchorId, origem exata, sequência/epoch, fingerprints distintas, prazo e checkpoint candidato; verifica diretório candidato com um binding ativo e diário novo vazio/não suspenso que reconheça o subject. Guarda apenas a referência pública do próximo epoch. Não verifica nem conserva o JWT de aprovação e não confirma recuperação. Uma revisão sem aprovação pode deixar um localizador inerte: nunca muda o witness ou a escolha do destino servido.

A gravação reserva o witness de origem por CAS e realiza uma transação SQLite no mapa, em ordem witness → mapa. Registrar a mesma referência é idempotente; localizadores conflitantes para os mesmos domínios são recusados. A reserva impede uma transição concorrente durante a gravação, mas não cria transação distribuída. O compromisso de confiança continua exclusivamente no coordenador da ADR-0037.

## Resolver após reinício

`resolve(subject)` consulta a configuração privada, lê o witness atual e procura exatamente seus domínios. Não escolhe a maior revisão/epoch da tabela, não varre arquivos e não tenta outra linha se a escolhida falhar. Compara os campos públicos do registro à âncora atual, abre o diretório pelo wrapper testemunhado e confere domínio/suspensão do diário. Revalida o witness após os awaits. Divergência, arquivo ausente e referências antigas resultam em recusa.

O índice não fixa a sequência/revisão do diretório para sempre: provas e revogações legítimas continuam avançando o checkpoint no witness dentro dos mesmos domínios. O wrapper confere esse checkpoint atual em cada autorização. Mesmo que o mapa aponte para uma cópia antiga com o domínio correto, ela não passa contra um witness mais recente.

Um destino preparado pode ser encontrado após SIGKILL imediatamente depois do compromisso do witness, sem persistir um segundo ponteiro ativo, reexecutar JWT ou refazer bootstrap. Se a queda ocorreu sem registrar o destino, a conta fica bloqueada até uma reparação privada explícita. Outra conta cujo registro e arquivos continuam válidos ainda pode ser resolvida. A prova não promete disponibilidade se o arquivo SQLite compartilhado inteiro estiver corrompido, ausente ou indisponível.

## Reparação e preservação de evidência

`rememberCurrent` recebe localizadores conhecidos pelo controle privado, abre os arquivos contra o witness atual e só então registra a referência. Não altera o witness, não admite os arquivos antigos para resolver uma lacuna e não precisa de privada/JWT de aprovação para reencontrar um compromisso já confirmado. Não é nova recuperação: se os arquivos corretos foram perdidos ou não coincidem com a âncora, esse método não os recria e não restabelece confiança.

Um mapa revertido pode perder a referência nova e bloquear apenas a conta recuperada; um localizador futuro não confirmado não muda o destino atual. Adulterar subject, anchorId, epoch, checksum ou caminhos não permite trocar de conta ou voltar ao pin anterior. Checksum local detecta corrupção acidental, não é assinatura; os testes recalculam checksums após adulteração e a recusa continua dependendo do witness/arquivos.

Um registro substituído que conflita com a referência correta não é sobrescrito silenciosamente. O controle pode criar explicitamente outro arquivo de mapa e registrar os destinos atuais conferidos, preservando o mapa adulterado para análise e sem reescrever os witnesses. Configuração privada, raiz e handles das âncoras devem vir de uma fonte independente; não do mapa corrompido.

## Evidência

`sharing-subject-recovery-map.test.mjs` exercita reabertura do índice, conteúdo público/0600/idempotência, candidato inerte antes de confirmar, resolução após compromisso, snapshot antigo, reparação privada e reconstrução em arquivo separado, adulteração com checksum coerente, arquivos/âncoras cruzados, traversal/symlink, schema/triggers hostis e diretório de checkpoint antigo.

Há processo controlador separado que abre witnesses e mapa somente com configuração/referências públicas, sem receber privadas. Os testes de SIGKILL cobrem: compromisso do witness antes de atualizar estado volátil, com/sem referência preparada; transação do mapa antes do commit; e mapa já confirmado antes de devolver reconhecimento. A aprovação do controlador filho chega somente por IPC privado da autoridade mantida no processo pai. Nenhum JWT é salvo no disco ou passado por argv/log.

Depois de reabrir a composição, uma sessão nova ainda precisa provar posse na própria sessão antes de operar. Esses testes não recuperam a privada do dispositivo: ela permanece no processo de teste que responde ao novo desafio. Não há teste browser ou autenticação OIDC deste mapa nesta etapa.

```bash
node --test --test-isolation=none packages/core/test/sharing-subject-recovery-map.test.mjs
node --test --test-isolation=none packages/core/test/*.test.mjs
```

## Limites preservados e próximo incremento

Witness e autoridades continuam sintéticos/locais; rollback conjunto do diretório e witness continua podendo reaceitar confiança antiga. O mapa não acrescenta independência operacional, recuperação de privadas, custódia/rotação de autoridade, proteção contra código controlador comprometido ou contra rollback dos eventos de um diário que conserva seu domínio. O witness compromete checkpoint do diretório e domínio do diário; este módulo não cria um checkpoint dos eventos do diário. Não alegar proteção geral contra rollback do filesystem ou recuperação de conteúdo cifrado.

Não há transação distribuída, prova de queda de energia, restaurador automático, cadastro de contas real, compartilhamento entre diários, notificação, envio, implantação ou E2EE/v4. Nenhuma mudança nos formatos de obra/pacotes ou nos módulos comuns de HTTPS/OIDC.

Próximo: integrar o índice a uma fixture HTTPS/OIDC retomável. O launcher deve reabrir apenas configuração/referências públicas verificadas, resolver contas de modo independente e não precisar das privadas editoriais/de reconferência antigas para servir login + nova prova de posse. Testar queda do controlador após compromisso e antes do reconhecimento, preservação de domínios/recibos da outra conta e recusa de destinos ausentes/antigos. Persistência/recuperação das privadas e independência real do witness permanecem gates separados; nunca resolver sua ausência gerando outra chave sob o mesmo nome.

## Resultado desta sessão

**419 testes Node aprovados, zero falhas/skips**, incluindo 14 novos também aprovados isoladamente, em Node v26.13.0/Linux. Baseline 405 aprovados. Logs `/tmp/writingroom-account-map-baseline.log`, `/tmp/writingroom-map-isolated-final.log`, `/tmp/writingroom-account-map-final.log`. `git diff --check` sem erros. Firefox não reexecutado, pois não há alteração do transporte/OIDC/UI neste incremento; as 228 verificações da etapa anterior não são validação browser deste módulo.
