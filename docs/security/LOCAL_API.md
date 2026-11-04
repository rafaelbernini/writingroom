# API local — limites e verificações

Atualizado em 2026-11-02. Escopo: protótipo Node/JSON, monousuário, loopback. Não é serviço público nem mecanismo de autenticação completo.

## Fronteira de confiança

A execução normal (`npm run dev`) escuta somente em `127.0.0.1`. Host deve ser exatamente `127.0.0.1:<porta>` ou `localhost:<porta>`; Origin, quando fornecido, deve corresponder a uma dessas origens HTTP completas. Contexto `Sec-Fetch-Site: cross-site` é rejeitado. A validação inclui arquivos estáticos. A porta efetiva vem de `server.address()`, permitindo porta efêmera nos testes.

Clientes locais sem Origin continuam permitidos. Um processo local que pode forjar cabeçalhos não é isolado por estas verificações; não há autenticação por token. Host restringe rebinding de DNS; Origin/Fetch Metadata/JSON restringem chamadas originadas de sites externos, mas não substituem permissões do sistema operacional. O servidor não anuncia CORS.

## Entrada e caminhos

- POST exige `application/json` e um objeto não nulo, não array.
- Payload limitado a 2.000.000 bytes, somados nos buffers antes de decodificar UTF-8.
- Métodos, ações, formatos de exportação e rotas são listas explícitas.
- Rotas de projeto usam UUID no formato exato; paths não são fornecidos pelo cliente.
- O diretório do projeto e `project.json` não podem ser links simbólicos; identidade no arquivo deve corresponder ao nome da pasta.
- Há uma janela entre `lstat` e abertura. Não há defesa contra um processo local hostil que altera arquivos simultaneamente com os mesmos privilégios, nem contra links em ancestrais da base escolhida pelo operador. Não alegar sandbox completo do filesystem.

## Gravação e conflitos

Cada servidor mantém uma fila por projeto, cobrindo leitura, execução e gravação. GET do projeto/busca/exportação também passa pela fila. Projetos diferentes possuem filas independentes. Uma rejeição não bloqueia permanentemente a fila.

GET/criação retornam `document_hashes`, calculados em SHA-256 sobre o texto UTF-8, sem persistir esse campo. POST de `text`, `snapshot` e `restore-snapshot` exige `base_hash`:

- 428: hash ausente ou inválido; reabrir antes de gravar.
- 409: conteúdo atual difere da base conhecida; nenhuma mutação é gravada.
- 200: comando e gravação concluídos no protocolo JSON existente.

O frontend usa o hash da última confirmação, atualizado na ordem de sua fila. Após falha/conflito, mantém texto local e bloqueia navegação interna e novos envios de texto até o usuário preservar a edição e reabrir. Não há resolução de conflitos automática, merge, retry ou cache durável de recuperação.

Esse CAS é **por conteúdo**, não revisão monotônica: editar A→B→A não é distinguível de A sem edição. Metadados/estrutura ainda podem receber alterações válidas de duas sessões em sequência sem revisão de base. A fila não se estende a outro servidor, CLI ou aplicativo que escreva na mesma pasta. Não abrir o mesmo projeto em dois processos escritores.

Temporários têm UUID e abertura exclusiva (`wx`), fsync do arquivo e rename. Falhas removem somente o temporário da operação. Isso evita colisão de nomes e arquivos parciais nos cenários testados; não evita sobrescrita semântica por outro processo nem garante durabilidade pós-queda, pois ainda não há fsync do diretório/journal/lock.

## Erros, biblioteca e diagnóstico

Erros públicos de I/O são genéricos: sem stack, caminho absoluto, fragmento de JSON ou manuscrito. JSON malformado recebe mensagem fixa. Não há logging de payload, texto, nomes ou caminhos nas rotas. Inicialização registra somente a URL local; falha de inicialização usa mensagem genérica.

`listProjects` preserva entradas que falham como `state: unavailable`, com identificação pela pasta e orientação de recuperação. Não lê nomes/texto do arquivo inválido para construir o diagnóstico público. A UI mostra “Precisa de atenção” e não tenta editar essa entrada. CLI/listagem mantêm o formato array, com campos adicionais `state/error`. Nenhum arquivo é reparado ou convertido automaticamente. Não é uma interface de recuperação completa nem abertura read-only de schema futuro.

## Evidência e pendências

`packages/core/test/http.test.mjs`: ciclo completo, concorrência, hash desatualizado, fila após rejeição, Host/Origin, métodos/JSON/bytes, erros de projeto, symlink e identidade. `storage.test.mjs`: colisão de temporários e cleanup de falha no rename. `web.test.mjs`: hashes em sequência e edição preservada após falha, além de biblioteca e flush.

Testado em Linux/Node 26. Não foram executados testes de crash, dois processos escritores, Windows/macOS, leitor de tela ou navegador real. Concluir ADR-0002, lock, revisão monotônica, backups verificáveis e recuperação antes de anunciar G1. Fuzzing, limites de tamanho do arquivo em disco e contenção de recursos também permanecem pendentes.

## Ampliação alpha.2

`/api/status` anuncia `studio-1`. Cliente incompatível mostra reinício e impede ações. `/api/restore` aceita backup JSON com checksum/schema válido e grava apenas novo UUID; root/node/document/snapshot IDs conhecidos são remapeados. Hash detecta corrupção, não autentica origem. Sem destinos/paths arbitrários do usuário.

Ações novas: settings, inspect-import (sem save), import (agregado clonado/validado antes de commit), split (hash de base e snapshot anterior), compile e backup. Export HTML escapa todo texto/título/autor; fonte/clipboard não vira innerHTML. Importação não executa Markdown/HTML e não abre arquivos locais pelo path recebido.

Requests de import/preview: 10 MB para acomodar escapes JSON; conteúdo UTF-8 efetivo limitado a 1,5 MB/200 cenas. Restore: request até 33 MB, arquivo na UI até 32 MB; demais requests continuam 2 MB. UI usa File API e decodificação UTF-8 estrita.

localStorage armazena texto não confirmado por origem/projeto/documento; remove somente após ack correspondente ao mesmo conteúdo, preservando rascunho mais novo. Recuperar/conflito requer ação explícita e snapshot do disco. Não é cache criptografado nem garantia de recuperação se o navegador apagar dados. Nota/metadados sem confirmação exigem download de recuperação e recarregar. Não fazer retry cego de importação/divisão/criação após confirmação perdida.

Firefox smoke usa somente perfil/pastas/downloads temporários e dados sintéticos; as capturas não contêm manuscrito real. Não houve envio para serviços externos. Não há auditoria completa de navegador/OS nem mudança do limite de confiança de processos locais.

## Alpha.3 — revisão, caderno e saída binária

`studio-2` é o protocolo atual. A substituição usa uma prévia com fingerprint de consulta, escopo e textos/offsets. Aplicação recalcula a prévia sob a fila do projeto e rejeita 409 antes de mutar se diferir. Snapshot/resultado são gravados juntos no agregado. Busca literal com caracteres escapados, 5000 ocorrências, 300 caracteres de busca, 10 mil de substituição e saída até 1,5 MB/cena; nenhum regex do usuário é executado.

Coleções e capturas exigem hashes derivados dos respectivos campos; conflito não sobrescreve outra versão. IDs de coleção/documento são validados e referências remapeadas na restauração. Capturas/fichas ficam fora da compilação por padrão; remover referência de coleção não remove documento. Esses hashes complementam, mas não substituem revisão monotônica/lock de produção.

DOCX/EPUB são ZIP store-only gerados internamente, sem macros, scripts, recursos remotos ou caminhos recebidos do usuário. XML é escapado; controles inválidos são rejeitados. Limites de 100 MB/5000 cenas. Não há importação de ZIP desses formatos nesta etapa. Validação externa usa somente arquivos/perfis sintéticos; LibreOffice não é chamado pelo servidor nem requisito de exportação.

## Alpha.4 — conteúdo semântico

Protocolo atual `studio-3`. Ações `rich-enable`, `rich-save`, `rich-disable` exigem `base_rich_hash` de texto+JSON. Cena visual rejeita ação textual; restauração/snapshot incluem hash visual. Schema estrito permite somente tipos/atributos conhecidos e links http/https/mailto, sem imagens/HTML/scripts. Paste lê text/plain antes de parser e drop é bloqueado. `rich-save` aceita request até 3 MB; documento JSON até 2 MB, texto até 1,5 MB, profundidade 32 e 20000 nós.

Primeira gravação visual eleva projeto 1→2 apenas depois de backup integral com bytes originais, envelope restaurável e manifesto, todos verificados. Destino de backup é configuração do servidor, não path recebido da API. Falha deixa arquivo de projeto intacto; não há downgrade ao voltar a texto. Hashs/backup não resolvem concorrência entre processos escritores.

Render/HTML/EPUB serializam o schema permitido; DOCX produz elementos/relationships seguros de links externos. Texto legado permanece escapado e literal. Busca/substituição inclui formatação no fingerprint; ocorrência entre blocos visuais é explicitamente não suportada.

## Alpha.5 — marcas de revisão

Protocolo `studio-4`, mesma API rich-save/hash. Marcas comment/footnote têm identidade n-UUID, corpo texto simples (4000 caracteres), resolved booleano para comment. Máximo 1000 identidades/documento; metadados da mesma identidade devem coincidir em todos segmentos. Limites globais visuais/request continuam ativos. Corpo não executa HTML, scripts ou Markdown na UI.

Comentários são confidenciais em relação à publicação: não entram no preview de livro/HTML/TXT/MD/DOCX/EPUB/impressão. Permanecem no projeto, snapshots, backup e recuperação. Não compartilhar backup supondo que seja só manuscrito publicado. Notas de publicação são exportadas explicitamente. Impressão aguarda conclusão do preview; harness intercepta print para conferir conteúdo, sem afirmar validação de paginação. ADR-0009 detalha o contrato.

## Alpha.6 — anexos incorporados

Protocolo studio-5. POST attachment-preview valida sem gravação; attachment-add exige expected_sha256 da prévia e base_hash da biblioteca de anexos, rejeitando confirmação obsoleta. Request até 12 MB para base64 de arquivo até 8 MB. Agregado formato 3: até 100 anexos, 16 MB de bytes e 30 MB serializado; backup UI até 32 MB/request 33 MB.

GET asset?id=<UUID> recebe somente identidade de anexo do projeto aberto, nunca path. Host/Origin/JSON/CSP existentes continuam. Resposta binária com nosniff/no-store e Content-Disposition com nome codificado; preview=1 é inline somente para PNG/JPEG. PDF e texto continuam attachment (texto é exibido via textContent na UI). Sem embed/iframe PDF, HTML/SVG, URLs de origem ou execução de Markdown.

MIME é derivado da extensão/assinatura; PNG verifica CRC/chunks e limites, rejeita APNG. JPEG percorre segmentos; ambos limitam dimensões/pixels. PDF verifica assinatura/terminador; não sanitiza nem certifica o conteúdo. Texto usa UTF-8 estrito e rejeita controles binários. Checksum/base64/tamanho/referência são validados na abertura/restauração. Bytes ficam no agregado, sem novos caminhos arbitrários ou arquivos externos ao backup.

Primeiro anexo migra 1/2→3 somente depois de cópia integral verificada. Falha impede save; clientes antigos rejeitam 3. Lixeira preserva bytes e bloqueia download até restaurar. Anexos não entram no livro e não podem receber include_in_compile=true. Backup/recuperação contém os arquivos originais e notas privadas; não é apenas publicação. Sem lock entre processos ou garantia nova de durabilidade de produção. ADR-0010.

## Alpha.7 — biblioteca e organização

Protocolo studio-6. project-archive/project-unarchive movem diretório validado para/de `.archived/<UUID>.wroom`, sem apagar conteúdo. Identidade, versão, symlinks e colisão de destino conferidos; arquivado não é atendido pela rota de escrita ativa. Fila do ID serializa com autosave da mesma instância, sem lock entre processos. Listagem `projects?archived=1` separada; erros públicos não revelam paths.

project-duplicate usa backup/remapeamento existente com nome escolhido antes de salvar. duplicate-node clona subárvore/texto/rico/versões/anexos em agregado validado antes de commit. Respeita limites de anexos/projeto; coleções existentes não recebem novas referências automaticamente. Campo derivado structure_hash é removido na restauração/recuperação.

organize exige base_hash da árvore e destino por ID/placement before/after/inside. undo-organize exige hash resultante e estrutura anterior completa/validada; mantém conteúdo/metadata atuais e bloqueia árvore obsoleta. Não é revisão monotônica/histórico persistente. Arraste de UI aceita somente ponteiro na alça interna; não abre arquivos/paths/HTML nem importa dados externos. Editor continua bloqueando drop arbitrário de conteúdo. Sem contas ou tráfego remoto novos.

## Alpha.8 — perfil privado, catálogo e fontes

Protocolo studio-7 e status com formatos suportados 1/2/3/4. GET catalog devolve 16 scaffolds declarativos; criação aceita IDs/preset permitidos e autoria explícita, sem ler/copiar contatos do perfil. Metadados de tipo em novos projetos não reestruturam obras existentes.

GET/POST profile é local e separado das obras, serializado na instância com base_hash/CAS. Arquivo `.settings/author-profile.json`, diretório criado 0700/arquivo 0600, bloqueio de symlink, temporário exclusivo/fsync/rename. Request até 32 KB; campos/versionamento estritos. profile-preview valida/gera envelope com checksum sem salvar; importar perfil exige checksum e hash atual. UI aceita arquivo de perfil até 30 KB. Perfil não é login, não é cifrado e não recebe API keys. Export/restore de projeto não inclui esses dados; nome de publicação só é aplicado explicitamente.

POST source cria/edita fonte fora da publicação, com source_hashes derivados para evitar sobrescrever título/metadados obsoletos. Body/notas da fonte são independentes e não sobrescritos pelo formulário. URLs somente http/https sem credenciais/controles; não há fetch. Data histórica é texto livre; acesso em ISO válido. Até 100 refs por ID para nós não raiz, sem órfãos/self/duplicação; refs para lixeira são mantidas e sinalizadas. Source refs remapeadas no restore/duplicação de subárvore; contatos de perfil não são vinculados como fontes.

Primeira fonte eleva 1/2/3→4 após backup integral verificado; rich/assets preservam maior formato. Falha impede save. Fontes não entram em compilação e include_in_compile=true é rejeitado. Nenhum serviço remoto, leitor PDF, IA, convite ou criptografia editorial foi ativado. Hash/CAS não substitui lock/revisão monotônica entre processos.

## Alpha.9 — central e rotina de backup local

Protocolo studio-8. GET backup-center retorna política/hash, estado, destinos preconfigurados e até 200 gerações por filtro project_id. POST settings exige base_hash/CAS, campos/versionamento e destinos conhecidos. APIs create/verify/restore/download aceitam somente IDs de destino/projeto/geração, nunca paths recebidos do cliente. Respostas da central podem mostrar o path configurado como informação explícita da UI; erros continuam sem stack/segredos.

Root gerenciado é separado das migrações, com subpastas UUID e backup.json/manifest.json. Limite 32 MB, lstat/symlink/identidade, bytes/hash/envelope/schema conferidos. Temporário exclusivo 0600/diretório 0700, releitura e rename antes de confirmar. Histórico diz verificada na criação; verificar/restaurar/baixar releem os arquivos. Corrupção bloqueia restore, origem e gerações existentes permanecem.

Rotina global desligada por padrão, apenas projetos ativos, intervalo permitido e retenção 2–50. Ordem de fila central→projeto evita deadlocks com autosave na instância. Sem alterações, verifica cópia anterior antes de reaproveitar. Retenção só após nova geração válida, somente automáticas verificadas sem arquivos inesperados; manuais/migrações/corrompidas/incompletas não são removidas. Configuração inválida interrompe a rotina; não substituir arquivo por defaults. Estado auxiliar/retencão com falha gera aviso, sem apagar nova cópia válida.

Destinos configurados por factory/WRITINGROOM_BACKUP_DESTINATIONS, não escolhidos arbitrariamente via HTTP e sem permitir destino dentro de pasta .wroom. Backup pode conter todo o material privado do projeto, mas não o perfil separado/chaves; não é E2EE. Timer só com servidor ativo, sem garantias de OS/energia/múltiplos processos. Testes de browser/HTTP fixam destinos dentro dos próprios diretórios temporários, sem herdar paths reais do ambiente. G1 não foi aprovado por esta entrega.

## Pacote cifrado local — alpha.16

GET `projects/:id/package-candidates` lista somente cenas visíveis do Manuscrito. POST `package-preview` deriva projeção por allowlist, sem gravar. POST `package-export` exige hash de prévia e frase/confirmacão, retorna envelope sem gravar a origem. POST `/api/packages/open` aceita JSON até 12 MB contendo arquivo textual até 11 MB, frase e destinatário declarado; confere envelope/AEAD/schema antes de staging (5 min, 4 entradas). POST `confirm` exige token+confirm=true e cria somente obra nova; `cancel` remove staging. Token não autoriza acesso remoto nem autentica pessoa. Rotas mantêm Host/Origin/Fetch Metadata/JSON/loopback e no-store. Sem segredos na URL ou logs.

KDF fixa scrypt N=131072/r=8/p=1, maxmem 192 MiB, uma operação por instância; concorrência recebe 429. Pacote adulterado/senha incorreta tem erro genérico 400, sem decifração parcial pública. Cabeçalho/versão/algoritmo/parâmetros/base64/chaves duplicadas/profundidade/tamanho são validados antes da KDF. Conteúdo válido limitado a 8 MB/200 cenas. Staging só em memória; reinício o perde. Repetir o mesmo token confirmado retorna mesmo ID enquanto válido; nova abertura pode gerar outra cópia. Ver ADR-0021 para limites e identidade declarada. Obra importada/backups permanecem JSON em claro.

## Identidades e pacotes assinados — alpha.17

GET `/api/identities` fornece cartões, estados ativa/inativa, pins e hash CAS; nunca retorna chave privada cifrada ou frase. POST `/api/identities/create|restore|backup|trust-preview|trust|revoke` usa JSON até 20 KB. Backup de chave é a ação explícita que retorna o registro privado já cifrado. Restauração limita arquivo a 8 KB e verifica AEAD/Ed25519 privada correspondente antes da gravação. Cartão até 4 KB. Arquivo de estado até 128 KB, cinco identidades e cinquenta contatos, em `.settings/editorial-identities.json`; symlinks/corrupção não viram estado vazio. Operações mutáveis exigem CAS e fila de identidade; criar/restaurar partilha o limite global local de KDF com pacotes. Troca ativa exige fingerprint anterior.

POST de preview/export de pacote aceita `signature_mode=signed`, hash da identidade e fingerprints ativos/conferidos. V2 assina header+envelope inteiro. `/api/packages/open` verifica pin, assinatura e destinatário local antes da KDF. `require_signature=true` rejeita v1; flag omitida mantém compatibilidade da API legada. V2 inválido nunca faz fallback. Confirmação de staging verifica novamente revogação. Verificação usa contato previamente pinado, não confia na chave vinda sozinha no arquivo. A nova obra é independente e não recebe log assinado/proveniência autenticada. Loopback/Host/Origin/CSP/no-store mantidos; sem rede externa, segredos na URL ou logging de payload.

## Rodadas/devolutivas — alpha.18

Projetos aceitam schema 1–7. POST por obra: `round-preview`, `round-create`, `round-offer-preview/export`, `round-return-preview/export`, `round-close`. Preview não grava. Primeira criação exige backup de migração verificado para 7; arquivo só é retornado após salvar a rodada. Reexportar preserva base/IDs da rodada. Fechar usa `round_hashes` derivado como CAS, sem decidir pendências existentes. Acompanhamento e demais recursos preservam schema 7.

POST `/api/round-packages/open|confirm|cancel` tem limites 12 MB para abrir/1 KB para token. V3 verifica pin/assinatura/kind/participantes antes da KDF; devolutiva exige UUID explícito da obra e rodada owner aberta. Staging de rodada guarda até 4 entradas por 5 minutos, além das legadas. Confirmação usa fila por token/obra e revalida confiança e hashes. Nova entrada exige backup manual verificado no destino da central e grava agregado de propostas+recibos, sem alterar texto. Releitura antes da gravação recusa mudança durante o backup; exclusividade entre processos continua não garantida. Cancelamento/expiração antes do compromisso final impedem gravação; UI protege confirmação já em gravação contra cancelamento. Falha de checkpoint mantém o projeto intacto.

Recibos pertencem ao backup, IDs externos estáveis e IDs locais remapeados. Mesmo ID/hash é no-op, mesmo ID com outro hash falha. Replay após aceite/restart/restore com recibo não duplica; backup anterior/forks não constituem registro global. Sem E2EE, autenticação de e-mail ou permissão remota. API continua monousuário/loopback/Host/Origin/CSP/no-store e não envia e-mails/arquivos. Assinatura/confiança não implica que qualquer nome declarado seja identidade verificada.
