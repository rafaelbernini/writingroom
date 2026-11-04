# ADR-0022 — Identidades locais por chave e pacotes assinados

2026-11-03. Aceita para incremento offline alpha.17, sem auditoria externa. Complementa ADR-0021; não implementa rodadas/devolutivas, autenticação de e-mail, grants ou E2EE.

## Incremento e decisão

Antes de persistir base/rodada de devolutiva, estabelecer uma identidade de chave verificável. Usar Ed25519 via `node:crypto` (`generateKeyPair`, SPKI DER público, PKCS8 DER privado, `sign/verify` com algoritmo null), conforme [documentação primária Node](https://nodejs.org/api/crypto.html), consultada em 2026-11-03. Sem dependência nova. Nome permanece declarado; assinatura prova controle da chave no momento da assinatura. Confiança depende da comparação da impressão SHA-256 completa do SPKI por canal independente. Não autentica identidade civil/e-mail nem resolve verificação por canal comprometido.

Preferir um incremento completo de chaves/assinatura/recuperação, depois contrato de rodadas. Não ligar cópias v1/v2 ao original por título ou texto. Nenhuma nova persistência nas obras, nenhum novo schema de projeto. Rollback: preservar pasta de preferências e backups cifrados de chave; app anterior continua lendo obras e pacotes v1, mas não v2. Não converter v2 em v1 silenciosamente.

## Armazenamento e recuperação

Arquivo separado `WRITINGROOM_HOME/.settings/editorial-identities.json`, criado com diretório 0700/arquivo 0600, escrita temporária exclusiva, fsync/rename e CAS. Sem symlink de base, pasta de configurações ou arquivo. Limite 128 KB, até 5 identidades locais e 50 contatos. Arquivo inválido não é resetado/reparado. Hash do estado evita substituição concorrente. Fila local por estado; segue limite de um trabalho de KDF por servidor. Não há lock entre processos ou proteção contra processo hostil com mesmos privilégios.

Chave privada é sempre cifrada antes de salvar: AES-256-GCM, scrypt fixo N=131072/r=8/p=1/maxmem=192 MiB, salt 16, IV 12 e tag 16 bytes aleatórios. AAD inclui versão/formato, nome declarado, chave pública, impressão, data e parâmetros. Segredo só por operação; não manter sessão desbloqueada, guardar frase em projeto/backup/localStorage/logs ou enviá-la na URL. Buffer privado/derivado é limpo ao final quando controlável; JavaScript/OpenSSL/OS não garantem apagamento de toda cópia de memória/swap. Cliente/processo local continuam confiáveis.

Backup `.wroom-key.json` exporta registro da própria identidade com PKCS8 cifrado, metadados e chave pública. Não inclui contatos ou manuscrito. Restauração exige frase correta, valida AEAD e chave Ed25519 privada correspondente ao SPKI/fingerprint, antes de persistir. Troca da identidade ativa exige confirmação do fingerprint ativo; anterior fica preservada/inativa. Nunca substituir silenciosamente a chave sob um mesmo nome. Até 5 identidades; não apagar antigas para contornar limite. Backup cifrado sem frase não recupera chave. Frase perdida sem outra cópia utilizável: gerar outra identidade e refazer conferência externa com participantes; não fingir recuperar assinatura antiga.

## Cartões e contatos

Cartão público `.wroom-public-key.json`: campos exatos `format=writingroom-public-key`, `version=1`, `name`, `public_key` SPKI DER base64 canônico Ed25519, `fingerprint` SHA-256 hex minúsculo. Não contém segredo. Na importação, prévia sem gravação; confiança exige usuário informar a impressão completa confirmada por outro canal, comparada ao SPKI recalculado. Não preencher a confirmação automaticamente a partir do arquivo. Conferência é declaração do usuário, não alegação de que o app verificou o canal.

Identidades locais: registros cifrados e estado ativa/inativa. Contatos: cartão validado, `verified_at` local e `revoked_at` opcional. Revogar mantém pin histórico e bloqueia novas exportações/aberturas/confirmações por aquela chave nesta instalação. Sem revogação remota/retroativa ou impedimento de cópia. Pin revogado não é reativado; substituição exige nova chave e nova conferência. Nome igual não transfere confiança à chave nova. Backup/restauração de obra não carrega contatos/chaves. Backup de chave também não restaura confiança em contatos.

## Pacote assinado v2

Envelope externo novo, sem alterar v1: campos exatos `format=writingroom-signed-editorial-package`, `version=2`, `algorithm=ed25519`, `sender_public_key`, `sender_fingerprint`, `recipient_fingerprint`, `envelope` (v1 cifrado da ADR-0021) e `signature` (64 bytes base64). Header e envelope inteiro são serializados em ordem fixa e prefixados por domínio ASCII `WritingRoom signed editorial package v2\n`. Reordenação lexical não muda o significado; campos desconhecidos/duplicados, formatos ou chaves não canônicas são rejeitados. Assinatura cobre destinatário, chave de remetente, parâmetros KDF/AAD, cifra e tag. Metadados externos novos revelam fingerprints/chave pública e permitem vinculação entre arquivos; UI informa antes de exportar.

Exportação assinada exige identidade ativa, frase de desbloqueio da chave, destinatário com pin conferido não revogado e hash atual das identidades. Prévia vincula assinatura, fingerprints e estado ao conteúdo escolhido. Chave privada aberta somente para a operação; não sai da API. Não permitir trocar/remover assinatura após prévia sem nova conferência.

Na abertura: parse limitado, campos/chaves/algoritmos validados, fingerprint recalculado, pin do remetente conhecido não revogado, destinatário entre identidades locais e assinatura verificada **antes** da KDF/decifração do conteúdo. Não confiar automaticamente no SPKI vindo no arquivo. Antes de confirmar staging, revalidar pin/revogação/destinatário. Exibir nome declarado no conteúdo separadamente do nome do contato e fingerprint conferidos. Verificação ocorre na abertura; nova obra independente não ganha autoria autenticada nem log assinado. Arquivo recebido preserva a assinatura para nova verificação; histórico de proveniência por obra é contrato futuro.

Confidencialidade ainda depende da frase secreta compartilhada do pacote; assinatura não cifra para a chave pública do destinatário. Fingerprint destinatário é roteamento autenticado pela assinatura, não garantia criptográfica de leitura exclusiva. Qualquer portador da frase pode decifrar fora do app, mas não forjar a assinatura do remetente pinado. Não anunciar E2EE. Duas frases com funções separadas; recomendar segredos diferentes. Sem chaves de cifragem pública, grants ou serviço de identidade.

## Compatibilidade e downgrade

UI de abertura oferece “Exigir assinatura de chave conferida”, ligada por padrão. Para v1, usuário desliga explicitamente e vê “sem assinatura”; API v1 legada permanece compatível sem flag. Se `require_signature=true`, v1 é rejeitado. Pacote v2 inválido nunca é tratado como v1. Exportação continua oferecendo v1 explicitamente, sem assinatura; v2 exige escolha e pins válidos. Versões de obra 1–6 preservadas. Limites de 8 MB em claro, 11 MB de arquivo e 12 MB de request mantidos.

## Evidência exigida e próximos contratos

Testar geração/desbloqueio, DER/algoritmos/base64, chave privada trocada, backup cifrado/restore, frase errada/adulteração, CAS/arquivo inválido/symlink, rotação com confirmação, pin divergente/revogado/substituído, assinatura/tag/destinatário adulterados, downgrade, revogação entre staging/commit, segredos fora da API de listagem/backups de obra, falhas sem mutação, pacote v1 e cópia privada restaurada. Firefox: cadastro, cartão, conferência manual, assinatura, abertura e bloqueios, backup/restauração e mobile. Sem envios externos.

Depois: contrato de rodada/base imutável, proveniência e mapeamento de IDs, schema/migração de obra com backup, devolutivas assinadas e cifradas em staging, idempotência durável e conflitos. Não promover E1 completo ou PRO-AC-06–09 por assinatura de cópia independente.

Evidência ao encerrar: 231 testes Node sem falhas/skips, 127 fluxos Firefox (incluindo 11 novos), cópia privada restaurada de 48 cenas/1.954.435 bytes e recuperação de chave em instalação isolada. Origem e backup-base preservados; sem auditoria externa. PROGRESS registra alcance e artefatos.
