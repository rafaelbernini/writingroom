# ADR-0026 — Diário transacional do compartilhamento sintético

2026-11-03. Aceita somente para prova isolada. Produto permanece alpha.20/studio-19. Não altera projetos 1–7, pacotes v1/v2/v3 ou a interface responsiva aprovada.

## Decisão e fronteira

`packages/sharing-spike/src/durable-authority.mjs` guarda um diário SQLite de comandos sintéticos. Reutiliza a política da ADR-0024 por reprodução validada em cada operação; não duplica a lógica de autorização em SQL. Não contém manuscrito, nome/título de cena, e-mail, privadas ou credenciais reais; apenas subjects/IDs sintéticos, seleção, capacidades, prazos, eventos e recibos. Campos extras de projeto/cena/convite são descartados antes de persistir. Não integra o servidor 4173 e não oferece endpoint HTTP/OIDC/E2EE.

Prova exige `node:sqlite` (validada em Node v26.13.0); aplicativo continua Node 20+. Sem dependência nova. Testes dessa prova marcam skip explícito onde SQLite nativo não existe, sem fingir cobertura.

## Persistência e concorrência

Banco exclusivo criado com wx/0600 e schema próprio user_version=1: uma linha de domínio/identidades/suspensão e diário de sequence/payload/checksum. WAL, synchronous FULL, trusted_schema OFF e busy_timeout 500 ms. Formato desconhecido/inconsistente é recusado antes de configurar WAL; não há migração automática ou conversão da pasta de obras.

Cada mutação adquire BEGIN IMMEDIATE, lê um snapshot, reconstitui a política, valida o comando atual e insere um único evento, confirmando tudo junto. Falha/injeção antes de COMMIT reverte; matar o processo durante transação não publica seu evento. Leitores usam transação de snapshot. Outro escritor espera ou recebe erro de lock, sem sucesso fictício. Dois processos aceitando o mesmo token produzem um único recibo; repetição consumida retorna DENIED, não recria concessão nem devolve sucesso idempotente. Recibo durable grantId é externo; IDs internos da política reconstruída não são publicados.

Convite retorna segredo aleatório de 256 bits somente na criação; diário conserva SHA-256. Ao reproduzir, segredos internos novos ficam só em memória e são mapeados ao hash externo; nunca são equivalentes ao token entregue ao chamador. Datas históricas são reproduzidas nos tempos dos eventos e a operação atual verifica o relógio atual. Expiração e revogação continuam checadas em cada operação. Prévia e aceite não compartilham autorização em cache. As identidades são fixas na criação do diário.

Limites: 2000 eventos, 1 MB de payload acumulado, 64 KB por evento, arquivo de entrada até 8 MB; política original mantém 100 identidades/obras, 200 cenas e 1000 convites. Eventos/recibos não são podados. Reconstituição é linear por operação; não é projeto de escala/latência de serviço. Banco e backup contêm metadados em claro; checksum detecta corrupção acidental, não adulteração por atacante que pode reescrever o banco e seus checksums. Sem log inviolável/auditoria externa.

## Backup e recuperação

`backup(destination)` reserva novo arquivo exclusivo, usa VACUUM INTO para snapshot consistente inclusive com WAL ativo, verifica quick_check/schema/sequências/checksums/reprodução, ajusta 0600 e sincroniza arquivo/diretório. Retorna checksum SHA-256 do arquivo completo, que o chamador precisa guardar separadamente. Não sobrescreve destino, não copia apenas o arquivo principal ignorando WAL. Falha normal remove o destino que criou. Interrupção brusca durante backup pode deixar arquivo parcial: não tratar arquivo presente como backup válido; checksum e validação são obrigatórios.

`restoreDurableSyntheticAuthority(backup,newDestination,checksum)` lê bytes uma vez, verifica checksum fornecido e cria destino exclusivo. Valida a cópia e muda domínio para novo UUID, com suspended=1. Nenhuma restauração no banco ativo ou rebaixamento. IDs/recibos históricos permanecem para consulta, mas **toda autorização, nova concessão e mutação ficam bloqueadas**. Não há API de reativação nesta prova. Assim, backup anterior à revogação não ressuscita acesso. Recuperação futura exige reconferência e novo provisionamento explícito, ainda pendentes; não chamar a cópia suspensa de serviço recuperado para produção.

Domínio separa forks; não é deduplicação global. Sessões/códigos/CSRF não entram no diário/backup: um harness novo não aceita cookie antigo. O harness da ADR-0025 também limpa sessões e pré-logins se a época do domínio mudar. Dispositivo/chave revogados não ganham confiança por restaurar banco. Recibos de propostas do projeto e recibos deste serviço são estruturas distintas; nenhum remapeamento de cena autoral é aplicado porque o diário só contém IDs sintéticos e nunca é importado como obra.

## Evidência e próximos passos

Oito testes novos: reabertura/escopo/revogação e exclusão de segredos, rollback de aceite, backup/restore suspenso/checksum/destino existente, disputa entre dois processos, SIGKILL durante gravação, corrupção/schema desconhecido, revogação entre prévia e compromisso por outra conexão e cookie antigo após reinício com grant durável preservado.

Próximo: transporte HTTP separado com limites/parsing/Origin/CSRF/cookies realmente exercitados, mantendo emissor de fixture fora de rotas. Definir autorização de operação e tratamento de lock/erro sem enumerar usuários. Não abrir o servidor local, publicar fixture ou usar identidades sintéticas como login real. Reativação após recovery, testes adversariais adicionais de backup não confiável, OIDC/provedor, HPKE/binding/dispositivos continuam gates antes de manuscrito ou serviço real.

## Fontes primárias conferidas em 2026-11-03

- [Node SQLite](https://nodejs.org/api/sqlite.html): API nativa e suporte de DatabaseSync.
- [SQLite transactions](https://www.sqlite.org/lang_transaction.html): snapshot de leitura, escritor único e BEGIN IMMEDIATE.
- [SQLite VACUUM INTO](https://www.sqlite.org/lang_vacuum.html): snapshot de banco ativo em arquivo separado. Reserva exclusiva, checksum e sincronização complementar são decisões desta prova.

Regressão executada: 266 testes Node sem falhas/skips; 21 cenários de compartilhamento isolados também aprovados. UI não alterada; Firefox não reexecutado nesta etapa. Log `/tmp/writingroom-durable-sharing-node.log`.

Atualização posterior: transporte HTTPS isolado entregue na ADR-0027, que autoriza exclusivamente esse adaptador loopback sobre o harness. Emissor de fixture permanece fora da rede; proibição de integrar ao servidor 4173 preservada. Verificação de cookies em navegador continua pendente.
