# ADR-0021 — Pacote editorial offline por frase secreta, versão 1

Data: 2026-11-03. Estado: aceita para primeiro incremento local; sem auditoria criptográfica independente. PRO-013/014/016 parcialmente atendidos; identidade autenticada e devolutivas continuam pendentes.

## Objetivo e fronteira

Selecionar cenas da obra, revisar a projeção exata, cifrar um arquivo e abri-lo em staging antes de criar uma nova obra independente. Não enviar arquivos ou mensagens, sobrescrever original, importar devolutivas ou simular permissões. Sem mudança do schema de origem. Abrir cópia usa schema 1/2 existente, novos IDs e nenhum vínculo remoto. Rollback: conservar origem e arquivo cifrado, ignorar a cópia nova; não há conversão do original.

Usar APIs nativas `node:crypto`, sem dependência nova: AES-256-GCM, chave de 32 bytes derivada por scrypt assíncrono (N=131072, r=8, p=1, maxmem=192 MiB), salt aleatório de 16 bytes, IV aleatório de 12 bytes e tag de 16 bytes. Parâmetros são fixos e validados antes da KDF; uma operação criptográfica por instância, concorrentes recebem 429. scrypt preserva compatibilidade com Node 20 sem dependência nova; Argon2 não foi adotado neste incremento. Primitivas consultadas na documentação oficial Node 26.13.0 e OWASP em 2026-11-03, links abaixo. Não implementar algoritmos próprios. Node 20+ permanece requisito de runtime; novo fluxo validado no Node 26.13.0.

## Segredo, identidade e recuperação

Frase de 16–256 unidades UTF-16, até 1024 bytes UTF-8; não aparar/normalizar silenciosamente. Mínimo de comprimento não garante entropia: recomendar frase longa e exclusiva. Confirmação na exportação. Sem geração/reutilização automática ou gravação em perfil, obra, logs, localStorage, backup ou arquivo. Envio da frase ocorre por outro canal escolhido pelo usuário; app não envia. Quem possui a frase pode abrir e forjar pacotes: AEAD autentica integridade sob a chave, não identidade civil, remetente ou e-mail. Destinatário declarado deve coincidir exatamente (após trim) com o informado na abertura, apenas para evitar enganos, sem constituir autorização.

Sem recuperação de segredo pelo app. Perda da frase exige nova exportação pela origem preservada; o arquivo antigo fica inacessível. Não há revogação/expiração criptográfica de arquivo entregue nem prevenção de cópia. Não chamar este fluxo de E2EE. Criptografia ocorre no processo local: navegador envia seleção/frase em HTTP loopback; host, navegador, processo e SO são fronteira confiável. Máquina comprometida/memória/swap e processo local hostil estão fora da proteção. Cópia importada e seus backups são JSON em claro, como as obras existentes; UI informa antes de confirmar.

## Contrato externo

Arquivo JSON UTF-8 `.wroom-package.json`, nome de download genérico. Campos exatos: `format=writingroom-encrypted-package`, `version=1`, `cipher=aes-256-gcm`, `kdf={name:scrypt,N:131072,r:8,p:1,salt:<base64>}`, `iv`, `ciphertext`, `tag`. Base64 estrito/canônico. Sem título, nomes, datas, destinatário, IDs de obra, paths ou segredo em claro. Tamanho e parâmetros permanecem visíveis. Header AAD é JSON em ordem fixa de format/version/cipher/kdf/iv, reconstruído após validação; rejeitar campos extras/versão/algoritmo/parâmetros desconhecidos. Tag verificada por `decipher.final()` antes de JSON.parse/prévia; texto de update não é liberado em falha. Chaves JSON duplicadas (inclusive escapadas) são rejeitadas antes do parse. Sem compressão/ZIP ou execução de entrada.

## Projeção interna e privacidade

Payload exato: `format=writingroom-editorial-content`, `version=1`, `id`, `created_at`, `kind=reading-copy`, `sender`, `recipient`, `title`, `scenes` ordenadas. Cada cena: `id` opaco exclusivo do pacote, `title`, `text`, `rich_document` opcional. Título e identificações escolhidos explicitamente, não herdados do perfil. Seleção explícita de 1–200 cenas visíveis do Manuscrito, na ordem da árvore. Não seguir refs ou filhos futuros; não exportar paths, pesquisa, anexos, notas de inspetor, sinopses, metadados, perfil, acompanhamento, coleções, traduções originais, snapshots, propostas ou comentários privados. Texto/título escolhidos e links/notas de publicação presentes neles podem conter dados privados: prévia integral antes de cifrar.

Formato visual preserva marcas suportadas e notas de publicação; remove marcas `comment` e valida projeção textual. A API reconstrói por allowlist; nunca aceita um backup arbitrário como pacote. Hash da prévia abrange opções, IDs de origem e conteúdo selecionado, inclusive dados visuais antes da remoção: mudança relevante impede exportação (409), exige nova prévia. Mudanças em campos excluídos não ampliam escopo. IDs/datas do pacote são criados apenas ao cifrar.

## Limites, staging e confirmação

Até 8 MB de payload em claro, 11 MB de arquivo cifrado, 12 MB de request de abertura e 200 cenas; título 180 caracteres, identificação 100, texto 1,5 MB/cena. Parser JSON estrutural limita profundidade antes do parse; valida schema visual (profundidade 32/20 mil nós). Não há parâmetros de alocação escolhidos pelo arquivo. Sem extração de caminhos/links ativos, HTML é exibido como texto, links não são buscados automaticamente.

Abertura autenticada/validada retorna prévia e token aleatório, não cria projeto. No máximo 4 entradas em memória por servidor, TTL de 5 minutos; expiradas são removidas no próximo acesso e por timer. Nenhuma frase/chave/cifra mantida no staging. Cancelar remove entrada. Reiniciar servidor perde staging. Confirmar exige token+confirm=true, fila e cria nova obra somente do payload validado. Repetir o mesmo token retorna a mesma obra enquanto válido; não remescla. Reabrir arquivo em novo staging pode criar outra cópia (declarado na UI), sem idempotência durável global ou alegação de proteção de replay de devolutiva. Erro de gravação preserva staging para retry; fonte e arquivo recebido permanecem intactos. Falhas de parse/AEAD usam mensagens fixas, sem conteúdo/segredo/stack.

## Verificação e próximos contratos

Testes: seleção, allowlist/adversarial, plain/visual/notas/comentários, CAS, salt/IV únicos, senha incorreta, cabeçalho/tag/cifra adulterados, truncamento, versão/KDF/base64 inválidos, limites/profundidade, identidade declarada divergente, staging cancelamento/expiração/capacidade/repetição e falha de escrita; HTTP Host/Origin/limites/429; Firefox prévia, download, erro, cancelamento, nova obra, mobile; cópia privada restaurada preservando origem.

Não há grants verificáveis, assinatura/chave pública, convite/e-mail, devolutiva ou base reconciliável entre obras. Antes de implementar esses recursos: contrato versionado separado, identidades/chaves, rodadas, proveniência persistida e backup/migração, deduplicação durável, comparação/conflitos de base e revogação. Não promover PRO-AC-06–09 como concluídos por este incremento.

Fontes consultadas em 2026-11-03:
- [Node crypto: scrypt, createCipheriv, setAAD, getAuthTag e decipher.final](https://nodejs.org/api/crypto.html).
- [OWASP Password Storage: parâmetros scrypt](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- [OWASP Cryptographic Storage: AEAD, aleatoriedade e separação de segredos](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html).

Evidência executada ao encerrar alpha.16: 221 testes Node sem falhas/skips e 116 fluxos Firefox (85 amplos, 9 de redline, 11 Editor, 11 pacote). Caso privado: 48 cenas/1.954.433 bytes em cópia restaurada, textos e backup-base preservados. PROGRESS registra alcance e artefatos. Não representa auditoria externa.
