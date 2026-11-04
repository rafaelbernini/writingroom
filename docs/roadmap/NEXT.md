# Próximas sprints

> **Prioridade vigente — 2026-11-02:** executar a [fila urgente de ações, organização e configurações](URGENT_UX_AND_SETTINGS.md), UX-URG-001–009 para recursos locais; Google/Drive/OneDrive/Dropbox (010–012) somente na última etapa antes do desktop. Auditoria realizada na alpha.6; pendências não são recursos entregues. Desktop por último.

## Expansão profissional registrada — sem implementação

[Roadmap profissional PRO-001–027](PROFESSIONAL_EDITORIAL_ROADMAP.md): modo Editor e carteira/permissões por obra; redline de autor/editor **com comparação lado a lado**; pacote criptografado com devolutiva **antes do acesso online por convite/e-mail**; sessão editável de publicação com pacote para editora; IA opt-in orientada por projeto; múltiplos tipos de escrita em Novo projeto. ADR-0012 e especificação/segurança detalham os critérios. Recursos locais atuais continuam primeiro; cloud Google/Drive/OneDrive/Dropbox imediatamente antes do desktop.

## Entregue nesta etapa (protótipo)
- [x] Project CRUD mínimo: criar, listar, abrir
- [x] Binder: capítulos e cenas, reordenação, lixeira e restauração
- [x] Texto simples com autosave após pausa
- [x] Metadados: título, sinopse, estado, inclusão na compilação
- [x] Snapshot básico e API de restauração
- [x] Busca local simples e exportação Markdown/TXT
- [x] Testes automatizados do core em Node nativo
- [x] Interface local experimental

## Fase seguinte — bloquear perdas de dados
- [ ] Migrar o core crítico para Rust, storage SQLite WAL, migrações e lock de processo
- [ ] Testes de crash e escrita simultânea, restore de backup verificável e read-only para versões futuras
- [ ] Incluir um journal ou protocolo de commit confiável para texto/metadados
- [ ] Diferenciar flush de editor de confirmação de persistência em disco

## Fase seguinte — editor profissional
- [ ] React, Vite, TipTap/ProseMirror com schemas versionados
- [ ] Import TXT/Markdown com preview e relatório
- [ ] Outliner e cartões projetando a mesma árvore
- [ ] Editor contínuo e split-pane, undo estrutural
- [ ] Acessibilidade validada e traduções pt-BR/en-US

## Antes de distribuição pública
- [ ] Auditoria de licenças, proveniência e testes Linux/macOS/Windows
- [ ] Builds e assinatura Tauri 2 por plataforma
- [ ] Testes de segurança e acessibilidade independentes
- [ ] Backups/restauração contra falhas reais
- [ ] Importadores Scrivener DOCX EPUB PDF separadamente, com fixtures autorizadas

## Continuidade após o inventário do manual (2026-11-02)

Consulte [PROGRESS](../development/PROGRESS.md) para o estado real e [NEXT_SESSION](../development/NEXT_SESSION.md) para a próxima tarefa. O [catálogo SCR-001–084](../specifications/SCRIVENER_CAPABILITY_MAP.md) amplia o escopo de referência sem saltar os gates.

- [x] Regressões de metadados, raízes, compilação aninhada e lixeira reproduzidas e corrigidas.
- [x] Lista/prévia de snapshots, criação nomeada e restauração expostas na UI; sem diff.
- [x] Testes de flush em DOM/rede simulados; sem E2E em navegador.
- [ ] Concluir WR-0A: segurança e concorrência HTTP, reporte de projetos inválidos.
- [ ] ADR-0002 e storage confiável antes da próxima expansão de produto.

### Segunda etapa de estabilização

- [x] Fila por projeto, hashes de base em texto/snapshots e testes HTTP reais em porta efêmera.
- [x] Host/Origin/JSON/bytes validados; erros públicos redigidos e biblioteca com entradas indisponíveis.
- [x] Temporários exclusivos e teste de limpeza após falha de rename.
- [ ] ADR-0002 e prova isolada de storage com revisão monotônica, lock, backup/restore e migração.

Não confundir fila por servidor com exclusividade entre processos. Evidências e limites em PROGRESS.

### Prova de armazenamento — 2026-11-02

- [x] ADR-0002 e adapter experimental isolado com revisão monotônica/idempotência.
- [x] Lock cooperante entre processos e backup/restore verificado em Linux, sem integração à UI.
- [x] 13 cenários de storage, incluindo SIGKILL e corrupção; total 50 testes passando.
- [ ] Migrador experimental com backup da fonte e relatório de equivalência, sem conversão in-place.
- [ ] DDL final, falhas de disco/publicação, plataformas e recovery UX antes do cutover/G1.

### Alpha.2 — implementação visível autorizada pelo usuário

- [x] Modelos e nova UI com quatro ambientes, cartões/outline e leitura contínua.
- [x] Notas/etiquetas/keywords/metas, referência, foco/tema/fonte e busca ampliada.
- [x] Importação TXT/MD com preview; split e comparação/restauração de versões.
- [x] Preview textual de publicação, MD/TXT/HTML, impressão do navegador, backup/restauração JSON e recuperação/conflito.
- [x] 66 testes Node e 19 verificações de fluxo Firefox; schema legado preservado.
- [ ] Próximo incremento visível: encontrar/substituir com preview/snapshots/CAS, seguido de editor semântico e anexos com migração segura.
- [ ] Continuar durabilidade/storage/migrador sem confundir prova isolada com recurso da aplicação em uso.

### Alpha.3 e nova prioridade: desktop por último

- [x] Encontrar/substituir literal com preview/seleção/snapshots/CAS e aplicação atômica.
- [x] Fichas textuais, coleções manuais/dinâmicas e capturas integradas, com preservação em backup.
- [x] DOCX básico validado no LibreOffice e EPUB experimental estruturalmente verificado.
- [x] 85 testes Node e 26 verificações de fluxo Firefox.
- [ ] Editor semântico integrado e migração reversível do conteúdo, revisão/anotações e anexos seguros.
- [ ] Importadores, pipeline editorial completo, EPUBCheck/readers, estilos e idiomas/dicionários.
- [ ] Durabilidade/migração/recuperação de produção e validação de plataformas.
- [ ] **Desktop/instaladores por último**. A ordem desktop-first anterior foi substituída pelo pedido mais recente do usuário; integridade acompanha todas as etapas.

### Alpha.4 — etapa editorial entregue

- [x] Editor semântico opcional na interface, estilos/listas/links, undo/redo, snapshots e exports.
- [x] Conversão explícita com backup integral verificado e proteção de schema 2.
- [x] 102 testes Node e 35 verificações Firefox; DOCX LibreOffice e EPUB estrutural.
- [ ] Comentários/footnotes ancorados, anexos/imagens/tabelas e revisão avançada.
- [ ] IME real, acessibilidade, EPUBCheck, importadores e integração de durabilidade.
- [ ] Desktop por último. Ver ADR-0003/PROGRESS; etapas anteriores são histórico.

### Alpha.5 — revisão integrada

- [x] Comentários privados e notas vinculadas, editar/ir/buscar/resolver/reabrir/excluir com versão/undo.
- [x] Âncoras em snapshots/backup/recuperação e hash de formato; publicação de notas finais por cena sem comentários.
- [x] 115 testes Node/41 verificações Firefox, DOCX LibreOffice e EPUB estrutural.
- [ ] Próximo: pesquisa/anexos com contrato de assets e backup completo; imagens e importadores ricos depois.
- [ ] Rodapés nativos, conversão de tipos, threads/busca global; acessibilidade/IME e durabilidade completos.
- [ ] Desktop permanece por último.

### Alpha.6 — pesquisa anexada

- [x] Anexos PNG/JPEG/PDF/TXT/Markdown com preview/confirmação, leitura de imagem/texto e download original.
- [x] Lixeira, busca, bytes/checksums no backup/restauração e formato 3 após backup integral verificado.
- [x] 129 testes Node/47 verificações Firefox; exports de livro seguem validados nos limites anteriores.
- [ ] Próximo: imagens inline com alt/legenda/tamanho, versões e exportação de assets; depois importadores ricos.
- [ ] Leitor PDF, OCR, referências externas, storage de assets de produção, i18n/acessibilidade e durabilidade completos. Desktop permanece por último.

### Alpha.7 — ações e organização entregues nos fluxos principais

- [x] Menu de projeto: editar dados/renomear, duplicar, backup, arquivar e restaurar.
- [x] Menus por documento/ficha/anexo e duplicação de subárvore com referências conhecidas remapeadas.
- [x] Arraste com alças em árvore/cartões/outline/leitura, Escape, hash estrutural e undo de sessão; recolher pastas.
- [x] 139 testes Node/56 verificações Firefox; caso privado longo em cópia isolada com 17 verificações.
- [ ] Próximo: UX-URG-005–009, pesquisa histórica/fontes, perfil e central de backup locais.
- [ ] Imagens inline/importadores e demais recursos locais continuam. Google/Drive/OneDrive/Dropbox ficam para a última etapa antes do desktop.

### Alpha.8 — catálogo/perfil/pesquisa locais

- [x] 16 modelos editáveis + preset histórico; autoria explicitamente copiada do perfil.
- [x] Perfil privado separado, salvar/backup/restaurar/limpar, sem contatos no backup da obra.
- [x] Fontes com metadados/links/classificação e vínculos/backlinks; atalhos de ficha/rascunho.
- [x] Formato 4 com backup integral; remapeamento de refs e preservação de formato maior.
- [x] 151 testes Node/62 fluxos Firefox, 20 verificações privadas do caso longo; exports mantidos.
- [ ] Próximo: central de backup verificável, comparação lado a lado/revisão local e sessão de submissão isolada.
- [ ] Campos tipados/retratos/timeline/PDF interno e interoperabilidade avançada; IA/pacote seguro após gates. Cloud imediatamente antes do desktop, desktop por último.

### Alpha.9 — central de backup local

- [x] Criar/verificar/baixar/restaurar em novo projeto, histórico por filtro e destinos preconfigurados.
- [x] Rotina opt-in com timer do servidor, intervalo/retencão/CAS, estado e reaproveitamento verificado de obra inalterada.
- [x] Retenção sem apagar manuais/migrações/corrompidos/incompletos; falha de destino/corrupção visível.
- [x] 162 testes Node/69 fluxos Firefox e 23 verificações privadas do livro longo.
- [ ] Próximo: comparação de versões lado a lado, revisão editorial local e sessão de publicação isolada.
- [ ] Backup externo/cifrado/agendador OS e G1 completo ainda pendentes. IA/E2EE/contas seguem gates; cloud imediatamente antes do desktop.
