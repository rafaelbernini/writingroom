# WritingRoom — ambiente editorial profissional

Versão de especificação: 1.0, 2026-11-02. **Proposta funcional, não implementação.** Baseline observada: alpha.7/studio-6. Este adendo amplia a especificação v1.0 sem renumerar seus requisitos. Não é certificação de segurança, promessa de E2EE existente nem licença de publicação de obras privadas.

## Atualização local alpha.8

Catálogo básico de 16 modelos/preset histórico, perfil local privado e fontes vinculadas já integrados (ADR-0013). Isso implementa parte da fundação, sem redline formal, sessão de submissão, modo Editor autenticado, E2EE ou IA. A tabela da seção 2 é a baseline alpha.7 original; PROGRESS registra o estado corrente.

## 1. Decisões confirmadas com o autor

- O produto atende múltiplas formas de escrita, além de livros.
- Configurações terá modo **Autor / Editor**; Editor muda a tela inicial para uma mesa de trabalho editorial com uma ou várias obras autorizadas.
- Redline significa **alterações rastreadas e comparação entre versões lado a lado**, com autoria e aceitar/rejeitar. Camadas de autor e editor podem ser vistas separadas ou juntas.
- Haverá compartilhamento por **pacote criptografado e acesso online por convite**, **começando pelo pacote criptografado**. Convite/autenticação por e-mail integra o fluxo final; posse do endereço não equivale a posse das chaves de conteúdo.
- Uma área editorial por obra delimita o acesso do editor. Autor escolhe documentos, pastas, materiais e capacidades; nenhuma conta recebe toda a biblioteca automaticamente.
- Após finalizar a obra, haverá sessão de publicação/submissão editável e pacote para editora com manuscrito, sinopse/resumo, proposta e apresentação.
- IA é opcional, configurada e orientada por obra/projeto, com escopo de contexto explícito.
- Continuam válidos: preservar dados, funcionar localmente sem conta/IA, manter o modelo privado do autor fora dos testes públicos e **desktop por último**.
- Google/Drive/OneDrive/Dropbox permanecem na última etapa anterior ao desktop. Autenticação editorial por e-mail não depende de login Google ou desses destinos de backup.

Esta solicitação define produto e planejamento. Não autoriza o envio automático de manuscritos, convites ou dados a serviços externos durante a elaboração dos documentos.

## 2. Estado real e extensão necessária

| Capacidade | Alpha.7 | Alvo deste adendo |
|---|---|---|
| Identidade/autoria | Campo de autor por projeto; perfil global pendente | Identidades de publicação e participantes editoriais distintos |
| Comentários/notas | Marcas vinculadas em texto visual, comentários resolvíveis | Threads, menções, tarefas e autoria verificável com acesso por escopo |
| Versões | Snapshots e comparação simples por bloco alterado | Diff lado a lado navegável e redline semântica com propostas |
| Alterações rastreadas | Não existem; comentário não é redline | Inclusão/exclusão/formatação, aceitar/rejeitar e proveniência |
| Modo Editor | Não existe | Mesa editorial, obras atribuídas, área por obra e permissões reais |
| Compartilhamento/E2EE | Não existem; servidor somente local | Pacote criptografado primeiro, depois convite/acesso online |
| Exportação | TXT/MD/HTML, DOCX básico, EPUB experimental, impressão | Sessão editável e dossiê de submissão por perfil de editora |
| IA | Não integrada | Assistente opt-in/BYOK ou adaptador local, contexto por projeto |
| Novo projeto | Vazio, romance e não ficção | Catálogo extensível de tipos e modelos, sem prometer codecs ainda ausentes |

## 3. Modelo de produto: separar quatro conceitos

1. **Tipo de projeto:** romance, conto, roteiro, artigo etc.; define estrutura inicial e ferramentas pertinentes.
2. **Gênero/área:** histórico, fantasia, pesquisa acadêmica etc.; acrescenta fichas e referências sem trocar o tipo nem alterar o texto.
3. **Modo de trabalho:** Autor ou Editor; muda navegação/painéis, não a identidade ou a autorização.
4. **Etapa:** rascunho, revisão, preparação, prova, submissão; organiza tarefas e versões, sem declarar automaticamente que o texto está aprovado.

A mesma pessoa pode ser autora de uma obra e editora de outra. O modo global não concede permissão em projetos. Biblioteca local privada e carteira de obras recebidas devem ser visualmente distinguíveis.

## 4. Experiência do modo Editor

### 4.1 Ativar e trocar

Em Configurações → Espaço de trabalho, escolher Autor ou Editor. A troca aguarda flush e bloqueia se houver falha/IME em curso. Preserva seleção, painéis e rascunhos do outro modo. Voltar ao modo Autor é sempre visível. Primeira ativação mostra a diferença entre modelos locais de demonstração e obras recebidas de outras pessoas; não cria conexões ou convites silenciosamente.

A tela inicial do Editor contém:

- Obras atribuídas, agrupadas por autor/projeto e etapa; busca, filtros, prazo e pendências.
- Convites recebidos, aguardando aceite, expirados e revogados, com identidade/estado de verificação.
- Minha fila: leitura, desenvolvimento, preparação, revisão de linguagem, prova, devolução e conclusão.
- Comentários/tarefas abertos, alterações aguardando decisão, entregas e últimas versões recebidas.
- Ações Abrir, Comparar, Continuar revisão, Preparar devolutiva e Baixar pacote autorizado.

Sem obra autorizada, a carteira fica vazia com instrução de abrir um pacote/aceitar convite. Não mostrar livros privados do dispositivo de outro usuário ou conteúdo de demonstração como se fosse trabalho recebido.

### 4.2 Área editorial por obra

Estrutura lógica proposta: Área editorial → participante/rodada → pareceres, tarefas, sugestões, referências autorizadas e entregas. É uma projeção com ACL, não uma pasta cujo nome “Editor” concede segurança. IDs de concessão/obra/documento são validados no domínio/API e no envelope compartilhado.

Painéis: Texto / Comentários / Redline / Comparar / Tarefas / Referências / Entregas. O editor pode elaborar parecer geral, parecer por capítulo, checklist de consistência, questões ao autor e relatório de alterações. Marcar tarefa concluída ou comentário resolvido não aceita alterações do texto nem aprova publicação.

Status propostos: recebida → triagem → em leitura → em revisão → devolvida ao autor → ajustes em conferência → concluída. Prazos e responsáveis são dados opcionais; não presumir aprovação pelo tempo transcorrido.

## 5. Participantes e permissões

Capacidades independentes: ler, comentar, propor alteração, resolver próprias discussões, gerenciar tarefas, anexar à área editorial, preparar pacote, exportar cópia, aceitar/rejeitar propostas e gerir acesso. Papel é apenas um preset; concessão final é por obra/escopo/participante.

| Ação | Autor/proprietário | Editor padrão | Leitor/comentarista |
|---|---|---|---|
| Ler texto concedido | Sim | Somente escopo concedido | Somente escopo concedido |
| Ler pesquisa privada/contatos/IA | Sim, conforme configuração local | Não por padrão | Não |
| Criar comentário/tarefa | Sim | Sim no escopo | Conforme concessão |
| Propor redline | Sim | Sim no escopo | Não por padrão |
| Alterar texto canônico diretamente | Sim pelo fluxo de escrita | Não por padrão | Não |
| Aceitar/rejeitar alterações | Sim | Somente delegação explícita | Não |
| Modificar estrutura/títulos do original | Sim | Sugerir, sem mover o original por padrão | Não |
| Anexar material editorial | Sim | Sua área e tipos autorizados | Não por padrão |
| Exportar/baixar conteúdo | Sim | Concessão explícita e informada | Concessão explícita |
| Convidar/revogar/compartilhar outra obra | Sim | Não por padrão | Não |
| Finalizar pacote para editora | Sim | Preparar minuta se autorizado | Não |

Conceder acesso a pasta não inclui automaticamente novas subpastas, pesquisa, lixeira ou revisões privadas: o usuário escolhe se o escopo acompanha descendentes futuros. Prévia deve mostrar exatamente o que entra. Compartilhar várias obras cria concessões separadas, sem uma chave universal da biblioteca.

**Limite explícito:** quem pode ler pode preservar uma cópia/captura. Ocultar o botão Exportar controla o fluxo do app, mas não impede cópia externa. Revogação não apaga material já recebido/descriptografado; bloqueia novas entregas/acessos e exige tratamento das chaves futuras.

## 6. Redline do autor e do editor

### 6.1 Representação

Uma proposta é objeto versionado, não texto colorido solto nem anotação que substitui o original. Campos conceituais: proposal_id, project_id, branch/round_id, base_revision, actor_id, grant_id, document_id, anchors, operation, before/after, reason, state e decisão. Datas locais ajudam apresentação, mas não provam identidade ou ordem causal.

Operações iniciais: inserir texto, excluir texto, substituir trecho e alterar formatação suportada. Mover cena/reestruturar, imagens/tabelas e campos complexos são tipos posteriores com diffs próprios. Excluir mantém o conteúdo anterior recuperável até decisão/retencão definida. Rejeitar não apaga o histórico da proposta nem o texto canônico.

Camadas **Autor**, **Editor [nome]**, **Todos** e **Texto aceito** filtram o mesmo modelo de revisões. Cores são configuráveis e acompanhadas de símbolos/rótulos; não depender apenas de vermelho/verde. Não criar dois textos canônicos independentes sem reconciliação.

### 6.2 Regras de decisão

- Editor com propose-only cria sugestões, nunca sobrescreve silenciosamente o manuscrito aprovado.
- Autor pode habilitar rastreamento das próprias alterações por sessão/rodada; estado fica sempre visível. Um autosave não equivale a aceitar proposta.
- Aceitar/rejeitar uma ou várias sugestões exige identificar autoria, escopo e efeito; manter opção individual. Lote de propostas dependentes/conflitantes pede resolução explícita.
- Antes de aplicar, criar snapshot/base recuperável; validar todos os efeitos e persistir de forma atômica/idempotente.
- Texto/base alterados desde a proposta provocam remapeamento verificável ou conflito visível. Não aceitar offsets antigos, merge por último escritor ou aplicação aproximada sem confirmar.
- Formatação, links, comentários, notas e referências a assets não podem ser descartados ao aceitar/rejeitar texto.
- Revogação/delegação alterada e nova versão do original são revalidadas ao importar uma devolutiva.

### 6.3 Comparação lado a lado

Escolher duas versões/rodadas, incluindo texto aceito versus propostas de um participante. Dois painéis com identificação, autor/data/base, rolagem sincronizada opcional, navegação Próxima/Anterior diferença, contagens e legenda textual. Diferenciar texto, estrutura, estilo e notas; oferecer visão inline e lado a lado. Comparar é leitura e não aplica mudanças. Aceitar/rejeitar aparece somente quando há propostas válidas e permissão, não em qualquer diff histórico.

O diff deve tratar Unicode e estruturas do editor; não é suficiente comparar HTML renderizado. Casos com comentários deslocados/órfãos devem ser destacados para resolução, preservando conteúdo e histórico.

## 7. Compartilhamento: pacote primeiro, online depois

### E1 — pacote editorial criptografado

Fluxo pretendido: selecionar obra(s)/trechos → escolher participante/capacidades → conferir conteúdo incluído → congelar base de revisão → gerar pacote cifrado e autenticado → enviar pelo canal escolhido → editor abre/verifica destinatário e base → trabalha localmente → gera devolutiva autenticada → autor compara/importa propostas em área de recebimento → aceita/rejeita no original.

O envio inicial pode ser manual pelo cliente de e-mail, sem dar ao app acesso à caixa postal. O pacote é um formato novo de troca editorial, **não o backup JSON atual renomeado**. Não exportar a biblioteca inteira ou todas as notas só porque a criptografia está habilitada.

Para o requisito completo de **autenticação por e-mail**, haverá serviço mínimo de identidade/convites e vínculo seguro da chave do destinatário à identidade verificada. Não depende de hospedagem do manuscrito nem colaboração em tempo real. Se um protótipo oferecer troca de chaves manual/offline antes desse serviço, deve se identificar como identidade verificada por outro canal, sem afirmar “autenticado por e-mail”. A escolha de protocolo/biblioteca e recuperação depende da especificação de segurança e ADR próprios.

O destinatário vê autor/remetente, obra, permissões, data/base, tamanho, identidade e chave verificada; confirma antes de abrir. Importação verifica integridade, autenticidade, versões, limites e pertencimento ao projeto. Arquivo inválido/quebrado não modifica o original. Reimportar a mesma devolutiva não duplica alterações.

### E2 — convite e acesso online por e-mail

Serviço próprio/adaptador explicitamente configurado para autenticar contas, gerir convites, autorizações e transportar envelopes cifrados. Convite é restrito ao destinatário, com uso/expiração controlados; reenviar não amplia acesso. Aceite exige provar a identidade e obter a chave por fluxo verificado. Conta que autentica sem chave não pode ler o conteúdo.

O editor encontra uma ou mais obras em sua carteira, apenas com concessões ativas. Controle por obra/documento/pasta, trilha de acessos/decisões pertinente, expiração, desconexão e revogação. Metadados visíveis ao serviço precisam ser inventariados, mesmo com conteúdo E2EE.

Não publicar o servidor loopback atual na internet, liberar CORS irrestrito ou compartilhar o diretório de dados. Backend remoto, segurança de sessão, dispositivos/chaves e operações offline são entregas novas. Colaboração simultânea exige protocolo de operações/merge validado; pode começar por check-out/rodadas assíncronas com conflito explícito.

## 8. Sessão de publicação e pacote para editora

Botão **Preparar envio / Nova sessão de publicação** cria workspace separado baseado em versão congelada, sem mudar o manuscrito. Selecionar destino/perfil, documentos, autoria/pseudônimo e conteúdo permitido. Salvar/retomar/duplicar sessão, comparar com a origem e mostrar “base desatualizada” quando ela mudar. Atualizar base exige prévia, sem descartar edições da sessão.

Abas propostas: Manuscrito, Sinopse, Proposta, Apresentação, Biografia, Checklist, Arquivos e Histórico de envios. Editar paratextos e ajustes da cópia de submissão; aplicar algo ao original somente por ação separada com diff/snapshot. Separar sessão de exportação de uma simples visualização de preview.

| Documento | Conteúdo a preencher/revisar | Inclusão |
|---|---|---|
| Manuscrito | Versão/tipo selecionados, perfil de formatação validado | Conforme destino |
| Sinopse/resumo | Versão curta/longa, aviso sobre spoilers quando pertinente | Escolha do autor |
| Proposta editorial | Projeto, público, formato/extensão, estágio, diferenciais e plano | Opcional por perfil |
| Carta de apresentação | Destinatário, título, pitch, apresentação e contato autorizado | Escolha explícita |
| Biografia | Nome de publicação e dados aprovados pelo autor | Sem contatos privados automáticos |
| Índice/amostra | Capítulos/trechos selecionados, ordem e limites do destinatário | Opcional |
| Ficha do projeto | Tipo/gênero, idioma, contagem, versão e autoria | Revisável antes do envio |
| Manifesto/checklist | Arquivos, versões/hashes, perfil usado e pendências | Local ou incluído deliberadamente |

Perfil de editora contém instruções fornecidas pelo usuário: formatos, extensão, anexos, anonimização, limite de palavras e nomenclatura. Não presumir norma universal de submissão nem inventar destinatário/e-mail/requisitos atuais. Pacote não inclui comentários internos, notas privadas, laboratório, pesquisa, contatos ou histórico completo por padrão. Redline só entra em entrega de revisão explicitamente escolhida, nunca por acidente na versão limpa.

Visualizar todos os arquivos antes de gerar ZIP/pasta. Validar ausência de dados excluídos, consistência de versão e relatório de perdas. Envio por e-mail é ação final separada; preparar/exportar não envia. Cada formato depende de exportador validado: existência de um template não significa suporte a FDX, paginação gráfica ou PDF nativo.

## 9. Assistente de IA por projeto

Painel opcional disponível durante escrita e na sessão de publicação. Desligado por padrão; a obra continua funcional sem ele. Adaptadores para provedor/API escolhido pelo usuário ou runtime local, sem seleção de serviço/modelo obrigatório nesta especificação.

**Ficha de orientação da IA** por projeto: objetivo, tipo/gênero, público, idioma/variante, tom/voz, regras editoriais, personagens/cânone e cronologia aprovados, termos a preservar, limites de intervenção e preferências de resposta. Instruções editáveis/versionadas e anexação seletiva de fontes. Distinguir cânone confirmado, hipótese de pesquisa e sugestão; não transformar automaticamente resposta em fato do livro.

Antes de solicitar, mostrar pergunta, trechos/contextos enviados, provedor/modelo configurado e limites aplicáveis. Contexto por seleção/cena/capítulos/fichas escolhidos; nunca toda a obra, chaves, contato privado, e-mails ou obras de outro participante automaticamente. Orientação persistente permite repetir contexto conscientemente, não equivale a treinar o provedor com o livro.

Ferramentas: ideias, perguntas de consistência, revisão sugerida, resumo, pesquisa assistida, outline e minutas de sinopse/proposta/apresentação. Ações com texto apresentam diff e dependem de aplicação explícita. Registrar proveniência de conteúdo sugerido e revisão humana, sem prometer que uma IA leu/conferiu a obra inteira.

Pesquisa externa/rede somente quando habilitada para aquele pedido; distinguir resposta sem fontes de pesquisa documentada. Mostrar URLs/trechos/origem quando disponíveis e permitir conferir fatos antes de incorporá-los. Não fabricar citações, biografias ou referências históricas. Material recuperado é dado de pesquisa, não instrução que pode ampliar escopo, revelar segredos ou executar ferramentas.

API keys em armazenamento de credenciais separado, fora do projeto/backup/pacote e sem logs de segredo. Editor só usa IA sobre material que pode acessar, com permissão da obra e sua conexão; não recebe a chave do autor. Preço/limite/memória e política do provedor são propriedades da conexão efetiva, não promessa geral do WritingRoom. “Obra E2EE” não significa que o provedor de IA deixou de receber o texto escolhido em claro.

## 10. Novo projeto: múltiplas formas de criação

Fluxo: **Tipo → Modelo → Gênero/área opcional → Nome/autoria → Conferir estrutura → Criar**. Oferecer Vazio sempre. Usar nomes e estrutura originais, modelos declarativos versionados, sem scripts. Permitir personalização/duplicação de modelos. Não inferir tipo pelo tamanho nem restringir o usuário a limite arbitrário de palavras.

| Tipo | Estrutura inicial proposta | Ferramentas/perfis futuros específicos |
|---|---|---|
| Romance | Partes, capítulos, cenas, personagens, pesquisa | Cronologia, continuidade, submissão |
| Conto | Cenas/segmentos, personagens, notas | Versão de revista/coletânea |
| Novela | Capítulos/cenas, elenco e arco central | Perfil editorial de narrativa média |
| Não ficção/ensaio | Partes, capítulos, argumentos, fontes | Proposta, bibliografia e índice |
| Artigo/reportagem | Pauta, seções, fontes, entrevistas e revisão | Perfis de publicação fornecidos pelo autor |
| Artigo científico | Seções configuráveis, referências, dados/anexos | Citações e normas somente por adaptador validado |
| Tese/dissertação/monografia | Capítulos, fontes, apêndices/anexos | Perfis institucionais e exportações validadas |
| Roteiro audiovisual | Atos, cenas, ação, personagem e diálogo | Fountain; FDX apenas após validação específica |
| Peça teatral | Atos, cenas, rubricas, personagens/falas | Perfil de leitura/produção |
| Quadrinhos/graphic novel | Volumes, páginas, quadros, ação, falas e referências | Assets/legendas, lettering e layout como módulos posteriores |
| Poesia/coletânea | Poemas, grupos e notas | Preservar versos/espaços na saída validada |
| Crônicas/antologia | Textos independentes, ordem e créditos | Metadados por obra e compilação |
| Podcast/áudio | Episódios, blocos, falas e indicações sonoras | Perfil de locução/produção |
| Jogo/narrativa interativa | Cenas, nós, escolhas, personagens e cânone | Grafo/condições e adaptadores futuros, sem execução de scripts em templates |
| Técnico/educacional | Módulos, capítulos, exemplos e exercícios | Código, tabelas, glossário e assets conforme suporte |
| Personalizado/vazio | Árvore e campos escolhidos pelo usuário | Extensões declarativas versionadas |

“Romance histórico” é preset de gênero/pesquisa de romance; pode ser aplicado a conto/roteiro histórico sem reclassificar a obra. Cada tipo tem suporte explicitamente graduado: **estrutura/modelo**, **edição especializada**, **exportação validada**. Não oferecer “suporte completo a roteiro/quadrinhos” só porque criou pastas. Trocar tipo em projeto existente exige prévia/backup e preserva documentos/IDs, sem transformar ou excluir texto automaticamente.

## 11. Modelo de dados conceitual

Novas entidades propostas: WorkspacePreferences, ProjectType/TemplateVersion, EditorialIdentity, Participant, DeviceKey, Grant, Invitation, ReviewRound, ReviewBranch, ChangeProposal, CommentThread, EditorialTask, ReviewPackage, PublicationSession, SubmissionProfile, DeliveryManifest, AIConnectionReference e ProjectAIInstructions.

Revisões/rodadas apontam para IDs estáveis e uma base imutável identificada; grants são por obra/escopo e não reutilizam o texto de nomes de pastas como permissão. Dados de identidade/convite/credenciais não entram no agregado de publicação. Chaves secretas e contatos não são campos de nó de manuscrito.

O formato atual 1/2/3 não deve ganhar esses objetos silenciosamente. Antes de persistir: ADR/schema versionado, backup integral verificado, migrador idempotente, reader futuro seguro, remapeamento de referências e restauração testados. Não escolher ORM, CRDT, biblioteca criptográfica, provedor de e-mail ou infraestrutura remota sem prova e revisão específicas.

## 12. Aceite e testes de produto

- **PRO-AC-01:** modo Editor altera navegação, não concede acesso; conta sem grant não obtém payload/chave de obra por URL/ID.
- **PRO-AC-02:** um editor com acesso à obra A não lista/lê/altera/exporta a obra B, inclusive caches, pesquisas, lixeira, snapshots e IA.
- **PRO-AC-03:** trocar modos/obras com edição pendente preserva dados; falha bloqueia saída e mantém recuperação.
- **PRO-AC-04:** autor/editor aparecem em camadas distintas de redline, inclusões/exclusões/estilo e decisões recuperáveis; texto canônico só muda no fluxo autorizado.
- **PRO-AC-05:** comparação lado a lado não grava e conserva Unicode, notas e links; diff de estilo não desaparece por texto idêntico.
- **PRO-AC-06:** pacote cifrado adulterado, destinatário/base errados, identidade não verificada ou replay são rejeitados sem modificar origem.
- **PRO-AC-07:** devolver pacote duas vezes não duplica propostas; alteração posterior do autor gera conflito resolvível.
- **PRO-AC-08:** convite expirado/revogado/reenviado não eleva permissão; troca/recuperação de dispositivo não concede chave silenciosamente.
- **PRO-AC-09:** serviço de transporte não recebe conteúdo em claro quando o modo declara E2EE; limites/metadados são documentados e auditados.
- **PRO-AC-10:** sessão de submissão congela base, permite edição separada e gera somente arquivos selecionados; atualização não apaga ajustes locais.
- **PRO-AC-11:** pacote limpo não contém redlines, contatos, pesquisa privada, laboratório ou credenciais sem escolha explícita.
- **PRO-AC-12:** IA desligada não faz chamadas; quando ligada, contexto enviado coincide com prévia e permissões; nada é aplicado silenciosamente.
- **PRO-AC-13:** cada tipo de projeto mostra o nível de suporte real e não altera o texto de um projeto existente ao trocar o modelo.
- **PRO-AC-14:** testes sintéticos adversariais + cópia privada restaurada do modelo longo; fonte/backup-base intactos; teclado e leitura assistiva exercitados sem depender só de cores.

## 13. Sequência de entrega

1. **Locais em andamento:** terminar UX-URG-005–009 e durabilidade/recuperação necessárias; catálogo de tipos/modelos e sessão de publicação podem ser incrementos locais separados.
2. **Revisão editorial local:** comparação lado a lado, alterações rastreadas/rodadas, identidade editorial e área de trabalho com papéis locais claramente identificados como locais.
3. **Pacote editorial seguro (E1):** protocolo de troca, seleção/filtragem, chaves/identidades, revisão criptográfica e fluxo de devolutiva idempotente. Autenticação por e-mail exige seu componente próprio antes de ser anunciada.
4. **Acesso online por convite (E2):** após protocolo/autorizações/chaves/recuperação validados. Não exigir colaboração em tempo real na primeira entrega.
5. **IA por projeto:** após controles de escopo/credenciais/gate G7; interfaces locais de instruções podem ser desenhadas antes, sem simular conexão ou enviar texto.
6. **Destinos Google/Drive/OneDrive/Dropbox:** mantidos na última etapa antes do desktop, conforme instrução anterior; não são pré-requisito para a modalidade pacote.
7. **Desktop:** por último, sem dispensar validações de segurança/durabilidade nas etapas anteriores.

Os gates G1–G4/G7 são critérios de qualidade, não uma ordem que force desktop antes da IA/colaboração. O pedido novo amplia prioridade funcional; não autoriza declarar esses gates aprovados sem evidência. Registro executivo e tarefas: [roadmap profissional](../roadmap/PROFESSIONAL_EDITORIAL_ROADMAP.md). Segurança: [compartilhamento e IA](../security/EDITORIAL_SHARING_AND_AI.md).

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
