# Roadmap — modo Editor, revisão, submissão, IA e tipos de projeto

2026-11-03. Estado atual: alpha.18/studio-17. Catálogo/perfil/fontes e backup local estão entregues parcialmente; comparação textual (alpha.13), propostas locais (alpha.14) e modo Editor com acompanhamento (alpha.15) estão disponíveis com os limites dos ADRs 0018–0020. Cópia offline cifrada por frase secreta entregue parcialmente na alpha.16 (ADR-0021); identidades por chave e assinaturas offline entregues na alpha.17 (ADR-0022); rodadas/devolutivas offline entregues na alpha.18 (ADR-0023); próximo: revisão E1/contrato de identidade e autorização online. Nenhum convite, chave, conta ou conexão de IA foi criado.

Decisões do usuário: redline **e** comparação lado a lado; compartilhamento por **pacote criptografado primeiro**, depois **convite/acesso online por e-mail**. Modo Autor/Editor não concede permissões. Cloud Google/Drive/OneDrive/Dropbox continua somente na última etapa antes do desktop.

Documentos canônicos deste incremento: [produto](../specifications/PROFESSIONAL_EDITORIAL_WORKSPACE.md), [segurança](../security/EDITORIAL_SHARING_AND_AI.md). Escopo local anterior: [fila urgente](URGENT_UX_AND_SETTINGS.md). Não substituir correções de preservação de dados por funcionalidades remotas.

## A. Fundação e recursos locais

| ID | Entrega concreta | Dependências | Aceite principal |
|---|---|---|---|
| PRO-001 | Catálogo de tipos/modelos em Novo projeto, com Vazio e nível de suporte | Templates/versionamento e validação | Criar cada modelo sem scripts; título/tipo não promete exportador inexistente |
| PRO-002 | Tipo versus gênero/área versus modo versus etapa separados | PRO-001 | Romance histórico como preset aplicável sem apagar texto ou trocar IDs |
| PRO-003 | Perfil do autor/identidades de publicação e contatos privados | UX-URG-008 | Pseudônimo por obra, contatos fora de exports por padrão |
| PRO-004 | Fichas/fontes/cronologia e rascunhos integrados | UX-URG-005–007 | Vínculos estáveis e contexto aprovado, sem inventar cânone |
| PRO-005 | Reposições/revisões/backup/recuperação/migração de produção | G1–G3 e UX-URG-009 | Falhas e concorrência não corrompem nem confirmam gravação perdida |

A fundação deve atender o app atual antes de desktop. Não assumir que a prova SQLite isolada já fornece revisão/lock ao servidor JSON.

## B. Revisão editorial local

| ID | Entrega concreta | Dependências | Aceite principal |
|---|---|---|---|
| PRO-006 | Comparação de versões lado a lado, navegação e legenda acessível | Editor/schema e versões estáveis | Comparar não salva; Unicode/estilo/notas tratados explicitamente |
| PRO-007 | Propostas de inclusão/exclusão/substituição/formatação | PRO-005/006 | Texto canônico separado; âncoras/base/autoria e conflito verificáveis |
| PRO-008 | Aceitar/rejeitar individual/lote com backup/snapshot e idempotência | PRO-007 | Conteúdo rico/nota/asset preservados; lote conflitante não aplica parcialmente |
| PRO-009 | Camadas Autor / Editor / Todos / Texto aceito | PRO-007/008 | Filtros distinguem proveniência sem criar canônicos divergentes |
| PRO-010 | Modo Editor e mesa editorial local, carteira/rodadas/área de trabalho | PRO-003/007 | Troca visual preserva dados e é marcada como local, sem simular conta remota |
| PRO-011 | Parecer, tarefas, responsáveis, prazos e relatórios por obra | PRO-010 | Concluir tarefa não aceita texto nem autoriza envio |

Esses fluxos podem ser implementados com cópias locais/identidades demonstrativas identificadas. Não declarar isolamento real entre pessoas apenas por esconder pastas.

## C. Pacote editorial seguro — primeira forma de compartilhamento escolhida

| ID | Entrega concreta | Dependências | Aceite principal |
|---|---|---|---|
| PRO-012 | Modelo de capacidades/grants por obra/documento/pasta/participante | PRO-005/010, threat model | Leitor A não recebe dados de B por nenhuma projeção |
| PRO-013 | Projeção de compartilhamento com prévia/allowlist | PRO-012 | Sem pesquisa/contatos/rascunhos/histórico privados por padrão |
| PRO-014 | ADR/prova de criptografia, chaves/dispositivos, autenticidade e recuperação | Revisão de segurança e dependências | Sem crypto caseira/segredos no pacote; adulteração e troca de chave detectadas |
| PRO-015 | Identidade por e-mail e vínculo verificado da chave | PRO-014, serviço mínimo próprio | Autenticar endereço não entrega chave indevidamente; scanner não aceita convite |
| PRO-016 | Gerar/abrir pacote cifrado, revisar offline e devolver pacote de propostas | PRO-007–009/012–015 | Destinatário/base incorretos rejeitados; staging e limites; original intacto |
| PRO-017 | Importar devolutivas com comparação, decisão e auditoria | PRO-008/016 | Replay idempotente; base stale em conflito; grant revalidado |

Prova offline manual anterior a PRO-015 pode existir, mas não usa o rótulo “autenticado por e-mail”. A entrega completa solicitada inclui autenticação real; não trocar por senha fraca em arquivo ou link com chave embutida.

## D. Sessão de publicação e envio para editora

| ID | Entrega concreta | Dependências | Aceite principal |
|---|---|---|---|
| PRO-018 | Nova sessão de publicação editável a partir de base congelada | PRO-005 e pipeline de publicação | Trabalhar na sessão não reescreve o manuscrito; base atualizável com diff |
| PRO-019 | Sinopse/resumo, proposta, apresentação e bio por perfil | PRO-003/018 | Dados reais escolhidos/revisados pelo autor, sem inferir contatos/destinatário |
| PRO-020 | Pacote de submissão, manifesto/checklist e preview dos arquivos | PRO-018/019 e exportadores validados | Versão limpa exclui redline/pesquisa/laboratório/segredos por padrão |
| PRO-021 | Histórico de entregas e envio opcional separado da geração | PRO-020 + transporte configurado | Exportar não envia; destinatários/anexos conferidos antes da ação final |

PRO-018–020 são incrementos locais e podem avançar antes do compartilhamento remoto, desde que fundação/isolamento de sessão estejam válidos. Não impor serviço de nuvem para preparar um manuscrito de submissão.

## E. IA por obra, opcional

| ID | Entrega concreta | Dependências | Aceite principal |
|---|---|---|---|
| PRO-022 | Instruções/brief/cânone versionados por projeto e seleção de contexto | PRO-003/004, AI-001/002 | Configuração local sem chamadas simuladas; contexto escolhido visível |
| PRO-023 | Conexão BYOK/adaptador local e credenciais separadas | G7 específico, PRO-012 se editorial | Chave não viaja em projeto/pacote/log; editor não herda segredo do autor |
| PRO-024 | Dicas/revisão/resumo/pesquisa/paratextos com diff e proveniência | PRO-022/023 | Nada aplicado/enviado automaticamente; fontes e incerteza visíveis |

Não escolher provedor/modelo/preço fixo por este documento. Orientação por projeto é contexto configurado, não treinamento presumido. Chamadas externas exigem fluxo de escopo/consentimento e tratamento de prompt injection.

## F. Acesso editorial online — segunda forma escolhida

| ID | Entrega concreta | Dependências | Aceite principal |
|---|---|---|---|
| PRO-025 | Convites por e-mail, aceite/revogação, múltiplas obras e dispositivos | PRO-012–017, API remota/segurança de sessão | Sem exposição do servidor loopback; autorização efetiva por obra |
| PRO-026 | Carteira online e entrega assíncrona de envelopes E2EE | PRO-025, protocolo de operações | Serviço não lê conteúdo protegido; offline/conflitos explícitos |
| PRO-027 | Coedição simultânea, somente se protocolo validado | PRO-026 + prova de merge | Não substituir por sincronização cega do JSON/SQLite |

A modalidade online não exige tempo real desde o início. Revogação não apaga o que um destinatário já leu; não prometer bloqueio de cópia ou expiração criptográfica retroativa.

## G. Últimas etapas e ordem preservada

1. Completar recursos locais urgentes/fundação.
2. Tipos de projeto, revisão/editor local e sessão de submissão em incrementos independentes validados.
3. Pacote criptografado/autenticado (primeira modalidade), IA somente após gate próprio e acesso editorial online em etapa posterior ao pacote.
4. Demais recursos locais/interoperabilidade/validações necessários.
5. Google/Drive/OneDrive/Dropbox (UX-URG-010–012): última etapa antes do desktop, sem confundir backup remoto e sync.
6. Desktop/instaladores por último.

A ordem por dependências não fixa prazo nem exige uma mudança monolítica. Cada entrega precisa de UI real, validação e limitação explícita; as propostas deste arquivo não elevam a contagem atual de testes.

## Atualização de aparência — alpha.10 (2026-11-02)

Galeria de aparência alpha.10: **20 opções** no botão **◐** ou em **Configurações → Temas e aparência**. Inclui WritingRoom claro/escuro, Windows 10/11 claro/escuro, Office 365 claro/escuro, Office 2010 claro, retrô, GNOME 50 claro/escuro, macOS claro/escuro, KDE Plasma 6 claro/escuro, WordStar 4, DOS colorido, Cores divertidas e Adaptar ao sistema.

Selecione para experimentar; **Aplicar tema** confirma, **Cancelar/Escape** restaura. A preferência fica neste navegador, separada dos projetos e backups; preferências antigas claro/escuro são reconhecidas. Adaptar ao sistema acompanha `prefers-color-scheme`, usando WritingRoom claro/escuro. São interpretações visuais originais, com fontes locais; os temas de terminal não emulam atalhos ou formatos antigos. A aparência não altera o conteúdo do manuscrito. Impressão tem estilo de papel claro.

Verificação: 166 testes Node e 74 grupos Firefox; detalhes em docs/development/PROGRESS.md e ADR-0015. Desktop permanece por último.

## Tradução e ferramentas de idioma — alpha.11 (2026-11-02)

A alpha.11 acrescenta **Tradução** em todos os projetos e quatro modelos em **Novo projeto → Tradução — livro/artigo/documento/outros textos**. Crie trechos com original e idioma de destino, escreva lado a lado, acompanhe estados e exporte revisão bilíngue MD. Originais e glossário ficam em Pesquisa e fora da publicação; backups preservam os vínculos. Alterar o texto original reabre traduções concluídas para Revisão.

**Dicionário e idiomas** oferece verbetes pessoais (definição, sinônimos, equivalentes, contexto e fonte), busca no glossário e em trechos traduzidos, exportação MD e links explícitos de consulta externa. O glossário funciona offline por obra; **não há base lexical completa offline ou tradução automática integrada**. Nenhuma cena é enviada automaticamente. Veja [especificação de tradução e idiomas](../specifications/TRANSLATION_AND_LANGUAGE_TOOLS.md) para limites e evolução.

ADR-0016. Base lexical licenciada completa, memória CAT/TMX/XLIFF/TBX e consultas API integradas permanecem explicitamente na fila da especificação complementar. Desktop por último.

## Pesquisa de anexos e idiomas — alpha.12 (2026-11-02)

A alpha.12 permite guardar qualquer tipo de anexo como original para download e **extrair texto de PDF, Word DOCX, ODT, TXT e Markdown** no projeto. Em **Caderno → Anexos → Abrir → Extrair texto / pesquisar / traduzir**, revise a prévia ou selecione um trecho e crie pesquisa vinculada ou original de tradução. Arquivos sem extrator aceitam transcrição manual; não há OCR ou execução de anexos.

**Dicionário e idiomas** ganhou consulta offline às bases MyThes pt/en instaladas, importação/exportação de base lexical JSON compartilhada e conector LibreTranslate com autorização de envio, prévia e confirmação separadas. Tradução automática precisa de um serviço configurado; não há motor neural incluído. Credenciais ficam no processo do servidor, fora das obras. Definições/traduções offline dependem da base importada, sem alegação de dicionário universal pré-instalado.

ADR-0017 e ATTACHMENT_RESEARCH_TRANSLATION_ANALYSIS.md detalham a hipótese implementada, matriz de formatos, limites, fontes lexicais, dependências locais e contrato LibreTranslate. Schema 3/4 preservado; novos tipos de anexo exigem esta versão para leitura. Desktop por último.

## Comparação editorial — alpha.13 (2026-11-02)

A alpha.13 entrega **Versões → Comparar duas versões lado a lado**: escolha dois snapshots ou o texto atual no disco, inverta os lados, veja linhas inseridas/removidas e filtre somente alterações. Navegue pelas diferenças e carregue mais linhas quando necessário. Em telas estreitas, os lados ficam empilhados. Comparação é somente leitura; restauração continua no fluxo existente com preservação da versão anterior.

A análise é textual. Diferenças de formatação/anotações são avisadas, sem diff visual detalhado. Trechos grandes usam comparação simplificada identificada, com contagens aproximadas; texto não é descartado. Alterar as seleções pede nova consulta. Isto entrega comparação de versões; propostas de redline e aceitar/rejeitar continuam como a próxima etapa.

ADR-0018; PRO-006 comparação textual entregue com limites explícitos. Evidência: 193 testes Node, 85 fluxos Firefox amplos e 4 focados. Caso privado: 103 comparações em cópia restaurada, sem alterar originais. Sem promoção dos gates de redline, autenticação, criptografia ou desktop.

## Revisão editorial local — alpha.14 (2026-11-02)

A alpha.14 acrescenta **Revisão** e **Propor alteração**: selecione texto na cena ou no original de leitura do diálogo, informe autor/papel (Escritor/Editor), substituição e justificativa. O painel mostra original riscado e proposta sublinhada; guardar não altera o manuscrito. Aceitar preserva versão anterior e registra a decisão; rejeitar mantém o texto. Filtros distinguem estado/papel e o histórico acompanha backup/restauração.

O aceite é bloqueado se texto/formatação mudou; atualize a lista e faça nova proposta sobre a base atual, ou rejeite a antiga. A primeira proposta migra a obra para **formato 5**, somente após backup integral verificado. A identificação é local e declarada, sem autenticação, compartilhamento ou permissões remotas. No editor visual, as propostas são limitadas a trechos de um bloco, sem novas quebras ou inserção em cursor vazio.

ADR-0019. 205 testes Node, 85 fluxos Firefox amplos e 9 focados; caso privado em cópia restaurada. PRO-007–011 parcialmente atendidos: propostas/decisões locais com CAS e snapshot, sem autenticação, permissões por usuário, rastreamento automático ou colaboração remota. Desktop por último; nuvem imediatamente antes.

## Entrega local alpha.15 — 2026-11-03

A alpha.15 entrega **Configurações · Escritor/Editor** no cabeçalho. Editor abre um painel das obras locais com propostas pendentes, conflitos, comentários visuais abertos e acesso à cena, histórico de propostas e versões/comparação. Filtros por etapa e pendência; Atualizar painel consulta o disco. Voltar a Escritor restaura a biblioteca. Autoria/responsabilidade continuam declaradas, sem autenticação ou permissões.

**Acompanhar obra** guarda responsável declarado (100 caracteres), etapa, observações e próximos passos (10 mil caracteres cada). A preferência de perspectiva fica no navegador; acompanhamento pertence à obra e acompanha backup, restauração e duplicação. O primeiro salvamento exige backup integral verificado antes do **formato 6**. Abrir painel ou cancelar não migra. Leitura aceita formatos 1–6; propostas, fontes, anexos e editor visual não rebaixam o formato. Conflito de acompanhamento mantém os campos locais e pede reabertura explícita. `tracking_hash` é derivado e não entra na recuperação/restauração.

ADR-0020. Evidências: 210 testes Node, 85 fluxos Firefox amplos + 9 de redline + 11 do modo Editor. Próximo: contrato de segurança do pacote criptografado; autenticação/permissões remotas permanecem pendentes.

## Primeiro pacote local alpha.16 — 2026-11-03

A alpha.16 acrescenta **Publicar → Pacote editorial cifrado** e **Abrir pacote cifrado** na biblioteca. Escolha de 1–200 cenas do Manuscrito, título compartilhado e remetente/destinatário declarados; confira o texto e as notas incluídas antes de cifrar. A projeção preserva texto/formatação suportada e notas de publicação, excluindo pesquisa, anexos, lixeira, comentários privados, notas do inspetor, metadados, acompanhamento, perfil, versões e propostas. Não há envio automático.

O arquivo `.wroom-package.json` usa AES-256-GCM e scrypt (N=131072, r=8, p=1), com salt/IV aleatórios e cabeçalho autenticado. Parâmetros fixos e uma operação criptográfica por instância limitam recursos. Frase secreta de 16–256 caracteres, confirmada na exportação, combinada por outro canal; não é persistida pelo app. Tamanho mínimo não garante entropia: use frase longa e exclusiva. Sem recuperação: perdida a frase, gere outro pacote pela origem preservada.

A abertura confere integridade e destinatário declarado e apresenta prévia temporária (5 minutos, até 4 entradas) antes de criar uma **nova obra independente**. Cancelar/expirar não cria obra; repetir a confirmação do mesmo token não duplica. Reabrir o arquivo em nova prévia pode criar outra cópia. A obra importada e seus backups são **JSON sem criptografia no disco**, como os projetos locais existentes. Não há migração nem sobrescrita da origem.

Este é um primeiro incremento de cópia editorial protegida por segredo compartilhado: **sem autenticação de e-mail, assinatura de remetente, grants, E2EE ou devolutiva/merge ao original**. Quem tem a frase pode abrir e criar pacotes. Não há revogação de arquivo já entregue nem cofre/recuperação de chaves. Cifra executada no servidor local confiável; frase/conteúdo passam pelo loopback. ADR-0021 registra contrato, ameaças, limites e fontes primárias.

PRO-013/014/016 parcialmente atendidos; PRO-015/017 e PRO-AC-06–09 completos não entregues. Próximo: contrato de identidade/chaves e devolutiva por rodada, antes de online. Evidência: 221 testes Node e 116 fluxos Firefox.

## Identidades por chave e assinatura alpha.17 — 2026-11-03

A alpha.17 acrescenta **Biblioteca → Chaves editoriais**: criar identidade Ed25519 com chave privada cifrada por frase, baixar cartão público e backup cifrado da chave, restaurar backup e trocar a identidade ativa com confirmação da impressão anterior. Chaves antigas ficam preservadas/inativas; até 5 identidades e 50 contatos. O arquivo separado `.settings/editorial-identities.json` não entra nos backups das obras. Frases não são guardadas pelo app; backup de chave sem a frase não recupera acesso.

Cartão de contato só vira chave conferida quando o usuário informa a impressão SHA-256 completa confirmada por outro canal. Nome permanece declarado; a conferência do canal é declaração do usuário, não autenticação de e-mail/civil pelo app. Chave nova com nome igual exige nova conferência. Revogar mantém o registro e bloqueia novas operações e confirmações pendentes nessa instalação; não apaga arquivos entregues nem reativa o pin.

Em **Publicar → Pacote editorial cifrado**, escolha **Assinar com chave conferida — v2**, o destinatário conferido e informe a frase de desbloqueio da sua chave, separada da frase do pacote. A prévia vincula chaves/estado/conteúdo. Assinatura Ed25519 cobre o envelope cifrado inteiro e o destinatário, com domínio próprio. Verificação usa o pin já conferido, antes de decifrar. O arquivo expõe chave pública do remetente e fingerprints para roteamento/verificação, permitindo vinculação entre arquivos.

A abertura exige assinatura por padrão na UI. Para v1, desative explicitamente essa exigência e veja “Sem assinatura”; v2 inválido não cai para v1. Antes de confirmar staging, a confiança/revogação é conferida novamente. A assinatura prova controle da chave pinada, não identidade civil ou e-mail. A cifra ainda depende da frase compartilhada; não cifra para a chave pública do destinatário nem oferece E2EE/grants. Cópia importada continua independente, JSON em claro, sem atribuição autenticada ou proveniência assinada persistida na obra. **Rodadas, bases e devolutivas ao original continuam pendentes.** ADR-0022; obras permanecem nos formatos 1–6.

PRO-014/016 ampliados; E1 completo, PRO-015/017 e PRO-AC-06–09 completos continuam pendentes. Evidência: 231 testes Node e 127 fluxos Firefox, cópia privada de 48 cenas.

## Rodadas e devolutivas offline alpha.18 — 2026-11-03

A alpha.18 entrega **Revisão → Nova rodada editorial**: selecionar cenas, título e participantes declarados, conferir a projeção e assinar/cifrar uma base congelada. A primeira rodada exige backup integral verificado antes do **formato 7**. Abrir o diálogo/cancelar antes de confirmar não migra. Leitura aceita formatos 1–7; acompanhamento, visual, fontes, anexos e propostas não rebaixam o formato.

Na biblioteca, **Abrir rodada / devolutiva** confere assinatura/pin e frase. Uma oferta cria cópia de trabalho nova com vínculos por IDs opacos, sem expor IDs da origem ou comentários privados. Na cópia, use **Propor alteração** mantendo texto/formatação na base; **Preparar devolutiva** exporta somente propostas pendentes vinculadas. Aceitar na cópia não altera o original nem equivale a devolver sugestões. Cópias independentes v1/v2 não são associadas retroativamente a uma obra.

Na origem, **Receber devolutiva** exige escolha explícita da obra, mostra original/proposto, duplicatas e conflitos. A confirmação revalida participante, rodada, confiança e base completa e cria apenas pendências; antes de gravar uma entrada nova, gera backup manual integral verificado no destino selecionado da central. Aceitar texto continua decisão individual com snapshot, preservando as anotações privadas do original. Qualquer mudança de texto/formatação/comentário bloqueia a devolutiva inteira sem aplicar parcialmente. Encerrar rodada bloqueia novos recebimentos, sem decidir pendências já importadas.

Recibos de proposal_id/hash/review_id e return_id/hash ficam na obra. Replay conhecido não duplica nem reabre decisão, inclusive após aceite/reinício e backup/restauração que contém esses recibos. Restauração remapeia cenas/review_id/snapshots, preservando IDs externos de rodada/proposta. Backup anterior a um recebimento não conhece esse recibo; forks restaurados são independentes e o destino precisa ser escolhido pelo usuário. Não há idempotência global entre forks ou log inviolável.

Limites: 10 rodadas/12 MB de bases e metadados, 200 cenas por rodada, 1000 propostas/4 MB por devolutiva, 20 mil unidades UTF-16 por lado e obra de até 30 MB. Quatro prévias de rodada por instância, 5 minutos, além das prévias legadas. Envelope v3 assinado Ed25519 sobre a cifra AES-GCM/scrypt existente; kind/participantes/base/escopo conferidos. Chaves/pins globais permanecem fora da obra e de seus backups. Confidencialidade continua por frase compartilhada; sem autenticação de e-mail, E2EE, serviço online ou auditoria externa. Formato 7 é JSON em claro no disco. ADR-0023.

PRO-016/017 implementados na modalidade offline por frase compartilhada e pin de assinatura. Não implica E1/E2EE/autenticação remota completos. Evidências: 243 testes Node e 139 fluxos Firefox. Próximo: revisão de E1 e contrato do serviço autenticado, antes de qualquer exposição à rede.
