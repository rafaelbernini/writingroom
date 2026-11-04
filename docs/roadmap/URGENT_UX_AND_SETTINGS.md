# Fila urgente — ações, organização, pesquisa e configurações

Data: 2026-11-02. Solicitado explicitamente pelo usuário após experimentar o modelo do livro. Estado: **auditado na alpha.6, com entrega parcial dos controles locais na alpha.7/studio-6; itens pendentes não estão implementados**. Desktop continua por último. Por nova instrução do usuário, Google, Drive, OneDrive e Dropbox ficam na última etapa imediatamente anterior ao desktop, após os recursos locais. Esta fila precede imagens inline/importadores, preservando correções de integridade como prioridade transversal.

## Atualização alpha.7 — executado parcialmente

UX-URG-001: menu biblioteca com editar/renomear, duplicar, backup, arquivar e restaurar; remoção reversível, sem exclusão definitiva. UX-URG-002: menus nas vistas principais e duplicação de subárvore/rico/snapshots/anexos. UX-URG-003: arraste por ponteiro em árvore/cartões/outline/leitura, destinos antes/depois/dentro, undo da última movimentação e Escape; alternativa por botões. UX-URG-004: recolher/expandir/revelar ancestrais, sem busca rápida nova. ADR-0011/PROGRESS: 139 testes Node/56 fluxos Firefox; toque real e outras plataformas pendentes.

005–009 seguem como próximos recursos locais. **010–012 foram adiados pelo usuário para a última etapa antes do desktop**. A auditoria abaixo é o retrato da alpha.6, e os critérios por item continuam registrando o escopo completo, não aprovação integral.

## Atualização alpha.8 — recursos locais parciais

UX-URG-005/006: atalhos de personagem/cenário/rascunho e preset histórico, com 16 modelos de escrita. UX-URG-007: fontes com URL/metadados/classificação, vínculos e backlinks para cenas/fichas/anexos, preservados no backup. UX-URG-008: perfil local com nome/pseudônimo/contatos, cópia privada e autoria aplicada explicitamente. Sem campos tipados/retratos/timeline/PDF interno; UX-URG-009 (central de backup automático) continua pendente. ADR-0013: 151 testes Node/62 fluxos Firefox. A ordem de cloud imediatamente antes do desktop não mudou.

## Atualização alpha.9 — central de backup local

UX-URG-009/PRO-005 parcial entregue: cópias gerenciadas verificadas/histórico/restore, rotina no servidor opt-in com intervalos e retenção, destinos preconfigurados e erro/corrupção visíveis. Preserva manuais/migrações/incompletas/corrompidas. 162 testes Node/69 fluxos Firefox; ADR-0014. Não é backup externo/cifrado, agendador OS ou G1 completo. Próximo local: comparação/revisão/sessão de publicação; cloud mantém etapa anterior ao desktop.

## Auditoria do que existe

| Área | Disponível hoje | Lacuna confirmada |
|---|---|---|
| Seus projetos | Criar por modelo, abrir, restaurar JSON; editar nome/autor/descrição dentro do projeto | Sem menu de ações na capa, arquivar/restaurar projeto, duplicar diretamente ou remover projeto pela biblioteca |
| Documentos/cenas | Título editável, mover por seletor, subir/descer, lixeira/restauração, snapshots | Ações espalhadas e ausentes nos próprios cartões; sem arrastar para reordenar ou mudar pasta |
| Manuscrito/Planejar | Árvore, cartões e outline; Manuscrito é leitura contínua | Sem drag-and-drop na árvore/cartões/outline/leitura; árvore não recolhe pastas |
| Personagens/cenários | Caderno/Fichas: personagem, lugar, objeto, organização, evento, conceito; texto editável | Criação pouco visível no fluxo de escrita; fichas são templates textuais, sem campos tipados, retratos e relações com cenas/fontes |
| Pesquisa histórica | Pastas de pesquisa, notas, keywords, coleções, PNG/JPEG/PDF/TXT/MD anexados; capturas | Sem centro de fontes/links estruturados, vínculo fonte↔personagem/cena, cronologia histórica ou preset de romance histórico |
| Links e fotos | Links seguros em texto visual; imagens anexadas e consultáveis | Link de texto não é bookmark/fonte de pesquisa; foto não está vinculada a ficha nem inserida no corpo do livro |
| PDF/rascunhos | PDF armazenado/baixado; texto de pesquisa, versões e capturas | Sem leitor PDF interno, anotações/indexação PDF ou versões do arquivo anexado |
| Autor/configurações | Nome do projeto e campo autor, idioma/meta; tema/fonte por navegador | Sem perfil global, nome civil/pseudônimo separados, endereço, telefone ou seleção de identidade editorial |
| Backup | Download/restauração JSON, recuperação local e backup antes de migração | Sem centro de backup, agenda, retenção, destino configurável na UI ou histórico de verificações |
| Contas/nuvem | Nenhuma conexão na aplicação | Sem login Google, backup Google Drive, OneDrive ou Dropbox; não há OAuth/tokens/sincronização |

Evidência: `apps/web/app.js` (library, renderTree, renderStory, renderNotebook, settingsForm), `apps/web/index.html`, ações permitidas de `apps/web/server.mjs`, `packages/core/src/notebook.mjs` e `attachment-service.mjs`. O editor visual bloqueia drop de conteúdo em `packages/editor/src/browser.mjs`; isso é distinto de arrastar itens da estrutura.

## Ordem de implementação e critérios de aceite

### P0 — controles essenciais de uso diário

**UX-URG-001 — Ações na biblioteca.** Menu acessível em cada projeto: Abrir, Editar dados/renomear, Duplicar, Baixar backup, Arquivar/remover da lista ativa e Restaurar arquivado. Distinguir remover da lista, arquivar e excluir arquivos. Primeira entrega de remoção deve ser reversível; exclusão permanente exige fluxo próprio de confirmação/backup e não deve ficar escondida sob “Remover”. Projeto indisponível continua visível com orientação de recuperação; não tentar reescrever formato desconhecido. Duplicar preserva conteúdos/versões/anexos e remapeia IDs/referências, sem alterar origem. Menu não abre o livro por propagação de clique.

**UX-URG-002 — Ações consistentes nas outras telas.** Árvore, cartões, outline, fichas e anexos devem oferecer, conforme tipo, Abrir/editar, Renomear, Mover, Duplicar e Mover à lixeira; coleções devem distinguir Remover referência de Excluir documento. Aplicar os mesmos comandos do domínio em todas as vistas, com flush antes de transição, falha visível e restauração preservando bytes/metadados. Botões/m menus acessíveis por teclado e toque, sem depender exclusivamente de clique direito ou hover. Documento raiz protegido. Anexo mantém arquivo original; renomear título não muda os bytes.

**UX-URG-003 — Clicar e arrastar para organizar.** Implementar alças e indicação de destino na estrutura do Manuscrito, cartões e outline. Leitura contínua deve oferecer acesso direto à reorganização e usar os mesmos IDs/ordem; se houver alça nela, aplicar exatamente o mesmo comando. Destinos: antes/depois de irmão e dentro de pasta, com prévia clara. Impedir ciclos, mover raiz e destino inválido; cancelar/Escape não altera ordem. Tratar descendentes, filtros e índices absolutos corretamente; arrastar sob filtro não deve reordenar itens ocultos involuntariamente. Não misturar arraste estrutural com drop arbitrário no editor. Manter alternativas por botões/teclado e validar toque. Snapshot/undo estrutural ou operação inversa devem permitir reverter sem perda; flush e erro de persistência impedem falsa confirmação visual.

**UX-URG-004 — Navegação de livros grandes.** Recolher/expandir pastas, revelar seleção, “Ir para capítulo” e títulos completos acessíveis. Recolher é preferência de visualização, não mudança no livro. Exercitar as três partes e 45 capítulos em uma cópia privada do modelo; não editar o backup-base.

### P1 — construção de romance e pesquisa integradas

**UX-URG-005 — Personagens e cenários no fluxo de escrita.** Atalhos visíveis “Novo personagem”, “Novo cenário/lugar”, “Nova pesquisa” e “Novo rascunho” no Caderno e na estrutura. Reusar os tipos de ficha existentes. Evoluir campos estruturados de forma opcional com retrato/descrição/notas, preservando texto das fichas atuais. Vincular fichas a cenas/fontes por identidade estável; renomear/mover não quebra ligação. Um novo campo não pode inventar fatos ou sobrescrever o conteúdo do autor. Editar/remover/restaurar na própria lista.

**UX-URG-006 — Ambiente de romance histórico.** Modelo inicial opcional com Personagens, Cenários, Fontes históricas, Cronologia, Fotos/documentos e Rascunhos. Fontes e rascunhos ficam fora da publicação por padrão; converter rascunho em cena deve permitir copiar sem consumir a origem. Datas/intervalos e distinção entre fato documentado, hipótese e invenção são dados do autor, nunca inferência silenciosa. Não reorganizar projetos existentes automaticamente.

**UX-URG-007 — Centro de pesquisa e links.** Criar/editar/remover fontes com título, URL segura, autoria, data de acesso, notas e vínculos a fichas/cenas. Anexar fotos/PDF/texto ao registro por IDs e mostrar backlinks. Links não carregam páginas/imagens remotas automaticamente; abrir externamente é ação explícita. Gerenciar referência não apaga bytes compartilhados. Integrar busca/coleções e backup/restauração com remapeamento de referências. Leitor PDF interno, marcações e extração de texto ficam como subetapas declaradas, sem chamar download de “leitura integrada”.

### P1 — perfil do autor e backup visíveis

**UX-URG-008 — Tela Configurações/Perfil do autor.** Nome civil, pseudônimo opcional, nome de publicação selecionável, endereço e telefone opcionais; não exigir conta nem contatos para escrever. Separar perfil global de metadados de cada livro e permitir override de autoria por projeto. Endereço/telefone permanecem privados e não entram em exports ou backups compartilháveis de livro por padrão; inclusão deve ser escolha explícita. Perfil precisa de persistência local, edição, limpeza e exportação/restauração próprias. Não armazenar contatos apenas em localStorage. Migração não substitui o autor já configurado nos projetos.

**UX-URG-009 — Central de backup.** Configuração de destino local, criar/verificar/restaurar, histórico de resultado, última cópia confirmada, periodicidade e retenção. Indicar o que foi incluído (textos, versões, anexos; perfil separado) e distinguir snapshot de backup. Falha de destino/disco/rede não apaga última cópia válida nem confirma sucesso. Restaurar primeiro em novo projeto, verificar checksums/referências e permitir teste de recuperação. Agenda/retencão precisam de operação local durável; download do navegador não equivale a backup automático em pasta escolhida.

### Última etapa antes do desktop — conexões simples (adiadas pelo usuário)

**UX-URG-010 — Google Drive, OneDrive e Dropbox como destinos de backup.** Tela “Conexões”: Conectar, escolher destino, testar, copiar backup, exibir última confirmação/erro e desconectar. Implementar provedor por provedor, com autorização real da conta, OAuth/callback adequado ao app local, escopos mínimos e armazenamento de credenciais separado dos projetos. Tokens não entram em JSON de livro, logs, URL de projeto ou pacote do modelo. Desconectar/revogar e expiração devem ser tratados. Não exibir estado “conectado” simulado nem enviar o manuscrito ao configurar a tela. Envio ocorre após seleção explícita do destino/ação; offline continua funcional. Depende da central de backup verificável e das garantias de persistência/recuperação exigidas pelo plano. A prioridade inicial é **backup para a nuvem**, não edição concorrente do agregado JSON sincronizado.

**UX-URG-011 — Conta Google versus armazenamento Drive.** Especificar separadamente “Entrar com Google” (identidade opcional) e “Conectar Google Drive” (destino de backup). Login não deve ser pré-requisito de uso local, nem indicar que backup está habilitado. Se login não trouxer função concreta na primeira entrega, disponibilizar a conexão de armazenamento antes dele e manter login como pendente explícito. Não confundir os conectores do assistente com integrações distribuídas dentro do WritingRoom.

**UX-URG-012 — Sincronização posterior, com integridade.** Sync contínuo/multidispositivo é entrega distinta de backup: requer revisões, conflitos, credenciais, recuperação e testes de interrupção/concorrência. Não apresentar uma pasta de arquivos sincronizada como se o JSON atual tivesse edição concorrente segura. Esta dependência não adia menus, perfil e organização locais.

## Verificação exigida e conclusão da fila

- Testes sintéticos de CRUD, duplicação/remapeamento, lixeira/arquivamento, drag válido/inválido/cancelado, filtros, falha de save e proteção de raízes.
- Firefox real: menus sem cliques acidentais, teclado/toque, arraste com eventos reais, edição/remover/restaurar em cada vista e persistência após reabrir.
- Perfil: contatos ausentes de export/backup de livro por padrão; autoria existente preservada.
- Backup/nuvem: credenciais ausentes dos projetos/logs; conexão, expiração, revogação, falha de upload e restauração verificadas antes de declarar integração pronta.
- Cópia restaurada do modelo privado do autor para integração com livro longo; original e backup-base intactos. Nenhum conteúdo privado incorporado a testes públicos.
- Cada item muda de “pendente” para “entregue” somente com UI funcional e evidência registrada em PROGRESS; atualizar esta fila e NEXT_SESSION. Não há estimativa de prazo nem aprovação de gates de produção implícita nesta priorização.
