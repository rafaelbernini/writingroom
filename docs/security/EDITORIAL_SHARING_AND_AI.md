# Segurança proposta — colaboração editorial, pacotes e IA

2026-11-02. **Threat model e critérios prévios à implementação; não auditoria concluída.** Companion da [especificação profissional](../specifications/PROFESSIONAL_EDITORIAL_WORKSPACE.md). A alpha.18 oferece revisão local, cópias cifradas por frase (ADR-0021), assinatura por pin conferido (ADR-0022) e rodadas/devolutivas offline com base, recibos e conflito (ADR-0023). Sem conta, convite, E2EE ou IA contextual. O checksum do backup atual detecta corrupção; não cifra conteúdo nem autentica remetente.

## 1. Ativos e fronteiras

Proteger: texto inédito, histórico/trechos excluídos, comentários privados, fontes/anexos, propostas editoriais, identidade/pseudônimo/contato, carteiras de obras, instruções privadas de IA, credenciais e chaves. Separar:

- Dispositivo/workspace do autor.
- Dispositivo/workspace do editor.
- Serviço de identidade/convites, quando existir.
- Transporte/armazenamento de envelopes cifrados.
- Provedor de e-mail.
- Provedor de IA/pesquisa, acionado explicitamente.
- Artefatos de submissão exportados em formato convencional.

Na E2EE pretendida, texto e anexos são cifrados no cliente autorizado e só abertos em clientes destinatários. Serviço de transporte não deve possuir chave de conteúdo. Ainda pode observar e-mails/endereços de rede, existência de convites, tamanhos/horários e outros metadados especificados. Inventariar/minimizar esses dados; não prometer anonimato.

Não usar troca de modo de interface, caminho “pasta do editor”, parâmetro actor_id, conta do mesmo sistema operacional ou nome de arquivo como fronteira de segurança. Perfil local de demonstração não é usuário remoto autenticado. E2EE não protege uma máquina já comprometida ou uma captura feita por quem tem leitura legítima.

## 2. Identidade, e-mail e chaves

- Verificação de e-mail prova controle do endereço naquele fluxo, não identidade civil, competência editorial ou propriedade autoral.
- E-mail/senha/token de login não se tornam automaticamente chaves de conteúdo. Não derivar chave só do endereço; não guardar chave de decifração junto do pacote enviado.
- Conta/dispositivo registra chave pública por protocolo escolhido/revisado; destinatário tem a chave privada em armazenamento adequado. Troca de chave deve ser detectável e exigir confirmação/reverificação, impedindo substituição silenciosa por servidor comprometido.
- Validar destinatário, remetente, concessão e contexto da obra/base no envelope autenticado. Identidade declarada dentro do próprio arquivo não basta.
- Usar protocolos, primitivas e bibliotecas mantidos e auditáveis, com versões/licenças registradas; nenhuma criptografia caseira. Algoritmos/formato/KDF/nonce e assinaturas serão decididos em ADR específico e testados antes de uso real.
- Recuperação de conta e recuperação de chaves são fluxos distintos. Redefinir login não pode dar ao servidor acesso retroativo a obras E2EE. Perder dispositivos/chaves sem mecanismo recuperável pode perder acesso; o produto deve definir e exercitar recuperação antes do lançamento.

Uma modalidade manual/offline pode verificar chave por canal independente, mas não deve apresentar selo “e-mail autenticado” sem verificação real. O usuário escolheu pacote primeiro; o componente mínimo de identidade por e-mail permanece requisito do compartilhamento autenticado, mesmo sem colaboração online do conteúdo.

## 3. Convites e sessões remotas

Convites por destinatário e obra(s), com capacidades explícitas, estados, expiração e uso controlado. Abrir link não aceita convite automaticamente: leitores automáticos/scanners de e-mail não devem consumir a autorização. Aceite é ação autenticada explícita. Evitar enumeração de contas/obras, replay, phishing de convite e redirecionamento arbitrário.

Exigir proteção de sessão/callback/CSRF, limites de tentativa, expiração/rotação e transporte seguro no serviço remoto, conforme arquitetura validada. Tokens não vão para logs, dados do projeto ou links duradouros; não deixar segredo em query string de obra. E-mail transacional não inclui manuscrito, senha, chave privada ou material além da identificação mínima escolhida pelo remetente.

Não abrir o servidor atual `127.0.0.1` para terceiros nem relaxar Host/Origin/CSP para simular colaboração. API remota/dispositivos requerem fronteira própria de autenticação/autorização. Conectores do assistente não são mecanismo de login ou armazenamento do aplicativo distribuído.

## 4. Conteúdo mínimo compartilhado

Criar uma **projeção por allowlist** do escopo concedido. Não serializar o projeto inteiro para depois ocultar pastas no cliente. A mesma política vale a busca, thumbnails, diffs, trechos excluídos, snapshots, coleções, referências internas, anexos, caches, exportação, IA e mensagens de erro.

Excluídos por padrão: outras obras, pesquisa privada, lixeira, contatos, comentários internos não compartilhados, redlines antigas, histórico fora da rodada, instruções privadas de IA, laboratório, tokens e chaves. Dependências de um trecho (asset/nota/link) só entram se autorizadas; referência fora do escopo aparece como restrita/omitida, sem revelar seu conteúdo/título sensível. Manifesto da prévia mostra o que entra e o que é omitido.

Compartilhar várias obras usa concessões/chaves por obra ou subescopo conforme desenho validado, não chave mestra de toda a biblioteca. Permissão negada no domínio/API não pode ser contornada por trocar node_id, project_id, grant_id, URL de download ou exportador.

## 5. Pacotes editoriais/devolutivas

Formato próprio proposto, com versão, identificador único, remetente/destinatário, obras/base, concessão, inventário de assets, revisões e integridade autenticada. Cabeçalho externo contém apenas o mínimo necessário para abrir/verificar; nomes/sinopses privados ficam dentro da parte cifrada quando possível.

Importação em staging: limites de bytes/expansão/profundidade/quantidade, rejeição de paths/links simbólicos/entradas duplicadas e estruturas desconhecidas, decifração/verificação, checagem de concessão e só então apresentação do conteúdo. Nada é mesclado ou executado antes de validar. Falha limpa apenas temporários próprios, conserva pacote recebido/original e mostra mensagem sem segredo.

Propostas têm IDs idempotentes, base, identidade verificável e operações permitidas. Devolutiva com obra/base errada vai para conflito/quarentena, sem remapeamento aproximado silencioso. Conteúdo e marcas rejeitados permanecem recuperáveis conforme política explícita de retenção. Backup pré-merge e commit atômico obrigatórios. Aplicar proposta não pode conceder papel ou alterar credenciais.

## 6. Revogação, offline e cópias

Revogar bloqueia novos acessos/entregas e futuras chaves, conforme protocolo; revisar rotação de chaves/material remanescente. Não consegue apagar material/chaves já entregues, impedir screenshots ou garantir que um cliente offline obedeça a um prazo após receber o conteúdo. “Sem exportar” no app não significa prevenção de cópia.

Pacotes offline devem mostrar última verificação de identidade/concessão e regras da rodada. Revogação posterior pode impedir incorporação automática da devolutiva e exigir decisão do autor atual; não fingir eliminação retroativa dos bytes. Expiração verificada por serviço pode controlar novas entregas; o relógio do cliente não prova expiração criptográfica de dados já decifrados.

Audit trail registra operações relevantes com autor/base/decisão e integridade adequada ao protocolo. Não chamá-lo de prova legal ou log inviolável de um arquivo local editável. Definir retenção, exportação e exclusão de conta/material antes de disponibilizar serviço público.

## 7. IA por projeto e consentimento

- Ligação opt-in separada de compartilhamento editorial. Um grant de leitura/comentário não autoriza enviar a obra à IA.
- Provedor recebe em claro o contexto selecionado no endpoint onde precisa processá-lo; E2EE do transporte editorial não cobre essa etapa. Serviço local também requer fronteira de acesso definida.
- Prévia do conteúdo + instruções + provedor/modelo efetivos. Nunca transmitir biblioteca inteira, contatos, chaves ou material de outro participante por descoberta automática.
- Chaves em credential store separado, não em projeto, backup, pacote, prompt ou logs. Editor não herda API key do autor. Sem cofre adequado, definir modo transitório seguro explicitamente antes de persistir segredo.
- Instruções e cânone aprovados versionados por projeto. Fontes, documentos, páginas e respostas são dados não confiáveis: não podem sobrescrever políticas, ampliar escopo, enviar arquivos ou disparar ferramentas.
- Resposta é sugestão; diff e confirmação antes de editar. Minuta de carta não é autorização para enviar e-mail. Pesquisa não verificada deve ser identificada como tal.
- Históricos/prompts com manuscrito só são guardados conforme escolha/retencão claras; diagnóstico padrão não grava payloads sensíveis. Sem treinamento interno com obras privadas. Políticas de retenção/treino do provedor devem ser verificadas e exibidas para a conexão efetiva, sem promessa geral do aplicativo.

## 8. Publicação/exportação

Um ZIP/DOCX/PDF convencional pode ser legível e não é pacote E2EE só por vir de obra criptografada. Identificar proteção do artefato e público alvo. Não incluir material privado por carregar um projeto rico com tudo dentro. Contatos e assinatura entram apenas por escolha do autor; modo anonimizado deve remover também metadados/nomes de arquivo pertinentes.

Sessão de submissão tem base congelada e permissões próprias; editor pode preparar minuta sem poder enviar ou ampliar acesso. Exportar não envia. Envio externo tem prévia de destinatários/anexos e ação final autorizada; sem autoenvio por template, IA ou término de tarefa.

## 9. Matriz de ameaças e evidência exigida

| Ameaça | Controle proposto | Verificação antes de liberar |
|---|---|---|
| UI em modo Editor revela livro privado | Grants + projeção por escopo + validação no domínio/API | Alterar IDs/rotas/search/export/asset e negar entre obras |
| Pacote adulterado ou falso remetente | Envelope autenticado + identidade/chave verificadas | Corromper bytes/cabeçalho, substituir chave/remetente, replay |
| Login recuperado dá acesso indevido a E2EE | Recuperação de conta separada de chaves | Redefinição de conta sem chave não abre dados anteriores |
| Servidor troca chave do destinatário | Vínculo/verificação e sinalização de mudança | Troca simulada bloqueia/avisa antes de cifrar nova entrega |
| Link de convite vazado/consumido por scanner | Aceite explícito autenticado, vínculo destinatário/escopo | GET do link não aceita; outro usuário não aceita grant |
| Editor sobrescreve original | Propose-only, base versionada, aceite autorizado | Mutação direta negada e aplicação stale em conflito |
| Material excluído sai no diff/backup | Allowlist para todas projeções | Canários em notas/contatos/obras B ausentes do pacote A |
| ZIP/pacote esgota disco ou sai da pasta | Limites/staging/paths fixos | Bomb, traversal, symlink, falta de disco e interrupção |
| Revogação promete apagar cópias offline | Estado/limites claros e novas chaves/acessos bloqueados | Dispositivo offline já autorizado não é chamado de apagado |
| IA exfiltra obra por prompt injection | Escopo fixo, fonte como dado, ferramentas limitadas | Documento malicioso não amplia contexto nem dispara envio |
| Exportação final inclui redline/segredo | Perfil limpo, prévia/inspeção de arquivos | Documento final sem tokens/contatos/notas não escolhidos |

## 10. Gates de liberação

Sem alegação de E2EE antes de revisão do protocolo, dependências/licenças, gerenciamento de chaves, testes adversariais e restauração/recuperação. Sem colaboração mutável antes de persistência/revisões/conflitos testados. Sem conexão real de IA antes de isolamento de escopo/credenciais e consentimento verificável. Testes públicos sintéticos; livro do autor só em cópia privada restaurada e jamais enviado automaticamente.

Open questions de engenharia: protocolo/formatos de envelopes, primitive suite, biblioteca, credenciais em browser/backend local, recuperação/múltiplos dispositivos, hospedagem/e-mail transacional, metadados mínimos, retenção e custos. Isso exige ADR/provas; o requisito de produto está definido e não depende de perguntar novamente se o usuário quer pacote e online: ele confirmou os dois, pacote primeiro.

## Incremento offline alpha.16

A alpha.16 acrescenta **Publicar → Pacote editorial cifrado** e **Abrir pacote cifrado** na biblioteca. Escolha de 1–200 cenas do Manuscrito, título compartilhado e remetente/destinatário declarados; confira o texto e as notas incluídas antes de cifrar. A projeção preserva texto/formatação suportada e notas de publicação, excluindo pesquisa, anexos, lixeira, comentários privados, notas do inspetor, metadados, acompanhamento, perfil, versões e propostas. Não há envio automático.

O arquivo `.wroom-package.json` usa AES-256-GCM e scrypt (N=131072, r=8, p=1), com salt/IV aleatórios e cabeçalho autenticado. Parâmetros fixos e uma operação criptográfica por instância limitam recursos. Frase secreta de 16–256 caracteres, confirmada na exportação, combinada por outro canal; não é persistida pelo app. Tamanho mínimo não garante entropia: use frase longa e exclusiva. Sem recuperação: perdida a frase, gere outro pacote pela origem preservada.

A abertura confere integridade e destinatário declarado e apresenta prévia temporária (5 minutos, até 4 entradas) antes de criar uma **nova obra independente**. Cancelar/expirar não cria obra; repetir a confirmação do mesmo token não duplica. Reabrir o arquivo em nova prévia pode criar outra cópia. A obra importada e seus backups são **JSON sem criptografia no disco**, como os projetos locais existentes. Não há migração nem sobrescrita da origem.

Este é um primeiro incremento de cópia editorial protegida por segredo compartilhado: **sem autenticação de e-mail, assinatura de remetente, grants, E2EE ou devolutiva/merge ao original**. Quem tem a frase pode abrir e criar pacotes. Não há revogação de arquivo já entregue nem cofre/recuperação de chaves. Cifra executada no servidor local confiável; frase/conteúdo passam pelo loopback. ADR-0021 registra contrato, ameaças, limites e fontes primárias.

O contrato geral acima continua objetivo futuro para E1 completo; a implementação limitada e o modelo de ameaça efetivo estão na [ADR-0021](../architecture/adr/0021-passphrase-editorial-package.md). Sem auditoria externa ou promoção dos gates remotos.

## Identidades offline alpha.17

A alpha.17 acrescenta **Biblioteca → Chaves editoriais**: criar identidade Ed25519 com chave privada cifrada por frase, baixar cartão público e backup cifrado da chave, restaurar backup e trocar a identidade ativa com confirmação da impressão anterior. Chaves antigas ficam preservadas/inativas; até 5 identidades e 50 contatos. O arquivo separado `.settings/editorial-identities.json` não entra nos backups das obras. Frases não são guardadas pelo app; backup de chave sem a frase não recupera acesso.

Cartão de contato só vira chave conferida quando o usuário informa a impressão SHA-256 completa confirmada por outro canal. Nome permanece declarado; a conferência do canal é declaração do usuário, não autenticação de e-mail/civil pelo app. Chave nova com nome igual exige nova conferência. Revogar mantém o registro e bloqueia novas operações e confirmações pendentes nessa instalação; não apaga arquivos entregues nem reativa o pin.

Em **Publicar → Pacote editorial cifrado**, escolha **Assinar com chave conferida — v2**, o destinatário conferido e informe a frase de desbloqueio da sua chave, separada da frase do pacote. A prévia vincula chaves/estado/conteúdo. Assinatura Ed25519 cobre o envelope cifrado inteiro e o destinatário, com domínio próprio. Verificação usa o pin já conferido, antes de decifrar. O arquivo expõe chave pública do remetente e fingerprints para roteamento/verificação, permitindo vinculação entre arquivos.

A abertura exige assinatura por padrão na UI. Para v1, desative explicitamente essa exigência e veja “Sem assinatura”; v2 inválido não cai para v1. Antes de confirmar staging, a confiança/revogação é conferida novamente. A assinatura prova controle da chave pinada, não identidade civil ou e-mail. A cifra ainda depende da frase compartilhada; não cifra para a chave pública do destinatário nem oferece E2EE/grants. Cópia importada continua independente, JSON em claro, sem atribuição autenticada ou proveniência assinada persistida na obra. **Rodadas, bases e devolutivas ao original continuam pendentes.** ADR-0022; obras permanecem nos formatos 1–6.

O controle de chave não verifica e-mail/identidade civil. Revogação é local; confidencialidade continua por frase compartilhada e fingerprints externos permitem correlação. Modelo efetivo: [ADR-0022](../architecture/adr/0022-offline-signing-identities.md), sem auditoria externa.

## Rodadas/devolutivas alpha.18

A alpha.18 entrega **Revisão → Nova rodada editorial**: selecionar cenas, título e participantes declarados, conferir a projeção e assinar/cifrar uma base congelada. A primeira rodada exige backup integral verificado antes do **formato 7**. Abrir o diálogo/cancelar antes de confirmar não migra. Leitura aceita formatos 1–7; acompanhamento, visual, fontes, anexos e propostas não rebaixam o formato.

Na biblioteca, **Abrir rodada / devolutiva** confere assinatura/pin e frase. Uma oferta cria cópia de trabalho nova com vínculos por IDs opacos, sem expor IDs da origem ou comentários privados. Na cópia, use **Propor alteração** mantendo texto/formatação na base; **Preparar devolutiva** exporta somente propostas pendentes vinculadas. Aceitar na cópia não altera o original nem equivale a devolver sugestões. Cópias independentes v1/v2 não são associadas retroativamente a uma obra.

Na origem, **Receber devolutiva** exige escolha explícita da obra, mostra original/proposto, duplicatas e conflitos. A confirmação revalida participante, rodada, confiança e base completa e cria apenas pendências; antes de gravar uma entrada nova, gera backup manual integral verificado no destino selecionado da central. Aceitar texto continua decisão individual com snapshot, preservando as anotações privadas do original. Qualquer mudança de texto/formatação/comentário bloqueia a devolutiva inteira sem aplicar parcialmente. Encerrar rodada bloqueia novos recebimentos, sem decidir pendências já importadas.

Recibos de proposal_id/hash/review_id e return_id/hash ficam na obra. Replay conhecido não duplica nem reabre decisão, inclusive após aceite/reinício e backup/restauração que contém esses recibos. Restauração remapeia cenas/review_id/snapshots, preservando IDs externos de rodada/proposta. Backup anterior a um recebimento não conhece esse recibo; forks restaurados são independentes e o destino precisa ser escolhido pelo usuário. Não há idempotência global entre forks ou log inviolável.

Limites: 10 rodadas/12 MB de bases e metadados, 200 cenas por rodada, 1000 propostas/4 MB por devolutiva, 20 mil unidades UTF-16 por lado e obra de até 30 MB. Quatro prévias de rodada por instância, 5 minutos, além das prévias legadas. Envelope v3 assinado Ed25519 sobre a cifra AES-GCM/scrypt existente; kind/participantes/base/escopo conferidos. Chaves/pins globais permanecem fora da obra e de seus backups. Confidencialidade continua por frase compartilhada; sem autenticação de e-mail, E2EE, serviço online ou auditoria externa. Formato 7 é JSON em claro no disco. ADR-0023.

Os critérios remotos do threat model acima continuam pendentes. Bases e recibos em arquivo local não são trilha inviolável; backup anterior ao recebimento/fork independente tem limites de deduplicação. A [ADR-0023](../architecture/adr/0023-editorial-rounds-and-returns.md) governa o contrato efetivo, sem auditoria independente.
