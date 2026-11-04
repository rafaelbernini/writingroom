# ADR-0023 — Rodadas imutáveis e devolutivas offline

2026-11-03. Aceita para alpha.18. Complementa ADR-0021/22; sem serviço de e-mail, E2EE ou auditoria externa.

## Contrato e limites

Obras passam a formato 7 somente na primeira criação de rodada, após backup integral verificado. Leitura aceita 1–7. `editorial_rounds` guarda até 10 rodadas, 12 MB no total e projeto até 30 MB. Cada rodada guarda UUID opaco estável, papel local owner/reviewer, estado open/closed, título/data, fingerprints owner/reviewer, hash agregado da base compartilhada e cenas congeladas. Cada cena guarda ID compartilhado opaco, título/texto/visual sem comentários privados, ID local da cena e hash textual/visual local na abertura. Nada vincula cópias independentes v1/v2 retroativamente ao original.

Owner mantém o mapa privado ID compartilhado → ID local/hash original. Hash da projeção pode diferir do original por exclusão de comentários; nunca substituir o hash original pelo compartilhado. Oferta só contém projeção allowlist da ADR-0021, participantes e base, sem IDs de obra/cena de origem, pesquisa, histórico ou chaves privadas. Manuscrito não muda ao criar rodada.

Novo wrapper versão 3 `writingroom-editorial-round-package`, algoritmo Ed25519, kind offer/return, fingerprints/chave pública e envelope AES-GCM/scrypt v1. Assinatura cobre header canônico e envelope inteiro com domínio `WritingRoom editorial round package v3\n`; verificação por pin antes da KDF. Primitivas e parâmetros da ADR-0022 mantidos; [Node crypto](https://nodejs.org/api/crypto.html) conferido nesta sessão. Assinatura de controle de chave, não autenticação civil/e-mail; frase compartilhada continua protegendo conteúdo, sem cifragem para chave pública. Fingerprints externos correlacionáveis. Oferta/devolutiva ligam participantes e kind também no payload autenticado, sem fallback para v1/v2.

Payload formato `writingroom-editorial-round`, versão 1. Oferta: kind, round_id, created_at, title, sender, recipient, owner_fingerprint, reviewer_fingerprint, base_hash e scenes (IDs opacos/títulos/textos/visual). Devolutiva: mesmos campos identificadores, return_id, proposals com UUID estável, scene_id, hash compartilhado, start/end/original/replacement/reason/author. Até 200 cenas, 1000 propostas/4 MB e 20 mil unidades UTF-16 por lado; payload 8 MB/arquivo 11 MB/request 12 MB. Campos exatos, profundidade/base64/Unicode/schema visual validados; sem caminhos, scripts, anexos ou comandos de estrutura/formatação arbitrários.

## Cópia de trabalho e propostas

Oferta conferida entra em staging; confirmação cria nova obra formato 7 com uma rodada reviewer e IDs locais novos, sem migrar a origem. Base compartilhada fica congelada nessa obra. `Propor alteração` sobre cena ainda idêntica à base da rodada acrescenta `exchange={round_id,proposal_id}` gerado localmente. Propostas posteriores a mudanças locais não são automaticamente associadas à base antiga. Devolutiva contém somente propostas pendentes associadas e texto/formatação local precisam continuar na base congelada; não transmitir edições livres como substituição silenciosa. Aceitar propostas na cópia não equivale a devolver sugestões. Snapshot/restauração permite recuperar a base, se disponível.

Exportar oferta novamente usa a mesma rodada e base. Assinar oferta/devolutiva exige identidade ativa exatamente igual à chave originalmente vinculada e pin de destino não revogado. Rotação de chave exige nova rodada; chaves inativas ainda permitem verificar/abrir ofertas antigas. Encerrar rodada owner impede novas ofertas/devolutivas/importações nessa origem, sem decidir propostas já importadas. Recebedor offline não aprende encerramento remoto até tentar devolver; não prometer revogação retroativa.

## Staging, comparação, conflito e confirmação

Até 4 prévias de rodada em memória por instância, 5 minutos, separadas das 4 prévias legadas; timer remove expiradas. Nenhum segredo guardado. Devolutiva exige escolha explícita da obra original; não descobrir destino por título ou aplicar a todas as cópias. Validar assinatura/pins/fingerprints/rodada/estado/base e escopo, comparar original/proposto e apresentar conflitos antes de confirmar. Confirmação repete verificações de confiança, rodada e hash local completo. Uma cena alterada (inclusive somente comentário/formatação) bloqueia o retorno inteiro sem mutação; não rebasear automaticamente. IDs conhecidos com conteúdo diferente são recusados. Erros e cancelamento preservam obra/pacote/histórico; confirmação nunca aceita texto, apenas cria pendências locais.

Antes de persistir uma importação nova na origem: backup manual integral verificado no destino selecionado da central de backup, mesmo em schema 7. Só então salvar propostas+recibos em uma escrita do agregado. Falha de backup/escrita não confirma a importação. Duplicatas conhecidas não exigem base atual nem criam outro backup/recibo/proposta. Prévia antiga não evita conflito no commit. Cada proposta é revalidada contra o intervalo compartilhado e os limites/anotações visuais do original atual, preservando comentários privados. Aceite posterior continua individual no redline e cria snapshot anterior.

## Idempotência, backup e restauração

Owner mantém recibos `{proposal_id,proposal_hash,review_id}` e importações `{return_id,hash,at}` no projeto. Mesmo ID/hash já importado não duplica nem reabre decisão, inclusive após restart e depois de texto alterado/aceito. Mesmo ID com hash diferente é rejeitado. Nova exportação pode gerar return_id novo, mas IDs de proposta permanecem estáveis; se todas forem duplicadas, não acrescentar histórico. Máximo 1000 recibos/importações por rodada. Não confundir hash com revisão monotônica; base ABA tem limites herdados do core.

`exchange.proposal_id` e round_id permanecem estáveis em backup/restauração, remapeando somente cena local e review_id dos recibos. IDs de snapshots/decisões continuam remapeados pelo fluxo existente. Rodadas/frozen bases/recibos entram no backup; chaves/pins globais não entram. Cópias restauradas/duplicadas são forks independentes que podem receber a mesma devolutiva por escolha explícita; o app não decide qual é o original por nome. Recibos presentes no backup impedem repetição; um backup anterior à importação, por definição, não conhece esse recebimento. Não alegar log inviolável ou idempotência global entre forks.

## Validação e rollback

Domínio/HTTP: ciclo entre duas instalações, plain/visual com comentário privado, replay após aceite/reabertura/backup, remapeamento, identidade/base/escopo trocados, IDs repetidos/adulterados, encerramento/revogação após prévia, falha de backup, schema 7 sem rebaixamento e pacotes legados. Firefox: criar/exportar rodada, abrir cópia, propor, exportar devolutiva, prévia/importar/aceitar, repetir sem duplicar, conflito e móvel. Livro privado somente em cópia restaurada. Rollback: manter formato 7 e restaurar backup pré-migração em obra separada para app antigo, nunca rebaixar número manualmente.

Próximo após validar este fluxo: revisar E1 e limites de recuperação/dispositivos/cifragem para destinatário antes de online autenticado. Nenhuma publicação de serviço ou envio de mensagem é autorizado pelos testes.

Evidência executada ao encerrar: 243 testes Node sem falhas/skips, 139 fluxos Firefox (12 novos de rodada/devolutiva) e 48 cenas privadas em cópia restaurada com migração/checkpoint verificados, aceite/snapshot e replay após restauração. Modelo-base original preservado. PROGRESS registra artefatos e limites; isto não representa auditoria externa.
