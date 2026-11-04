# ADR-0031 — Diretório sintético durável de dispositivos

2026-11-03. Aceita para prova isolada. Complementa ADR-0030; sem integração com conta, e-mail, servidor do aplicativo ou armazenamento de manuscritos. Produto permanece alpha.20/studio-19.

## Persistência

`packages/sharing-spike/src/durable-device-directory.mjs` usa SQLite nativo em arquivo separado, criado exclusivamente com 0600. Schema próprio user_version=1, tipo writingroom-synthetic-device-directory-v1, domínio UUID, revisão global e suspensão. Tabelas: pins externos subject/fingerprint/revogado, vínculos públicos assinados/hash/checksum/status e tombstones de hashes revogados. Índice único impede dois vínculos ativos no mesmo subject/dispositivo. Nada migra projetos 1–7, pacotes v1/v2/v3 ou identidades offline existentes.

Até 100 pins iniciais, 1000 vínculos e 1000 hashes revogados; vínculo JSON até 4096 bytes, arquivo de entrada até 8 MB. Não há poda automática de revogações. Pins iniciais entram por fixture, simulando conferência externa; a prova não verifica o canal real. Pins são imutáveis, exceto revogar: não há troca silenciosa ou reativação. Chaves privadas, nonce de desafio, frases e sessões não são persistidos. Dados públicos/metadados continuam em claro; 0600 não torna o banco um cofre.

Abertura verifica schema, quick_check, limites/checksums e assinatura de todos os vínculos no tempo de emissão. Isso verifica integridade criptográfica histórica; não torna um vínculo expirado utilizável. Autorizar exige pin não revogado, vínculo ativo, contexto/pin/assinatura esperados e prazo atual. Schema desconhecido é recusado antes de habilitar WAL, sem migração. Exige Node com SQLite nativo (testado v26.13.0); aplicativo continua com sua compatibilidade anterior.

## Desafios, revisão e compromisso

Cada instância tem até 100 desafios de posse em memória, gerados pelo verificador da ADR-0030. Guarda vínculo congelado, hash, prazo escalar e revisão inicial do diretório. Desafio entregue ao chamador é cópia independente. Não guarda nonce em claro no banco. Reabrir diretório ou trocar de instância invalida o desafio; vínculo já ativado durável sobrevive, desde que ainda autorizado. Não há promessa de confirmação idempotente.

Operações criptográficas assíncronas acontecem fora da transação de escrita. Antes de publicar desafio ou autorizar, a revisão é consultada novamente. Confirmar consome o desafio local uma vez, verifica a prova e abre BEGIN IMMEDIATE: compara revisão capturada com a atual, revalida pin/revogação/slot/prazo e insere o vínculo ativo e incrementa revisão em um COMMIT. Não mantém lock SQL enquanto espera Web Crypto. Qualquer mudança concorrente de revisão, mesmo em outro dispositivo, exige novo desafio: política conservadora de conflito.

Revogar vínculo/pin exige expectedRevision explícita e transação; qualquer revisão antiga falha sem aplicar parcialmente. Tombstone pode registrar hash ainda pendente, impedindo que ativação futura o ressuscite. Revogação de pin também marca seus vínculos revogados. Duas conexões confirmando com mesma revisão produzem no máximo um compromisso; um processo separado revogando antes do compromisso bloqueia a confirmação em andamento.

WAL, synchronous FULL, trusted_schema OFF e busy_timeout 500 ms. Erro de gravação ou hook de teste antes de COMMIT reverte; desafio consumido não volta a valer, exigindo nova tentativa completa. SIGKILL durante transação deixa o último estado confirmado. Falhas são fechadas; não há retry automático oculto ou editor real conectado.

## Backup e restauração

Backup reserva destino exclusivo, gera VACUUM INTO consistente com WAL, verifica schema/checksums/assinaturas, sincroniza arquivo/diretório e retorna SHA-256 separado. Não sobrescreve arquivo existente. Interrupção abrupta pode deixar arquivo parcial; existência não prova backup válido. Checksum deve ser guardado pelo controlador e conferido na recuperação.

Restore lê os bytes uma vez, verifica checksum e valida a cópia em destino exclusivo. Gera domínio novo, incrementa revisão e marca suspended=1 antes de abrir. Consulta histórica permanece disponível, mas begin/confirm/authorize/revogação operacional ficam bloqueados. Pins e vínculos presentes não são considerados reautorizados. Não há API de reativação: reconferência/provisionamento futuro é gate separado. Backup anterior a uma revogação não recupera acesso **pelo fluxo de restore desta API**, testado explicitamente.

Não oferece antirollback contra quem pode substituir arbitrariamente o banco no filesystem por uma versão antiga ou adulterar metadados/checksums. O armazenamento é fronteira confiável desta prova; domínio/checksum não são âncora externa ou log inviolável. Não executar cópia manual sobre o banco ativo nem usar forks como uma identidade global compartilhada. Reconciliação distribuída, rollback hostil e auditoria externa continuam pendentes.

## Evidência

Nove testes em `sharing-device-directory.test.mjs`: ativação/revogação e 0600 após reopen, descarte de desafio no restart, revogação de vínculo pendente por outra conexão e CAS antigo, concorrência de confirmações, rollback de ativação, backup antigo/restore suspenso/checksum/destino ocupado e pin revogado após reopen, SIGKILL de gravação, revogação por outro processo e corrupção/schema desconhecido sem migração. Não guarda conteúdo autoral ou privadas em fixtures.

```bash
node --test --test-isolation=none packages/core/test/sharing-device-directory.test.mjs
```

Tests marcam skip explícito se SQLite nativo não estiver disponível; não representa cobertura nesse runtime. Não há mudança de UI/browser ou nova rodada Firefox requerida para esse módulo Node isolado. Evidência browser anterior da ADR-0030 continua histórica.

## Próximo passo

Integrar diretório ao serviço sintético com desafio ligado à sessão/operação, sem expor emissor/pin/revogação de controle como rotas públicas. Checar vínculo durável em cada operação de conteúdo simulado, revalidar após awaits e cancelar sessões/entregas quando vínculo ou pin for revogado. Definir comportamento entre diretório e diário separados (não alegar transação distribuída) e testar reinício, corrida, sessão de outro usuário/dispositivo, replay e restore suspenso de qualquer componente.

Rotação da identidade com reconferência externa, recovery de privadas, OIDC/provedor/e-mail reais, proteção do diretório contra substituição pelo serviço e integração com obras continuam gates. Não promover E2EE/v4 nem mudar o servidor 4173 ou o responsivo aprovado. Nenhuma conta/credencial/envio/implantação foi realizada.

## Fontes primárias reconferidas em 2026-11-03

[SQLite transactions](https://www.sqlite.org/lang_transaction.html) para snapshots/BEGIN IMMEDIATE e [SQLite VACUUM INTO](https://www.sqlite.org/lang_vacuum.html) para snapshot de backup. Políticas de CAS, invalidação de desafios e restore suspenso são decisões internas da prova, sem auditoria externa.

Evidência final: 300 testes Node sem falhas/skips; nove cenários novos também aprovados isoladamente. Log `/tmp/writingroom-device-directory-node.log`. Browser/UI não foram alterados nem reexecutados nesta etapa.

Atualização posterior: ADR-0032 liga diretório à sessão/operação no modo sintético, com admissão síncrona sob reserva de escrita. Não cria atomicidade distribuída ou identidade real.
