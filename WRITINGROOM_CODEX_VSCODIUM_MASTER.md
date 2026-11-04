# WRITINGROOM — PLANO MESTRE DE CONTINUIDADE PARA CODEX / VSCODIUM

> **Arquivo operacional canônico:** `docs/development/CODEX_CONTINUATION_MASTER.md`  
> **Projeto:** writingroom — editor de escrita longa open source, local-first, multiplataforma  
> **Documento:** 1.1 (2026-11-02) — adendo de idiomas e dicionários na seção 21  
> **Base de código observada:** `writingroom@0.1.0-alpha.1` (protótipo Node.js)  
> **Modo de execução:** implementação incremental e auditável, sem saltar etapas  
> **Linguagem de comunicação e documentação:** português brasileiro; identificadores de código e APIs em inglês  
> **Este documento não é prova de que as funcionalidades propostas já foram implementadas.**

---

## 00. COMO USAR ESTE ARQUIVO NO VSCODIUM COM CODEX

1. Extraia `writingroom-alpha-0.1.0.zip` e abra **a pasta `writingroom-alpha`**, não o ZIP, no VSCodium.
2. Garanta que este arquivo esteja em `docs/development/CODEX_CONTINUATION_MASTER.md`. Se recebeu apenas este `.md`, salve-o exatamente nesse caminho.
3. Abra o terminal integrado e execute `node --version`, `npm test`, `npm run dev`. A versão inicial foi escrita para Node.js 20+; NÃO exige `npm install`.
4. Abra o painel do Codex e anexe/referencie este arquivo, `README.md`, `docs/specifications/writingroom_SPEC_v1.0.md`, `docs/architecture/adr/0001-foundation.md` e `docs/roadmap/NEXT.md`.
5. Cole o prompt da seção **01**. O agente deve iniciar com inspeção do repositório e baseline, não com uma reescrita imediata.
6. Depois de cada sessão, exija a atualização de `docs/development/PROGRESS.md` e `docs/development/NEXT_SESSION.md` conforme os modelos deste documento. Se não existirem, o agente deverá criá-los.
7. **Nunca entregue ao Codex chaves de API, senhas, tokens ou manuscritos reais para usar como fixture.**
8. O Codex pode ter diferentes permissões por ambiente. Revisar qualquer alteração de dependências, rede, exclusão de arquivos, scripts de sistema, alteração de segurança e commits antes de executar.

**Meta da primeira sessão Codex:** completar somente a auditoria do estado atual e um pequeno incremento verificável (preferência: testes de regressão/integração e validações de domínio); não converter todo o repositório para Tauri de uma vez.

### Hierarquia de verdade e resolução de conflitos

1. **Conteúdo real do repositório e resultados reproduzidos** determinam o que existe e funciona.
2. **Testes automatizados verificáveis** determinam o que foi demonstrado; não provam ausência de bugs.
3. **Este arquivo** governa o método de trabalho, marcos, gates e diretrizes de implementação.
4. `docs/specifications/writingroom_SPEC_v1.0.md` governa o objetivo funcional e IDs de requisito.
5. ADRs `docs/architecture/adr/*.md` governam decisões técnicas aprovadas; propostas futuras não se tornam decisões apenas por estarem aqui.
6. `docs/roadmap/NEXT.md` é o backlog resumido herdado, a ser reconciliado.
7. Referências Scrivener/BYOK/NEO são insumos conceituais, **não** código nem interfaces para copiar.

Em caso de contradição, **não** escolher silenciosamente: registrar a divergência, propor ADR ou issue, executar a decisão menos destrutiva. Guardar um projeto de teste migrado para provar a escolha.

---

## 01. PROMPT MESTRE PARA COLAR NO CODEX

```text
Você é o agente principal de engenharia do projeto open source writingroom. Trabalhe diretamente no workspace aberto do VSCodium. Leia, nesta ordem:
1) docs/development/CODEX_CONTINUATION_MASTER.md (integralmente, incluindo gates e anexos)
2) README.md
3) docs/specifications/writingroom_SPEC_v1.0.md
4) docs/architecture/adr/0001-foundation.md
5) docs/roadmap/NEXT.md
6) arquivos reais do código e testes relevantes.

Objetivo: evoluir o protótipo writingroom 0.1.0-alpha.1 com estabilidade, preservação de dados e testes, até um produto desktop open source profissional, sem falsa alegação de suporte a plataformas ou funcionalidades ainda não entregues.

Procedimento obrigatório de CADA SESSÃO:
A. Inspecione o estado do git, scripts e toolchains disponíveis. Não descarte alterações do usuário.
B. Execute o baseline dos testes e documente resultados, versão do Node e sistema. Se falharem, diagnostique primeiro.
C. Escolha a próxima tarefa desbloqueada de menor risco da seção 12, respeitando as dependências e os gates. Se a tarefa for grande, divida em PRs com menos escopo.
D. Antes de alterar código, escreva em 5–12 linhas o plano: objetivo, arquivos afetados, riscos, testes e rollback.
E. Implemente mudanças completas, pequenas, testáveis e coerentes com a arquitetura. NÃO faça refatoração massiva oportunista.
F. Rode testes unitários, integração, lint/typecheck/build quando disponíveis; se indisponíveis, diga por quê. Inclua testes novos para o comportamento alterado.
G. Atualize ADR, requisitos, changelog e docs quando pertinente. Atualize docs/development/PROGRESS.md e docs/development/NEXT_SESSION.md ao finalizar.
H. Resuma ao usuário: entregue, não entregue, comandos executados, evidências, arquivos modificados, riscos, próxima tarefa recomendada.

REGRAS INEGOCIÁVEIS:
- Nunca apague, sobrescreva, converta destrutivamente nem migre um projeto do usuário sem backup válido e possibilidade documentada de reversão.
- Não invente testes que não executou, dispositivos/sistemas que não validou ou resultados de benchmark.
- Nunca copie código proprietário ou imagens do Scrivener/BYOK; NEO é apenas inspiração nesta arquitetura 100% nova.
- Não implemente sincronização, IA, plugins remotos ou serviços na nuvem antes dos gates de segurança/durabilidade.
- Nunca exponha o servidor local à rede, desative proteções de Origin, ou dê acesso irrestrito ao filesystem.
- Ao encontrar falha de persistência, recuperação, migração ou consistência, priorize a correção sobre features visuais.
- Se algo exigir decisão de produto não resolvida, adote a alternativa reversível prevista no documento, registre-a e prossiga no restante seguro.
- Evite instalar dependências sem registrar licença, necessidade, alternativas e impacto de supply chain.
- Se criar arquivos automaticamente, inclua-os no repositório e explique a finalidade; não deixe binários/artefatos de build versionados sem decisão.
- Não execute comandos de deleção recursiva ou comandos git destrutivos sem aprovação do usuário.
- Trate pt_BR e en_US, localização da interface e gerenciamento de dicionários offline como requisitos obrigatórios da seção 21; não declare suporte apenas por haver tradução parcial ou corretor nativo do sistema.

Comece AGORA pelo estado atual: análise do código, testes e inventário de riscos. Em seguida implemente somente o próximo incremento liberado pelo gate. Não pergunte confirmação para tarefas rotineiras previstas; apresente decisões irreversíveis e riscos reais para aprovação.
```

### Prompt curto para sessões seguintes

```text
Continue o projeto writingroom a partir de docs/development/CODEX_CONTINUATION_MASTER.md, docs/development/PROGRESS.md e docs/development/NEXT_SESSION.md. Revalide estado do repositório e testes; execute a primeira tarefa desbloqueada, mantendo dados e compatibilidade. Ao final, atualize os dois documentos de continuidade com evidências dos testes, risco e próxima ação.
```

### Prompt de revisão de código antes de merge

```text
Atue como reviewer independente. Compare a branch atual com a base; procure regressões, perda de dados, corrida de escritas, incompatibilidade de schema, brechas de segurança (path traversal, XSS, CSRF/Origin, SQL injection), bugs de acessibilidade, alteração acidental do contrato público e testes insuficientes. Reporte achados por severidade, arquivo e linha; execute testes viáveis. Não aprove por ausência de falhas superficiais. Não reescreva tudo por preferência estilística.
```

---

## 02. ESTADO CONCRETO DO REPOSITÓRIO NA DATA DESTA INSTRUÇÃO

### 02.1 Evidências verificadas

- O ZIP original contém `package.json`, `apps/web/{server.mjs,index.html,app.js,style.css}`, `packages/core/src/{core.mjs,cli.mjs}` e `packages/core/test/core.test.mjs`.
- O `package.json` declara `writingroom@0.1.0-alpha.1`, `type: module`, `engines.node >=20`, scripts `dev`, `test`, `demo`, `cli`, licença Apache-2.0.
- Teste realizado em 2026-11-02 com `npm test`: **8 testes passaram, 0 falhas**. Isso mede somente os cenários presentes; NÃO valida persistência pós-crash nem operação em produção.
- O core em `packages/core/src/core.mjs` usa objetos JavaScript, `crypto.randomUUID()`, JSON salvo em `<id>.wroom/project.json` por escrita temporária e rename. `handle.sync()` é aplicado ao temporário, mas **não há fsync do diretório nem journal transacional**.
- Estrutura inicial contém três raízes `draft`, `research`, `trash`; nós `folder`, `text`, `research`; operações add/update/move/trash/restore/snapshot/search/compile.
- Exportação comprovada pelo core: Markdown e TXT, com estrutura simples. A interface expõe Markdown.
- Web: HTML/CSS/JS servido por processo Node ligado ao loopback; editor **plain text**, sem React, Vite, TipTap ou instalação desktop.
- `docs/architecture/adr/0001-foundation.md` já declara arquitetura temporária e necessidade de ADRs de storage, editor, Tauri e PWA.
- `docs/specifications/writingroom_SPEC_v1.0.md` contém requisitos identificados por LIB/STR/EDT/STO/INS/PUB/IMP/PLT/SYN/AI/EXT e marcos F0–F5.

### 02.2 Não implementado nesta baseline

**Não** alegar que estão prontos: Tauri 2, Rust, SQLite WAL, React/TipTap, editor rico, DOCX/PDF/ePub, importação Scrivener, painel de revisão de snapshots, backups verificáveis, sync, IA, plugins, PWA verdadeiramente offline, apps iOS/Android, colaboração em tempo real, CI validado nos três sistemas.

### 02.3 Limitações e bugs potenciais a investigar (hipóteses, não diagnósticos confirmados)

- `moveNode` altera um nó antes de `validate`; se validação falhar, examinar se objetos mutáveis ficaram em estado parcialmente alterado.
- `updateNode` aplica campos em sequência; se rejeitar título vazio, avaliar rollback e consistência do objeto em memória.
- `updateText` aceita atualizações sem revisão/CAS; duas sessões/requests podem sobrescrever conteúdo com último escritor ganhando.
- `saveProject` usa nome temporário fixo (`project.json.tmp`): testar concorrência e colisões.
- `listProjects` ignora silenciosamente projetos inválidos: risco de invisibilidade de arquivos recuperáveis.
- Restauração da lixeira e descendentes: testar preservação de hierarquia, flags `deleted`, caminho anterior e regras de compilação.
- `include_in_compile` herdado no `addNode` apenas ao criar diretamente na raiz Draft: testar nós aninhados e expectativas do usuário.
- `validate` confere algumas invariantes, mas pode precisar verificar `roots`, tipos, documentos, metadados, ordem, referências, IDs válidos e exclusão de referências não autorizadas.
- Contagem de palavras por espaços não cobre todas as línguas; documentar contagem como aproximação até haver definição estável.
- Reabrir o projeto após crash/degradação de FS, falta de espaço, permissões e links simbólicos não está validado.
- Servidor local sem autenticação completa: analisar CSRF/rebinding, origin, métodos, Content-Type, payload e requisições concorrentes antes de ampliar uso.

**Regra:** crie teste que reproduza cada falha antes de afirmar que ela existe. Não confunda hipótese com bug comprovado.

---

## 03. VISÃO DO PRODUTO E ESCOPO

**Proposta:** ambiente profissional de escrita longa com controle local de arquivos, estrutura flexível, fluxo editorial completo e interface acessível, sem exigir conta ou IA.

**Experiência em três perspectivas compartilhadas:**

- **Write Room:** escrever, revisar, visualizar manuscrito contínuo, comparar versões, metas e modo foco.
- **Story Room:** estrutura, planejamento, outliner, cartões, wiki, cronologia, pesquisa, entidades e relações.
- **Publish Room:** compilar com regras por seção, prévia, perfis, exportar e validar documentos.

**Biblioteca** é porta de entrada; **Core Documental** é a fonte canônica; **Platform Adapters** abstraem storage, janelas, filesystem e APIs nativas.

### 03.1 Personas e jornadas prioritárias

1. **Romancista:** criar romance → capítulos/cenas → mover cenas no corkboard → compilar Markdown/DOCX.
2. **Escritor iniciante:** projeto vazio → escrever sem configurar nada → salvar sem perda → exportar.
3. **Roteirista:** estrutura episódica e Fountain → formatar cenas → compilar (posteriormente).
4. **Acadêmico/não ficção:** notas e pesquisa → sumário → referências → documentos finais.
5. **Escritor migrando de outra ferramenta:** importar com prévia → relatório de perda → validar capítulos e anexos → exportar backup.

A experiência **não** deve obrigar fichas de personagens nem outline para começar a escrever. O mesmo nó deve se refletir em todas as vistas.

### 03.2 Objetivos explícitos

- Projeto existente deve abrir sem rede, conta ou servidor de terceiros.
- Dados do usuário sobrevivem à atualização do aplicativo e podem ser exportados em formatos documentados.
- Estrutura, ordenação, comentários, notas, cartões, pesquisa e conteúdo referenciam IDs estáveis.
- Salvamento exibe estado real: editando, pendente, confirmado, falhou; não confundir debounce da UI com disco persistido.
- O formato de projeto terá `schema_version`, manifesto, migrações e política de recuperação.
- Desktop vem **primeiro**; Web e Mobile exigem gates específicos, não promessas antecipadas.

### 03.3 Fora do MVP seguro

Sincronização E2EE, colaboração simultânea, plugins executáveis de terceiros, agentes de IA com acesso automático ao manuscrito, aplicativos mobile e assinatura de builds de produção. São épicos futuros, não atalhos para marketing.

### 03.4 Prioridades

- **P0:** escrever e não perder dados; biblioteca, documentos, navegação, editor, busca, importação simples, exportação simples, acessibilidade fundamental.
- **P1:** editor sofisticado, vistas e cartões, inspector, snapshots, backup, multi-export, importadores e release desktop.
- **P2:** wiki avançada, timeline, IA BYOK opt-in, sincronização, plugins e mobile.
- **P3:** colaboração multiusuário em tempo real e ferramentas exploratórias.

---

## 04. MAPA FUNCIONAL COMPLETO

**IDs do `SPEC_v1.0.md` são canônicos.** Para cada recurso registrar `ID -> issue -> teste -> módulo -> release` numa matriz de rastreabilidade. A lista abaixo explicita interações, não substitui o documento mestre.

### 04.1 Biblioteca / projetos

- Criar, abrir, renomear, duplicar, arquivar, remover com backup opcional e confirmação.
- Criar por template: em branco, romance, não ficção (scripts/academia posteriormente).
- Capa, cor, idioma, metas, datas e configurações por projeto.
- Filtro, favoritos, recentes, agrupamento por série/coleção, pesquisa em biblioteca.
- Determinar `project_id` imutável; duplicação requer **novos** IDs e atualização de links internos.
- Projeto corrompido deve aparecer com estado de recuperação, não desaparecer silenciosamente.
- Abrir projeto de schema desconhecido/futuro **somente leitura**, nunca converter automaticamente.

### 04.2 Binder / estrutura e metadata

- Hierarquia arbitrária e acíclica, com `Draft`, `Research` e `Trash` iniciais.
- Adicionar pasta, cena, texto, anotação, documento importado, asset/referência (quando schema suportar).
- Ordenação estável, indent/outdent, arrastar e soltar, mover para pasta; undo estrutural.
- Dividir/mesclar cenas com preservação de metadados, backlinks e referências.
- Lixeira reversível e restauração com local original quando disponível; eliminação irreversível explícita.
- Sinopse, status, etiqueta, keywords, notas, prioridade, personagem POV e campos customizados.
- Coleções são **views por referência**, não cópias físicas de nós.
- Cards e outline compartilham armazenamento e IDs do Binder.

### 04.3 Editor de texto

- Schema semântico versionado (paragraph, heading, bold, italic, blockquote, list, links, hardbreak, separator, image-ref futuro).
- Suporte a seleção, undo/redo, clipboard seguro, IME, Unicode, leitura de tela, shortcuts ajustáveis.
- Salvamento transacional com revisão/baseRevision; debounce de UI NÃO equivale a confirmação.
- Status visível e acessível: `unsaved -> saving -> saved` ou `error/conflict/recoverable`.
- Históricos de revisão: snapshots nomeados, comparação diff e restaurar como **nova revisão**.
- Modo foco, apresentação do texto, largura, zoom, tipografia, tema e modo máquina de escrever.
- Contagem de palavras/tempo/metas, sem alertas manipulativos.
- Manuscrito contínuo que renderiza múltiplas cenas, mas persiste cada uma em seu próprio documento.
- Dois painéis independentes; suportar referência/pesquisa junto ao texto no desktop.

### 04.4 Planejamento / Story Room

- Outliner em lista/tabela com colunas configuráveis, filtros, status e reordenação.
- Corkboard com cartões, sinopses, cores e drag/drop; atualização atômica da árvore.
- Quadros livres com lanes e cartões apontando para objetos reais.
- Wiki: personagens, locais, objetos, organizações, eventos e conceitos com campos tipados.
- Relações: personagem participa de cena, local de cena, ordem cronológica e referências internas; backlinks.
- Timeline ficcional com fuso, calendário fictício opcional e separação da ordem do livro.
- Scratchpad local de capturas rápidas, transformando nota em objeto formal sem perder origem.
- Biblioteca de pesquisa com PDF/imagens/links externos, permissão de acesso e checagem de assets ausentes.
- Detector de inconsistências com evidência, jamais alterações automáticas irreversíveis.

### 04.5 Inspector / busca

- Inspector contextual da seleção ativa; não confundir painel selecionado com objeto cujo texto está em foco.
- Abas: sinopse, notas, metadados, referências, bookmarks, comentários, snapshots.
- Busca por título, texto, sinopse e metadata, com filtros de escopo e destaques.
- Busca incremental FTS5 depois da migração para SQLite; reindexação verificável.
- Localizador rápido e paleta de comandos; atalho de teclado documentado.

### 04.6 Publish Room

- Compilação é **função pura**: estrutura + configurações + conteúdo -> AST intermediária -> exportador.
- Ordem de capítulos e exclusões pela árvore, sem copiar/mover conteúdo para gerar saída.
- Versão inicial: Markdown e TXT UTF-8; depois HTML, DOCX, ePub 3, PDF e Fountain.
- Perfis de exportação: rascunho, revisão, manuscrito de submissão, impressão, ebook, roteiro.
- Designer de formatos declarativo, versionado e sem scripts arbitrários.
- Relatório de saída: warnings de assets, links, caracteres, conteúdo omitido e metadados incompletos.
- Testes de documento final (estrutura, cabeçalhos, sumário, metadados, notas, ordem) com golden fixtures.

### 04.7 Importação e interoperabilidade

- Prioridade: TXT/Markdown com preview, divisão opcional por headings, codificação e resultado auditável.
- Depois DOCX, RTF, OPML, HTML, Fountain, Scrivener `.scriv/.scrivx` com **fixtures próprias e licenciadas**.
- Mostrar ao usuário objetos que não puderam ser importados e propriedades perdidas; jamais alegar fidelidade perfeita.
- Não escrever no arquivo de origem, não executar macros, não carregar recursos externos automaticamente.
- Mitigações de ZIP bomb, traversal, symlink malicioso, XML entity expansion, links perigosos e path spoofing.

### 04.8 Plataforma, IA, plugins e sync

- Tauri desktop com APIs mínimas, capabilities restritas e hardening por SO.
- PWA após isolamento do core, persistindo no navegador com IndexedDB/OPFS sem depender de servidor Node.
- Mobile só quando UX, storage e testes por SO estiverem demonstrados.
- IA BYOK/local e opt-in: o manuscrito não sai do computador sem confirmação clara; prompts e diffs auditáveis.
- Plugins com API versionada e isolamento forte; não expor filesystem arbitrário.
- Sync futura sobre objetos/operações, nunca copiar banco SQLite aberto como protocolo de sync.

---

## 05. ARQUITETURA-ALVO E ADAPTAÇÃO GRADUAL

### 05.1 Stack **proposta**, não instalada

| Camada | Opção-alvo | Situação atual | Observação |
|---|---|---|---|
| Desktop | Tauri 2 | Ausente | Rust + WebView nativa, revisar capacidades por versão |
| UI | React + TypeScript + Vite | HTML/JS | Migrar sem quebrar API/testes do core |
| Editor | TipTap/ProseMirror | textarea simples | Schema semântico, markdown conversor e clipboard seguro |
| Componentes | UI acessível + Tailwind, se justificado | CSS próprio | Auditabilidade, RTL eventual, contrastes, teclado |
| Domínio | TypeScript puro + serviços Rust conforme necessidade | JS `.mjs` | Não manter lógica duplicada indefinidamente |
| Storage nativo | Rust `rusqlite`/`sqlx` após ADR | JSON | Escolher biblioteca conforme schema e build |
| DB | SQLite WAL + migrações | JSON arquivo | WAL não substitui backups/locks/testes |
| Busca | SQLite FTS5 | Busca linear | Sincronização de índice e schema |
| Web | Adapters OPFS/IndexedDB, eventual WASM | Node HTTP local | Modo browser precisa storage independente |
| Tests | Node tests + Rust tests + Vitest/Playwright | Node tests | CI em 3 SO; E2E quando UI estável |
| Monorepo | pnpm workspace + Turborepo (opcional) | npm simples | Não adotar Turborepo sem necessidade comprovada |

Não adicionar dependência só para alcançar aparência de stack moderna; registrar ADR de cada decisão arquitetural significativa.

### 05.2 Arquitetura hexagonal

```text
┌──────────────────────────────────────────────────────────┐
│ User Interface (React) — Write / Story / Publish         │
├──────────────────────────────────────────────────────────┤
│ Application / use cases — commands, queries, undo        │
├──────────────────────────────────────────────────────────┤
│ Domain — IDs, trees, docs, versions, metadata, compiler  │
├──────────────────────────────────────────────────────────┤
│ Ports — ProjectRepo, BlobStore, Search, Export, Clock    │
├──────────────────────────────────────────────────────────┤
│ Adapters — SQLite/Rust, browser storage, import, Tauri   │
└──────────────────────────────────────────────────────────┘
```

- Domínio deve funcionar sem UI, Tauri, rede ou filesystem concreto.
- Regras de projeto, árvore e identidade em um só núcleo canônico, ou `domain-core` com contratos compartilhados gerados.
- UI acessa **use cases** e não SQL diretamente.
- `ProjectRepository` encapsula transações/migrações e conflitos.
- Exportação trabalha com snapshots consistentes de leitura, nunca com estado parcialmente salvo.
- Eventos de domínio podem alimentar índices/views, mas não devem ser única fonte de verdade sem recovery.

### 05.3 Estrutura de diretórios **alvo**, criar somente quando necessário

```text
writingroom/
├── apps/
│   ├── desktop/                    # Tauri + interface
│   ├── web/                        # Frontend/PWA
│   └── mobile/                     # futuro, não criar vazio sem propósito
├── packages/
│   ├── domain/                     # entidades e invariantes
│   ├── application/                # casos de uso
│   ├── editor/                     # schema e UI editor
│   ├── ui/                         # design system
│   ├── import-export/              # adapters e AST
│   ├── i18n/                       # pt-BR e en-US
│   └── contracts/                  # APIs/DTOs versionados
├── crates/
│   ├── writingroom-storage/        # DB e transações
│   ├── writingroom-native/         # serviços nativos
│   └── writingroom-import/         # importers críticos (quando útil)
├── docs/
│   ├── specifications/
│   ├── architecture/adr/
│   ├── development/
│   ├── security/
│   ├── product/
│   └── testing/
├── fixtures/                       # somente conteúdo sintético/licenciado
├── scripts/
└── .github/workflows/
```

**IMPORTANTE:** a árvore real atual é muito menor. Alterar por passos e preservar `npm test` até a substituição ser comprovada.

### 05.4 Limites de responsabilidade

- `domain`: invariantes, políticas, eventos e regras puras.
- `application`: autorização do caso de uso, transações, audit log, erros tipados, orchestration.
- `storage`: SQL, migrations, WAL, locks, backups, repair; não deve conhecer componentes React.
- `editor`: conteúdo ProseMirror, seleção, toolbar, autocorreção; não deve fazer SQL diretamente.
- `search`: indexação, query segura, resultados com fonte e destaque.
- `publish`: compile AST e exportadores determinísticos.
- `platform`: diálogos de arquivos, clipboard, notificações e keyring com capabilities restritas.

---

## 06. MODELO DE DOMÍNIO — INVARIANTES OBRIGATÓRIAS

### 06.1 Entidades e IDs

- `Project`: `id: UUID`, nome, idioma, created/updated, schema, settings.
- `Node`: `id: UUID`, `projectId`, `parentId`, tipo, título, status, sortKey, deletedAt, metadados.
- `Document`: `nodeId`, conteúdo semântico versionado, revisão, checksum, timestamps.
- `Revision`: id, parent/base revision, autoria (local por padrão), hash, timestamp, motivo.
- `Snapshot`: revisão imutável apontada, rótulo, timestamps.
- `Asset`: id, hash, MIME identificado por análise, nome seguro, tamanho, metadados.
- `Reference`: origem, destino, tipo, status, integridade.
- `Collection`: conjunto de IDs ou consulta; não é nó físico.
- `CompileProfile`: regras versionadas de seleção/estilo e formato alvo.
- `ImportReport`: objetos convertidos, ignorados, avisos, erros e severidade.

### 06.2 Regras formais

1. UUIDs imutáveis; nunca derivar identidade de título, path ou índice.
2. Todo nó tem um único projeto; no máximo um pai físico; nenhum ciclo, inclusive durante operações concorrentes.
3. Root nodes protegidos contra mover/apagar e renomeáveis apenas se a política permitir.
4. A operação de mover atualiza pai e ordenação **atomicamente**.
5. Excluir não é o mesmo que apagar dados; lixeira deve guardar proveniência/restauração.
6. Um documento editado em `revision=N` deve exigir revisão/base apropriada antes de sobrescrever `N+1`.
7. Snapshot é imutável. Restaurar cria nova revisão com vínculo auditável.
8. Assets só entram em backups/publicação quando referenciados ou por política explícita.
9. Compilação filtra por escopo/estado/ordem definidos em um snapshot consistente.
10. Schema futuro abre com proteção; schema antigo migra **somente após backup válido**.
11. Conteúdo originado externamente deve ser tratado como não confiável (HTML, Markdown, ZIP, XML, scripts, PDF).
12. Qualquer comando multi-objeto é transacional ou tem protocolo de compensação/recovery explícito.

### 06.3 Contratos mínimos ilustrativos (não interfaces já implementadas)

```ts
type ProjectId = string & {readonly __brand: 'ProjectId'};
type NodeId = string & {readonly __brand: 'NodeId'};
type Revision = number;

type SaveDocumentCommand = {
  projectId: ProjectId;
  nodeId: NodeId;
  baseRevision: Revision;
  schemaVersion: number;
  content: unknown;   // validado com schema estrito
  operationId: string; // idempotência
};

type SaveResult =
  | {ok: true; revision: Revision; contentHash: string; durability: 'committed'}
  | {ok: false; reason: 'conflict'; currentRevision: Revision}
  | {ok: false; reason: 'validation' | 'io' | 'readonly' | 'locked'; message: string};

interface ProjectRepository {
  open(id: ProjectId, mode: 'read' | 'write'): Promise<ProjectSession>;
  saveDocument(command: SaveDocumentCommand): Promise<SaveResult>;
  moveNode(args: {projectId: ProjectId; nodeId: NodeId; newParentId: NodeId; position: number; operationId: string}): Promise<void>;
  createBackup(id: ProjectId, destination: string): Promise<{checksum: string; manifestPath: string}>;
  verifyBackup(path: string): Promise<{valid: boolean; errors: string[]}>;
}
```

**Nota:** `durability: 'committed'` só pode ser retornado após a garantia realmente definida pela implementação e documentação; não prometer resistência absoluta a qualquer hardware/OS.

### 06.4 Migração JSON legado → formato novo

- Identificar `project.json` antigo por `schema_version: 1` e cópia intacta.
- Criar backup checksum da **origem** em diretório separado antes de converter.
- Planejar mapeamento preservando `project.id`, nós, árvore, ordem, textos, snapshots, status e sinopses.
- Importar para **novo destino staging**, validar contagens/hashes e só então oferecer ativação.
- Jamais converter in-place como único exemplar; manter caminho de reversão.
- Gerar `migration-report.json` com IDs mapeados, avisos e diferenças.
- Falha de importação deixa original abrível na versão antiga.
- Testes devem cobrir legado válido, inválido, incompleto, truncado, Unicode, anexos futuros, snapshots, duplicates e schema desconhecido.

---

## 07. PERSISTÊNCIA E INTEGRIDADE — PRIORIDADE ABSOLUTA

### 07.1 ADR-0002 obrigatório antes de substituir armazenamento

A ADR deve decidir, justificando trade-offs:

- Pacote `.wroom`: diretório editável vs arquivo ZIP de intercâmbio; **não** tratar um ZIP aberto como DB transacional.
- SQLite como banco canônico do projeto, WAL para processos locais; políticas de checkpoint e rollback.
- Conteúdo rico em JSON por documento no SQLite vs blobs externos por hash; regra de commit multi-recurso.
- Lock por projeto e detecção de processos; `read-only` fallback e instruções recuperáveis.
- Migrações `up`, compatibilidade futura, backup/restore, journal, checksums e operação idempotente.
- Política de fsync, `PRAGMA foreign_keys`, `busy_timeout`, `journal_mode`, `synchronous`, integridade e `quick_check`.
- Política para WAL/SHM em diretórios portáteis e volumes externos; não sincronizar cópia de banco aberto.
- Backup consistente via API de backup SQLite ou mecanismo equivalente validado, com manifesto verificável.
- Teste de corrupção intencional e recuperação; o objetivo é recuperação segura, **não** prometer reparo mágico.

### 07.2 Protocolo esperado de salvamento

1. Editor produz mudança local e marca `unsaved`.
2. Debounce apenas agrupa mudanças. Não equivale a persistência.
3. Aplicação transmite `baseRevision + operationId + payload` com limites definidos.
4. Repositório valida schema/permissão/revisão, inicia transação e atualiza conteúdo + metadados relacionados.
5. Após commit, retorna revisão/hash; UI marca `saved` apenas após confirmação.
6. Falha deixa edição disponível localmente com aviso e opção de repetir/exportar recuperação.
7. Conflito preserva ambas versões e oferece resolução explícita; não usa last-write-wins cego.

### 07.3 Testes obrigatórios de falha

- Encerrar processo durante escrita e durante checkpoint; reabrir, validar `integrity_check` e revisão anterior/atual consistente.
- Dois processos abrindo mesmo projeto: um escritor, outro read-only ou erro informativo.
- Salvar após falta de espaço, permissão negada e arquivo bloqueado.
- Impedir corrupção com `baseRevision` antiga (optimistic concurrency).
- Falha ao criar backup, backup interrompido, backup verificado e restore em pasta limpa.
- Falha de migração, restauração do original, log verificável e sistema read-only.
- Projeto legado intacto após processo falho de importação.
- Testar NTFS, ext4 e APFS **quando as plataformas estiverem disponíveis**; não fingir resultado cross-platform.

### 07.4 Definição de backup de confiança

- Backup tem `manifest.json` com versão, IDs, data, contagem de nós, revisões, lista de arquivos/hashes e algoritmo.
- Verificação recalcula hashes sem depender de arquivos do projeto original.
- Restore faz staging, valida e só então ativa novo destino; não sobrescreve automaticamente projeto aberto.
- Retenção e rotação são configuráveis. Nunca excluir o único backup válido.
- Snapshot **não** substitui backup externo.

---

## 08. EDITOR SEMÂNTICO E FLUXO DE REVISÃO

### 08.1 ADR-0003 / Schema TipTap

- Escolher versões compatíveis de TipTap/ProseMirror apenas após verificação de licença e manutenção.
- Schema versionado com `doc`, `paragraph`, `text`, `heading`, `bulletList`, `orderedList`, `listItem`, `blockquote`, `horizontalRule`, `hardBreak`, marks `strong`, `em`, `code`, `link`.
- Adicionar imagem/referência, notas e comentários por migrações específicas, não como HTML livre arbitrário.
- Definir validação de JSON no backend, limite de tamanho, enlaces aceitos, sanitização de paste e exportação.
- Tratar `contentEditable`, composition events, idiomas com acentos, ligaduras, emojis, caracteres combinados e CJK.
- Undo de editor e undo estrutural são fluxos separados que precisam de UX previsível.
- Persistir seleção/cursor como preferência efêmera, nunca como motivo para reescrever o documento inteiro sem necessidade.

### 08.2 Pipeline `Markdown -> AST -> DocSchema -> AST -> Markdown`

- Determinar semântica suportada por versão.
- Parser seguro, links válidos e imagens com resolução explícita.
- Fixtures com listas aninhadas, títulos, blockquotes, tabelas quando suportadas, HTML cru, emojis e notas.
- Medir round-trip semântico; distinguir diferenças de layout de perda real de conteúdo.
- Em importações, mostrar relatório de conversão **antes** de persistir o projeto.

### 08.3 Acessibilidade do editor

- Tab order previsível, foco visível, labels e estados anunciados por aria-live quando pertinente.
- Navegação com teclado pelos painéis, comandos e cartões.
- Contraste mínimo WCAG 2.2 AA onde aplicável; zoom 200% e reflow.
- Testar leitores de tela disponíveis (NVDA/VoiceOver/Orca) sem inventar cobertura.
- Ausência de animações obrigatórias; respeitar `prefers-reduced-motion`.

---

## 09. UI/UX — DESIGN SYSTEM E FLUXOS

### 09.1 Direção visual

Interface literária limpa, com tipografia excelente, espaços generosos, painéis discretos, foco no texto e complexidade progressiva. Não copiar ícones, mockups, assets nem a composição proprietária de referências.

**Estados essenciais de tela:** vazio, carregando, não salvo, salvando, salvo, conflito, read-only, offline, recuperação, erro, importação parcial e exportação concluída.

### 09.2 Composição desktop

```text
┌─────────────────────────────────────────────────────────────────┐
│ Titlebar / Projeto / Buscar / Alternar Write–Story–Publish      │
├──────────────┬────────────────────────────────┬─────────────────┤
│ Binder       │ Tabs / Editor ou Cards         │ Inspector       │
│ - Draft      │                                │ Sinopse         │
│ - Research   │ [Cena em edição]               │ Notas/Status    │
│ - Trash      │                                │ Metadata        │
│ Collections  │                                │ Snapshots       │
├──────────────┴────────────────────────────────┴─────────────────┤
│ Status: palavras • revisão • salvamento • metas • idioma        │
└─────────────────────────────────────────────────────────────────┘
```

- Painéis configuráveis, layout salvo localmente, min/max acessível e restauração de layout.
- Modo foco remove chrome, mas preserva recuperação e status de salvamento.
- Paleta de comandos e atalhos devem possuir navegação não dependente de mouse.

### 09.3 Mobile futuro

Uma coluna por vez, painel de navegação como drawer, toolbar contextual, preview/exportação simplificada. Não reduzir desktop para tela estreita sem pesquisa de UX.

### 09.4 Estados e critérios por fluxo

**Criar livro:** formulário simples (nome), criação atômica, abrir documento vazio; erro preserva entrada.  
**Adicionar cena:** aparece no Binder e nas cards, ID permanece ao mover.  
**Escrever:** nenhum texto some ao mudar foco; status indica commit real.  
**Reabrir:** cursor pode voltar quando seguro, texto idêntico ao último commit confirmado.  
**Exportar:** perfil selecionado, caminho autorizado, relatório e arquivo verificável.  
**Importar:** mostra preview, relatório e confirmação antes de gravar.

---

## 10. SEGURANÇA, PRIVACIDADE, LICENÇAS E OPEN SOURCE

### 10.1 Requisitos de segurança

- **Local by default**: nenhum manuscrito, contagem de palavras ou metadado é transmitido para terceiros sem ação explícita.
- Sem telemetria oculta; qualquer telemetria futura deve ser opt-in, documentada e redigida.
- Server Node atual: bind exclusivo a `127.0.0.1`, checar Origin/Host, rejeitar métodos e Content-Types não suportados, limitar payload e proteger contra DNS rebinding; nunca abrir firewall automaticamente.
- Tauri: capacidades e comandos explícitos por janela; não expor shell, filesystem global nem HTTP arbitrário a conteúdos não confiáveis.
- Importação: ZIP path traversal, links simbólicos, ZIP bombs, XML entities, HTML scripts, caracteres de controle e arquivos gigantes.
- Rendering: evitar `innerHTML` de conteúdo do escritor; links `javascript:`/data não confiáveis; CSP restritiva.
- Biblioteca: não percorrer caminhos externos não autorizados; nunca escrever fora de diretórios aprovados.
- Dependencies: versões travadas e lockfile; scanner de vulnerabilidades sem aceitação cega; SBOM para release.
- Chaves de IA: keychain/credential manager nativo; sem armazenar em project DB, exports ou logs.
- Logs não incluem conteúdo de manuscritos por padrão; redaction e política de retenção.

### 10.2 Open source

- Licença atual: **Apache-2.0** em `LICENSE`; manter enquanto não existir decisão deliberada de mudança.
- Preservar NOTICE/atribuições quando exigidas por dependências.
- Antes de adicionar biblioteca, anotar: nome, versão, licença, finalidade, alternativas, manutenção, CVEs conhecidos e custo de bundle.
- Contribuições: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (a criar), `SECURITY.md`, issue templates, PR template, governança e releases.
- Não extrair nem redistribuir conteúdo integral ou diagramas do manual Scrivener; manual fornecido é referência de análise privada.
- Não clonar marca/ícones/desenho BYOK ou NEO. A decisão é arquitetura 100% nova.

### 10.3 Threat model mínimo (atualizar nas fases)

| Ativo | Ameaça | Controle | Teste |
|---|---|---|---|
| Manuscrito local | Sobrescrita/perda | lock, revisão, transação, backup | concorrência/crash |
| UI local HTTP | Outro site executa requisições | Host/Origin, anti-CSRF, bind loopback | requests cross-origin |
| Import ZIP/XML | Path traversal / expansão | validação, limites e parser seguro | fixtures maliciosas |
| Texto/HTML | XSS | sanitizer, CSP, AST | clipboard/import adversarial |
| Export | Escapes e links perigosos | escaping por formato | golden/adversarial |
| Dependências | Supply chain | lockfile, auditoria de licença, hashes | CI e revisão |
| IA futura | Vazamento de textos | opt-in por operação, scope preview | testes de consentimento |
| Plugins futuros | Arbitrary code/FS | sandbox/capabilities | permissão negativa |

---

## 11. ESTRATÉGIA DE TESTES, QUALIDADE E GATES

### 11.1 Pirâmide de testes

1. **Domínio:** funções puras, árvores aleatórias sem ciclos, invariantes, undo e contagens.
2. **Armazenamento:** commit, recovery, migrações, lock, hashes, backup/restore.
3. **Aplicação:** use cases, conflitos, erros tipados, import/export.
4. **UI:** fluxo de teclado, foco, autosave, troca de cena, cartões e status.
5. **E2E:** criar → escrever → salvar → encerrar → reabrir → reorganizar → exportar.
6. **Compatibilidade:** Linux, Windows, macOS, PWA/mobile posteriormente; registrar plataformas testadas.
7. **Segurança:** conteúdo adversarial, malformed input, fuzzing para importadores, CSP, permissions.
8. **Performance:** baseline reproduzível; medir abertura de projetos grandes, movimentação e busca.

### 11.2 Gates de produto

- **G0 — Baseline**: testes existentes passam e estado/limitações estão registrados.
- **G1 — Proteção de dados**: mutations reversíveis em memória, storage estável, lock, recovery testado, migração legado verificável.
- **G2 — Editor**: rich-text versionado, feedback de commit, IME/undo/clipboard validados.
- **G3 — Múltiplas vistas**: cards, outliner, manuscrito refletem a mesma árvore sem divergências.
- **G4 — Interoperabilidade**: import preview/relatório e export Markdown/TXT/HTML round-trip; depois DOCX/ePub/PDF.
- **G5 — Desktop público**: CI dos três SO, installers, backup real, a11y, segurança, documentação e release candidate.
- **G6 — Web/Mobile**: adapters storage nativos e gates específicos concluídos.
- **G7 — Sync/Plugins/IA**: threat model e permissões específicos revisados, sem regressão de offline.

### 11.3 Critérios de aceite concretos

- AC-01: texto digitado é reaberto após término normal/crash simulado sem corrupção; indicar o que foi confirmado.
- AC-02: mover cena por qualquer vista preserva ID, texto, links e ordem de exportação.
- AC-03: restaurar snapshot cria revisão nova, mantendo anterior.
- AC-04: lixeira e restauração preservam subárvore e referências.
- AC-05: Markdown import/export mantém semântica suportada, com relatório de perdas.
- AC-06: negar path traversal, HTML scripts e acesso à rede não autorizado.
- AC-07: verificar backup e restaurar em instalação limpa com hashes/contagens.
- AC-08: gerar DOCX/PDF/ePub coerentes com source (somente quando implementados).
- AC-09: fluxos principais navegáveis por teclado/leitor de tela.
- AC-10: alterar idioma de UI não altera o manuscrito.
- AC-11: schema futuro abre read-only, sem mutação silenciosa.
- AC-12: todas funções P0 operam offline.

### 11.4 Números de desempenho são **alvos propostos**, nunca resultados medidos

- Testar projetos com 1 mil, 10 mil e 100 mil nós em fixtures sintéticas.
- Testar documentos de 10k, 100k e 1M caracteres e projeto de 1M palavras, separando cada escala.
- Medir tempo de abertura, latência de digitação, busca, compile, consumo de RAM e tamanho em disco.
- Definir thresholds após benchmark em hardware de referência; evitar números inventados.

### 11.5 Definição de pronto (DoD) universal

- Requisito/issue e escopo registrados.
- Testes executados e logs reais sintetizados.
- Sem regressão do `npm test` legado (até aposentadoria formal do core antigo).
- Migração/rollback documentados, se houve mudança de schema/dados.
- Casos de erro e logs sem dados pessoais tratados.
- UX teclado, foco e leitores de tela considerado quando UI.
- Dependências/licenças auditadas e lockfile atualizado.
- Docs, ADR e matriz de rastreabilidade atualizadas.
- Nenhuma afirmação de suporte cross-platform sem execução real de CI ou teste.

---

## 12. ROADMAP EXECUTÁVEL — ÉPICOS, DEPENDÊNCIAS E ORDEM SUGERIDA

### Roadmap por releases

| Release | Objetivo | Gate | Regra de parada |
|---|---|---|---|
| 0.1.x | estabilizar protótipo, corrigir invariantes/concorrência, documentar API | G0 | sem testes de regressão novos, não avançar |
| 0.2.x | storage robusto, migração + backup + recovery; fundação Rust/Tauri por ADR | G1 | se recovery falhar, não migrar editor |
| 0.3.x | React/TipTap, schema semântico e autosave confirmado | G2 | se conteúdo não sobreviver ao restart, bloquear release |
| 0.4.x | outliner, cartões, inspector e múltiplas vistas consistentes | G3 | qualquer diferença entre vistas bloqueia |
| 0.5.x | importação TXT/MD + exportadores + integração E2E | G4 parcial | perdas não reportadas bloqueiam |
| 0.6–0.9 | pesquisa, wiki, comentários, DOCX/ePub/PDF, QA desktop | G4/G5 parcial | gates reavaliados a cada etapa |
| 1.0 | desktop estável em Windows/Linux/macOS | G5 | não lançar sem backup/instalador validado |
| pós-1.0 | PWA, mobile, IA BYOK, sync, plugins | G6/G7 | módulos independentes e opt-in |

**Estes números são planejamento, não calendário nem promessa de prazo.**

### 12.1 EPIC WR-0A — Auditoria e proteção imediata (próximo trabalho)

**Dependências:** nenhuma. **Prioridade:** máxima. **Tamanho:** 3–6 PRs pequenas.

- [ ] `WR-0A-01` Criar `docs/development/PROGRESS.md`, `NEXT_SESSION.md`, `TRACEABILITY.md`; registrar baseline real de Node/testes/árvore e git.
- [ ] `WR-0A-02` Acrescentar testes que demonstrem invariantes antes/depois de operações **que falham** (move circular, update inválido, raiz, tipo, ID).
- [ ] `WR-0A-03` Tornar mutações de domínio **all-or-nothing** em memória (validar antes do commit ou operar em draft/cópia; não substituir referências sem planejamento).
- [ ] `WR-0A-04` Testar operações aninhadas da lixeira, restauração, ordens de compile, `include_in_compile`, busca e snapshots; corrigir falhas confirmadas.
- [ ] `WR-0A-05` Auditar endpoints `apps/web/server.mjs` para Origin/Host, limite de payload, error disclosure, path validation, corrida de saves; registrar ameaça e teste adversarial.
- [ ] `WR-0A-06` Tornar `listProjects` capaz de reportar projetos inválidos/erro de leitura sem descartá-los invisivelmente; fornecer recovery UX simples.
- [ ] `WR-0A-07` Criar testes de API HTTP e fluxo mínimo de usuário de maneira determinística; evitar depender da porta fixa em CI.
- [ ] `WR-0A-08` Introduzir política de logs e diagnóstico sem incluir texto do usuário por padrão.

**Gate:** oito testes legados + novos passam, nenhum mutador deixa objeto parcial após rejeição, falhas da API são visíveis e não propagam corrupção.

### 12.2 EPIC WR-0B — ADR de armazenamento e migração

**Dependências:** WR-0A. **Prioridade:** máxima.

- [ ] `WR-0B-01` ADR-0002 com schema `.wroom`, journal, WAL, lock, protocolo de salvamento, recovery e backup.
- [ ] `WR-0B-02` ADR-0004 Tauri capabilities e boundary Rust/JS; provar toolchain e build mínimo, sem abandonar Node prematuramente.
- [ ] `WR-0B-03` Definir SQL DDL v1: project, node, doc, revision, snapshot, asset, reference, compile_profile, migration_log; chaves/constraints/índices.
- [ ] `WR-0B-04` Criar storage SQLite em adapter isolado e testes de transação/concorrência.
- [ ] `WR-0B-05` Lock de projeto com leitura protegida e recuperação de lock abandonado sem violar exclusividade.
- [ ] `WR-0B-06` Backup consistente, hash, verify, restore staging, testes de falha.
- [ ] `WR-0B-07` Migrador JSON legado com relatório e teste de equivalência, mantendo origem intocada.
- [ ] `WR-0B-08` Testes fault injection/crash e documentação de limites do SO.
- [ ] `WR-0B-09` Resolver modelo de conflitos por revisão e idempotência de comando.

**Gate:** G1; não implementar salva-vidas fictício baseado em `setTimeout` ou snapshot apenas na mesma pasta.

### 12.3 EPIC WR-0C — Workspace moderno e desktop shell

**Dependências:** ADR de boundaries e prova básica do storage. Pode avançar UI em branch isolada sem substituir persistência.

- [ ] `WR-0C-01` Separar core/domain/application e interfaces de repository.
- [ ] `WR-0C-02` Introduzir TypeScript, tsconfig strict, eslint/prettier se justificados, lockfile.
- [ ] `WR-0C-03` Introduzir Vite/React mantendo comandos documentados; evitar quebra do fluxo simples.
- [ ] `WR-0C-04` Criar Tauri 2 skeleton com capability mínima e comando `health` para validar IPC.
- [ ] `WR-0C-05` Conectar storage nativo ao app com erro tipado; impedir execução de SQL direto na UI.
- [ ] `WR-0C-06` CI Linux/Windows/macOS com cache pinado, testes e build; distribuir somente quando assinaturas/release aptos.
- [ ] `WR-0C-07` Documentar setup por sistema, dependências de compilação, variáveis e solução de problemas.

**Gate:** app desktop abre biblioteca, cria livro, reinicia e reabre sem erro; CI relevante verde. Não declarar suporte iOS/Android.

### 12.4 EPIC WR-0D — Editor profissional

**Dependências:** G1 + interface React preparada.

- [ ] `WR-0D-01` ADR-0003 schema/editor, serialização e compatibilidade.
- [ ] `WR-0D-02` TipTap base com parágrafos, títulos, listas, citações, links e marks.
- [ ] `WR-0D-03` Comandos de save com baseRevision, retry idempotente e estados acessíveis.
- [ ] `WR-0D-04` Undo/redo e undo estrutural, clipboard sanitizado, IME/Unicode.
- [ ] `WR-0D-05` Importação/migração de texto simples legado -> JSON semântico sem perda de texto.
- [ ] `WR-0D-06` Modo foco, temas, preferências de legibilidade.
- [ ] `WR-0D-07` Manuscrito contínuo virtualizado com docs individuais, navegação e posição.
- [ ] `WR-0D-08` Split editor e quick reference com foco correto.

**Gate:** G2; troca rápida de documento sem perder edição não confirmada.

### 12.5 EPIC WR-0E — Planejamento e várias vistas

- [ ] `WR-0E-01` Binder React acessível, drag/drop e teclado.
- [ ] `WR-0E-02` Outliner com metadados e reorganização usando o mesmo comando de domínio.
- [ ] `WR-0E-03` Corkboard com cartões vinculados aos nós e atualizações atômicas.
- [ ] `WR-0E-04` Inspector com sinopse, status, keywords, inclusão na compilação.
- [ ] `WR-0E-05` Collections e filtros que não duplicam nós.
- [ ] `WR-0E-06` Busca FTS5 incremental, reindex e filtros.
- [ ] `WR-0E-07` Paleta de comandos e atalhos configuráveis.

**Gate:** G3; mover em cards/outline/binder altera mesma árvore e exportação.

### 12.6 EPIC WR-0F — Publish e interoperabilidade

- [ ] `WR-0F-01` AST de compilação determinística e testes com estrutura aninhada.
- [ ] `WR-0F-02` TXT/Markdown e preview fiel com metadados.
- [ ] `WR-0F-03` Importador Markdown/TXT com preview e relatório de perdas.
- [ ] `WR-0F-04` HTML sanitizado e export estruturado.
- [ ] `WR-0F-05` DOCX export e parser com fixtures licenciadas.
- [ ] `WR-0F-06` ePub 3 export e validação epubcheck quando disponível.
- [ ] `WR-0F-07` PDF export por renderizador determinístico e validação visual/semântica.
- [ ] `WR-0F-08` Importador Scrivener experimental e relatório por objeto; nunca editar `.scriv` original.
- [ ] `WR-0F-09` Perfis reutilizáveis, designer declarativo e relatório.

**Gate:** G4; exportadores só considerados concluídos se arquivos de teste abrirem em leitores apropriados.

### 12.7 EPIC WR-0G — Beta e release público

- [ ] `WR-0G-01` Backup/restauração UX e recovery para corrupção real.
- [ ] `WR-0G-02` Temas, i18n pt-BR/en-US e a11y manual e automatizada; cumprir também os requisitos de idiomas e dicionários `WR-I18N-01` a `WR-I18N-06` da seção 21 antes de G5.
- [ ] `WR-0G-03` Fixtures grandes, perfil de performance e memória, métricas com hardware descrito.
- [ ] `WR-0G-04` Importações e exportações adicionais (OPML/RTF/Fountain).
- [ ] `WR-0G-05` Review de segurança, fuzzing, supply chain, SBOM.
- [ ] `WR-0G-06` Packaging, instaladores, assinatura e notas de atualização por SO.
- [ ] `WR-0G-07` Contributing/Code of Conduct, issues, changelog, docs e onboarding.
- [ ] `WR-0G-08` Release candidate testado em máquinas limpas; etiquetar versão 1.0 apenas após aprovação.

### 12.8 EPIC WR-1X — Futuro, NÃO começar antes de G5

- [ ] `WR-1X-01` PWA offline de verdade com IndexedDB/OPFS, quotas e recovery.
- [ ] `WR-1X-02` Mobile iOS/Android com adaptações nativas e fluxos de arquivos.
- [ ] `WR-1X-03` Wiki avançada, timeline, mapas e relações.
- [ ] `WR-1X-04` IA BYOK opt-in e processamento local com consentimento explícito.
- [ ] `WR-1X-05` Plugins sandboxed, API versionada e permissões.
- [ ] `WR-1X-06` Sync E2EE opcional self-host com conflitos e recovery.
- [ ] `WR-1X-07` Colaboração multiusuário somente após autorização e protocolo maduros.

---

## 13. PRIMEIRAS 5 SESSÕES RECOMENDADAS DO CODEX

**Sessão 1 — estado e testes**: ler documentos, executar baseline, criar PROGRESS/NEXT_SESSION/TRACEABILITY, acrescentar testes negativos a `core.test.mjs`; sem trocar stack. Entrega: diagnóstico reproduzível.

**Sessão 2 — mutadores transacionais em memória**: reproduzir e corrigir casos em que operação inválida deixa alterações parciais; preservar API/testes; documentar estratégia. Entrega: testes de invariantes e rollback.

**Sessão 3 — API e storage legado**: testes HTTP, segurança do loopback, limites e concorrência, melhorar reporte de projetos inválidos; realizar correções pequenas. Entrega: endpoints testáveis e erros visíveis.

**Sessão 4 — ADR storage e schema SQL**: escrever decisão, criar fixtures de migração, validar designs de backup/lock e PoC SQLite separada. Entrega: contrato testado sem substituir produção.

**Sessão 5 — PoC Tauri/React**: validar toolchains/CI, criar shell em diretório próprio, conectar interface a portas de domínio e provar abertura/escrita segura antes de cutover. Entrega: migração planejada e mensurável.

Em cada sessão, se o tempo/cota não permitirem concluir a tarefa, entregar subetapa funcional, testes e documento de continuidade. **Não** fabricar cronograma de dias ou prometer execução futura em segundo plano.

---

## 14. INSTRUÇÕES DE EXECUÇÃO LOCAL, GIT E CI

### 14.1 Na versão 0.1.0 atualmente recebida

```bash
node --version        # Node >=20
npm test              # testes atuais
npm run demo          # dataset demonstrativo
npm run dev           # servidor local, navegador http://127.0.0.1:4173
npm run cli -- list
```

**Cuidado:** `npm run demo` pode criar dados no diretório local de projetos; conferir o comando e isolar fixtures antes de usar. A UI não é um aplicativo nativo Tauri.

### 14.2 Git e fluxo de trabalho

```bash
git status --short
# Se o diretório ainda não tem git, inicializar somente após decisão do usuário.
# Para um repositório com git:
git switch -c feat/wr-0a-tests
npm test
# revisar git diff e arquivos afetados antes de stage/commit
```

- Commits convencionais sugeridos: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
- Uma issue de domínio por PR quando possível; migrations/storage têm PRs separadas.
- PR descreve objetivo, como reproduzir, testes, imagens quando UX e rollback.
- Não force-push na branch principal, não rebase branch alheia e não edite arquivos fora do workspace sem autorização.

### 14.3 CI desejado

- Pipeline lint/typecheck/test/build em Linux/Windows/macOS conforme ferramentas existentes.
- Matrix em versões Node suportadas e Rust MSRV após decisão.
- Testes importadores com fixtures sintéticas/autorizadas e assets de size limitado.
- Artefatos de release por plataforma após gate; cache dependências e lockfile.
- GitHub Actions sem tokens excessivos e permissões reduzidas.
- Testes de migração e backups como jobs explícitos.

### 14.4 Política de dependências

- Antes de `npm install` ou `cargo add`, registrar razão e custo de maintenance.
- Fixar versões e commitar lockfile.
- Evitar dependências abandonadas e pacotes que executam scripts arbitrários sem revisão.
- Não instalar automaticamente browsers/headless tools em CI sem custo/permissão documentados.

---

## 15. MODELOS DE DOCUMENTOS DE CONTINUIDADE

### 15.1 `docs/development/PROGRESS.md`

```markdown
# writingroom — Estado de desenvolvimento
Atualizado: YYYY-MM-DD
Branch / commit: <branch> / <hash>
Ambiente: OS, Node, Rust, pnpm etc. (somente versões observadas)

## Entregue e verificável
- [x] <ID> — <mudança>. Testes: <comando + resultado>.

## Em andamento
- [ ] <ID> — <o que resta>.

## Não implementado
- <itens que ainda não existem; não marcar como concluídos>

## Testes e evidências
| Comando | Resultado | Observação |
|---|---|---|
| npm test | X/Y passando | data/ambiente |

## Riscos e dados
- <risco, impacto, mitigação>

## Decisões
- <ADR e resumo>
```

### 15.2 `docs/development/NEXT_SESSION.md`

````markdown
# writingroom — Instruções para a próxima sessão
Último trabalho: <ID> — <escopo e estado>
Branch/commit: <branch/hash>

## Próxima tarefa liberada
- ID: <ID>
- Objetivo e motivação: ...
- Arquivos previstos: ...
- Dependências: ...
- Gate exigido: ...
- Critérios de aceite: ...
- Testes mínimos: ...
- Plano de rollback: ...

## Conhecimento que NÃO deve ser perdido
- <restrições/bugs reais/fixtures/importante>

## Comandos para iniciar
```bash
npm test
```

## Bloqueios e decisões
- <pergunta realmente bloqueante, alternativa segura>
````

### 15.3 `docs/development/TRACEABILITY.md`

```markdown
# Matriz requisito -> issue -> teste -> release
| Requisito | Issue | Código | Teste | Status | Release |
|---|---|---|---|---|---|
| STR-001 | WR-0A-02 | packages/core/... | core.test.mjs | parcial | 0.1.x |
```

Atualizar a matriz somente quando houver evidência; não marcar todo um requisito como concluído por um teste superficial.

### 15.4 Formato da resposta final de cada sessão

```text
RESUMO: objetivo concluído/parcial com motivo.
ALTERAÇÕES: paths exatos + comportamento alterado.
VERIFICAÇÃO: comandos executados, resultados, SO, limitações.
DADOS: alteração de schema? migração? backup? rollback?
SEGURANÇA: riscos criados/mitigados/pendentes.
PRÓXIMO: ID e critérios da próxima tarefa desbloqueada.
DOCUMENTAÇÃO: PROGRESS/NEXT_SESSION/TRACEABILITY atualizados.
```

---

## 16. DECISÕES PENDENTES E PADRÕES REVERSÍVEIS

| Assunto | Padrão seguro temporário | Precisa de ADR/aprovação? |
|---|---|---|
| Licença | manter Apache-2.0 | sim, se mudar |
| Plataforma inicial | desktop; protótipo web local até shell validado | sim, antes de app store |
| Local dos projetos | diretório controlado pelo usuário | sim, para nova estrutura e migração |
| Formato `.wroom` | diretório de projeto local; pacote export separado | ADR-0002 |
| Texto | manter legado até migrador validado | ADR-0003 |
| SQLite vs blobs | PoC/benchmarks e ADR antes de implementar definitivo | ADR-0002 |
| Editor | TipTap candidato, não dependência aprovada | ADR-0003 |
| Deploy cloud | nenhum no P0 | sim |
| IA / Sync / Plugins | desabilitados e não inicializados | sim, ameaça/consentimento |
| Telemetria | nenhuma | sim, consentimento |
| Web PWA | após core e storage browser confiáveis | ADR-0005 |
| ID e referências | UUID estáveis | não alterar sem migração |

### Bloqueios reais que justificam pedir aprovação

- Trocar licença Apache-2.0 ou incorporar código de terceiro com obrigação incompatível.
- Destruir ou migrar in-place dados de escritores sem backup/testes.
- Habilitar transmissão de manuscrito para serviços externos por padrão.
- Expor porta/servidor público e aceitar conexões de rede.
- Distribuir binários assinados em nome do usuário, publicar em loja/app registry, usar credenciais, alterar contas ou criar repositório remoto.
- Adotar uma API de sync que exija identidade/cadastro ou introduza custos recorrentes.

Tudo que é reversível e coberto por testes pode prosseguir sob o escopo descrito.

---

## 17. CATÁLOGO DE CASOS DE TESTE — PARA VIRAR SUÍTE

### Domínio

- Novo projeto contém três raízes distintas; raiz nunca é documento órfão.
- Dois nós com mesmo ID devem ser rejeitados sem mutação parcial.
- Mover um pai para descendente retorna erro e deixa árvore **byte-a-byte equivalente** quando aplicável.
- Mover nó para o mesmo pai em nova posição mantém IDs e sortKeys únicos.
- Mover para pasta, mover para lixeira, restaurar, excluir subárvore; verificar todos os filhos.
- Títulos vazios e dados inválidos: nada muda após erro.
- Mover research para draft e vice-versa: política de include_in_compile explícita.
- Snapshot de texto, editar, restaurar; histórico cresce e conteúdo anterior existe.
- Compilar em ordem estável, omitir pesquisa e nós excluídos.
- Busca Unicode/acento, case folding, documentos excluídos e filtros.

### Persistência

- Save/load com Unicode, acentos, emoji, texto grande, CRLF e quebras finais.
- Lock ativo, stale lock, duas instâncias e read-only.
- Save com baseRevision obsoleta; ambas versões recuperáveis.
- Crash em escrita e checkpoint; DB sem partial commit.
- Falha no disco e permissão negada; UI não marca salvo.
- Restore backup novo destino sem acesso ao original; manifest íntegro.
- Schema antigo migrado com relatório; versão futura não é alterada.

### Importadores

- Markdown com headings, listas, blockquotes, links e HTML perigoso.
- TXT UTF-8, BOM, codificação não suportada com erro explícito.
- DOCX/ZIP com `../`, symlink, tamanho descompactado enorme, entradas duplicadas.
- Scrivener com estrutura aninhada, assets ausentes e tags desconhecidas; relatório claro.
- Import cancelado não cria metade de um projeto.

### UI

- Troca de cena durante save pendente; texto não some e estado é anunciado.
- Undo/redo após paste, IME, block changes e selection.
- Foco acessível entre Binder, editor, Inspector, diálogo e cards.
- Tema claro/escuro, zoom/reflow, teclado sem mouse.
- Erros de storage têm recuperação e export emergency quando possível.

### Publish

- Markdown/TXT com capítulos e subcapítulos na mesma ordem da estrutura.
- Filtros include/exclude e título geram relatório consistente.
- Exports HTML/DOCX/ePub/PDF têm fixtures e validadores quando implementados.
- Compilação não modifica nenhuma entidade/revisão.

---

## 18. ERROS COMUNS A EVITAR PELO CODEX

1. Reescrever o projeto inteiro antes de existir teste de migração.
2. Substituir JSON por SQLite e apagar a versão antiga imediatamente.
3. Chamar alteração no DOM de “salva” sem confirmação de armazenamento.
4. Duplicar a árvore para exibir cards/outline; manter uma única fonte de verdade.
5. Usar `last-write-wins` sem revisão/conflito explícito.
6. Usar Markdown/HTML como única representação de rich text sem contrato de round-trip.
7. Renderizar texto importado com `innerHTML` sem sanitização.
8. Dar a plugin/IA permissão irrestrita ao filesystem ou ao manuscrito.
9. Distribuir dados/referências protegidos por copyright dentro do repositório.
10. Alegar que algo foi testado em Windows/macOS apenas por CI Linux.
11. Prometer compatibilidade Scrivener total sem relatório de perdas e amostras autorizadas.
12. Ignorar metadados, snapshots e IDs durante importação/migração.
13. Fixar o servidor Node em rede pública para “resolver” acesso do celular.
14. Configurar `synchronous=OFF`, desabilitar validação ou checksums como atalho de performance.
15. Realizar benchmark sem ambiente/reprodução e chamar números inventados de meta atendida.
16. Trocar licenças, adicionar dependências gigantes ou scripts postinstall sem auditoria.
17. Confundir documentação de arquitetura-alvo com implementação existente.
18. Deixar TODOs sem issue, dono/requisito ou critérios de aceite.

---

## 19. FONTES, PROVENIÊNCIA E LEITURA OBRIGATÓRIA

### Arquivos locais do projeto

- `README.md` — instalação e limites reais do protótipo.
- `docs/specifications/writingroom_SPEC_v1.0.md` — requisitos, perfis, métricas, backlog e critérios.
- `docs/architecture/adr/0001-foundation.md` — decisão temporária Node/JSON.
- `docs/roadmap/NEXT.md` — roteiro inicial.
- `packages/core/src/core.mjs` — implementação atual do domínio.
- `packages/core/test/core.test.mjs` — testes de base.
- `apps/web/server.mjs` — API local atual.
- `apps/web/app.js` — interface e autosave atual.
- Este arquivo — instruções operacionais para Codex.

### Fontes de referência externas do escopo

- Manual fornecido pelo usuário: `Scrivener_Manual-Win.pdf`, Scrivener 3 Windows, revisão 3.1.6, março de 2026. **Não subir o PDF ao GitHub sem autorização dos titulares.** Áreas mapeadas: Binder, Editor, Corkboard, Outliner, Inspector, pesquisa, snapshots, compile, import/export.
- BYOK Studio: https://byok.io/studio
- BYOK Guides: https://byok.io/guides
- Vídeo indicado: https://www.youtube.com/watch?v=QFAy1Wi_r-w&t=52s (transcrição integral não verificada).
- NEO: https://github.com/hughhowey/neo

**Proveniência:** conceitos funcionais foram sintetizados a partir dos materiais indicados; especificações, formatos de dados e arquitetura deste projeto são **propostas originais**. Antes de usar qualquer biblioteca/código de terceiro, examinar permissões e incluir créditos exigidos.

---

## 20. CHECKLIST FINAL — CADA NOVA VERSÃO

- [ ] O software inicia com comandos documentados em instalação limpa.
- [ ] Testes de domínio, persistência, integração, UI/segurança relevantes passaram.
- [ ] Projeto criado na versão anterior continua abrindo ou possui migração testada e reversível.
- [ ] Nenhum dado é apagado/movido sem autorização, backup ou diálogo adequado.
- [ ] Exportação do manuscrito é reproduzível e não modifica a origem.
- [ ] Há relatório de falhas/conflitos, não perda silenciosa.
- [ ] Recursos offline P0 permanecem operantes.
- [ ] Acessibilidade e i18n tiveram regressões verificadas quando aplicáveis.
- [ ] Licenças e novas dependências foram revisadas.
- [ ] A documentação distingue implementado, parcial, planejado e bloqueado.
- [ ] ADR e TRACEABILITY estão atualizados.
- [ ] PROGRESS e NEXT_SESSION refletem a versão/branch reais.
- [ ] Notas de release não afirmam suporte que não foi testado.

### Definição de sucesso de longo prazo

O writingroom alcança v1.0 desktop somente quando o usuário consegue abrir um projeto antigo ou novo, escrever por sessões prolongadas, reorganizar uma obra complexa, recuperar versões e backups, produzir arquivos editoriais validados e trabalhar inteiramente offline com confiança — **nos três sistemas desktop anunciados**. A interface poderá ser bonita e rápida, mas nenhuma dessas características substitui integridade de dados, abertura de projeto, interoperabilidade e testes.

**Próximo passo inequívoco para o Codex:** iniciar `WR-0A-01` e `WR-0A-02`; executar testes, registrar baseline e acrescentar testes de invariantes, antes de qualquer migração de stack.

---

## 21. ADENDO — PORTUGUÊS BRASILEIRO, INGLÊS DOS EUA E DICIONÁRIOS

**Solicitação incorporada em 2026-11-02. Status: requisitos planejados, não funcionalidades implementadas.** O produto desktop deve oferecer **português brasileiro (`pt_BR`) e inglês dos Estados Unidos (`en_US`)**, tanto na interface quanto na correção ortográfica. Este adendo detalha o escopo de `WR-0G-02`; não autoriza saltar os gates de integridade e persistência.

Os IDs `WR-I18N-*` abaixo são IDs de trabalho deste adendo. Devem ser reconciliados com os IDs canônicos do SPEC e registrados em TRACEABILITY sem substituir ou renumerar requisitos existentes.

### 21.1 Idiomas e preferências

- [ ] `WR-I18N-01` Disponibilizar interface completa nos dois idiomas: menus, configurações, diálogos, ajuda integrada, mensagens de erro, estados de salvamento, importação/exportação e rótulos de acessibilidade. Usar catálogos de tradução, sem textos de interface espalhados pelo código.
- Aceitar os aliases `pt_BR` e `en_US` em importações/configurações; normalizar internamente para as tags BCP 47 `pt-BR` e `en-US`, inclusive em APIs de internacionalização e atributos `lang`.
- Permitir escolher e persistir o idioma da interface nas preferências do aplicativo. Na primeira execução, sugerir o idioma compatível do sistema; na ausência de correspondência, usar pt-BR. Trocar o idioma não pode perder edições nem alterar o manuscrito.
- Usar formatação de datas, números e plurais conforme o idioma escolhido; IDs, timestamps de armazenamento e contratos de API permanecem independentes da tradução. Se faltar uma chave, usar o outro catálogo e registrar a lacuna sem expor conteúdo do usuário.
- [ ] `WR-I18N-02` Separar **idioma da interface**, **idioma padrão do projeto** e **idioma de revisão do documento**. O documento herda o idioma do projeto, com substituição explícita; oferecer também a opção de desativar a revisão. A escolha deve sobreviver ao fechamento e à reabertura.
- Preservar o idioma textual na importação/exportação quando o formato suportar esse metadado. Traduzir a interface nunca traduz automaticamente títulos, pastas criadas pelo usuário ou conteúdo de documentos.

### 21.2 Gerenciador de dicionários

- [ ] `WR-I18N-03` Oferecer em **Configurações → Idiomas e dicionários** um catálogo com pacotes de ortografia para pt-BR e en-US e possibilidade de outros idiomas. Exibir idioma/região, versão, tamanho do download, origem, licença e estado: disponível, baixando, instalado, atualização disponível ou falha.
- Permitir **baixar, cancelar, repetir, atualizar e remover** pacotes individualmente. O download é iniciado pelo usuário; nenhuma conexão é necessária para abrir projetos ou escrever. Remoção de um pacote em uso deve informar o impacto e permitir escolher outro ou desativar a revisão, sem apagar texto.
- Após a instalação, o dicionário e a correção funcionam inteiramente offline, sem conta, assinatura ou envio de manuscritos. Se o pacote não estiver instalado, exibir a opção de baixá-lo e manter a escrita disponível; não marcar todas as palavras como erro.
- Oferecer instalação manual de pacote local para máquinas sem acesso à internet. Definir em ADR o motor, os formatos aceitos e sua compatibilidade; avaliar Hunspell (`.aff`/`.dic`) sem declarar suporte antes da validação técnica e de licença.
- Usar fontes explícitas e aprovadas para o catálogo e downloads HTTPS. Validar manifesto, idioma, versão, compatibilidade, tamanho e hash esperado de origem confiável; aplicar limites de extração e bloquear path traversal, links maliciosos e conteúdo executável. Pacotes não podem executar scripts.
- Instalar/atualizar em staging e ativar somente após validação completa. Cancelamento, falta de espaço, pacote corrompido ou interrupção devem preservar a versão anterior funcional. Guardar pacotes no diretório de dados do aplicativo, fora dos manuscritos; não versionar binários de dicionários sem decisão de licença/distribuição.
- Atualizações devem ser oferecidas ao usuário, sem download automático por padrão. Consultas ao catálogo não enviam texto, nomes de projetos ou listas de palavras pessoais.

### 21.3 Correção e vocabulário pessoal

- [ ] `WR-I18N-04` Implementar revisão ortográfica local conforme o idioma efetivo do documento, com marcação acessível, sugestões, ação de substituir, ignorar ocorrência, ignorar no documento e adicionar ao dicionário pessoal. Substituições devem participar do undo/redo e do salvamento normal; nunca corrigir o manuscrito silenciosamente.
- [ ] `WR-I18N-05` Manter vocabulário pessoal separado dos pacotes baixados, por idioma, com escopo global ou por projeto claramente indicado. Permitir consultar, adicionar, remover, importar e exportar palavras em formato documentado, com prévia e validação. Atualizar/remover um pacote não pode apagar o vocabulário pessoal.
- Vocabulário de projeto deve integrar backup/restauração; vocabulário global deve ter exportação própria. Documentar que a exportação pode conter nomes e termos privados. Não enviar essas listas para serviços externos.
- Sinônimos, hifenização e revisão gramatical são extensões futuras, com tipos de pacote, licenças e capacidades identificados separadamente; instalar um dicionário ortográfico não implica disponibilizar esses recursos.

### 21.4 Entrega, testes e critérios de aceite

- [ ] `WR-I18N-06` Registrar arquitetura, dependências/licenças, persistência das preferências e matriz de testes. Preparar a infraestrutura de localização durante WR-0C e integrar idioma/revisão durante WR-0D; concluir o gerenciador e a validação em WR-0G, respeitando os gates existentes.
- Testar cobertura das chaves nos dois catálogos, plurais, datas/números, fallback, rótulos acessíveis e troca de idioma com edição pendente sem perda de conteúdo.
- Testar interface em pt-BR com documento em en-US e o inverso, herança do projeto, substituição por documento, revisão desativada e persistência após reiniciar.
- Usar fixtures sintéticas nos dois idiomas, incluindo acentos, cedilha, apóstrofos, palavras corretas e erros conhecidos; verificar sugestões e undo sem depender de serviços online.
- Testar download, cancelamento, repetição, atualização, remoção e instalação manual; simular indisponibilidade de rede, falta de espaço, manifesto inválido, hash divergente e extração maliciosa. Nenhuma falha pode inutilizar o pacote anterior ou bloquear escrita/salvamento.
- Testar vocabulário pessoal por idioma/escopo, importação/exportação e backup/restauração, inclusive após atualizar ou remover pacotes.
- **Gate complementar de G5:** ambos os idiomas completos, seleção persistente, dicionários pt-BR/en-US instaláveis pelo usuário e revisão comprovadamente offline após reiniciar sem rede. Validar em cada sistema desktop anunciado; corretor nativo disponível em apenas um SO não comprova o requisito multiplataforma.
- Incluir esses critérios na seção 20 e na matriz de rastreabilidade ao preparar releases. Não marcar este adendo como entregue até haver evidências reproduzíveis.

## 22. ADENDO — CATÁLOGO DO MANUAL WINDOWS E INCREMENTO G0

Atualizado em 2026-11-02 por solicitação do usuário. O inventário complementar [SCRIVENER_CAPABILITY_MAP.md](docs/specifications/SCRIVENER_CAPABILITY_MAP.md) mapeia 84 itens às famílias do manual, requisitos canônicos e gates existentes. Não significa paridade integral nem implementação de todos os comandos. Antes de implementar cada módulo, aprofundar suas seções e definir fixtures e testes.

Nesta sessão foram corrigidas rejeições com mutação parcial, herança inicial de compilação, busca/restauração de subárvores e validações do core, além de expor consulta/restauração dos snapshots já existentes. O schema continua 1, sem conversão automática. Evidências, limites e próxima tarefa estão em [PROGRESS](docs/development/PROGRESS.md), [NEXT_SESSION](docs/development/NEXT_SESSION.md) e [TRACEABILITY](docs/development/TRACEABILITY.md). G0 permanece parcial até auditoria da API; G1 e posteriores não foram aprovados.

## 23. ADENDO — ENTREGA VISÍVEL ALPHA.2

Em 2026-11-02, o usuário priorizou explicitamente a aplicação em uso: “implemente tudo, abri e não mudou nada”. A interface e os workflows foram ampliados no protótipo JSON sem substituir armazenamento ou declarar gates de durabilidade aprovados. A autorização mais recente governa esta mudança de prioridade.

[ADR-0007](docs/architecture/adr/0007-visible-studio-increment.md) descreve o incremento. [USING_STUDIO](docs/development/USING_STUDIO.md) explica os controles. Evidências atuais: 66 testes Node e 19 verificações de fluxo Firefox, conforme PROGRESS. As funcionalidades integradas estão na matriz, sem alegar paridade integral com o manual. Atualizar servidor e frontend juntos; o cliente bloqueia protocolo antigo para evitar salvar campos ignorados.

## 24. PRIORIDADE MAIS RECENTE — DESKTOP POR ÚLTIMO / ALPHA.3

Pedido do usuário: “então implementetudo, deixa o desktop por ultim”. Esta ordem substitui o planejamento desktop-first e a sequência de Tauri/instaladores. Implementar e validar recursos na aplicação atual, preservando dados; empacotamento desktop somente depois. Não usar essa mudança como justificativa para adiar correções de perda de dados.

Alpha.3 integra substituição com prévia atômica e snapshots, caderno de fichas/coleções/capturas, DOCX básico e EPUB experimental. ADR-0008 e PROGRESS registram limites e testes. Ainda não declarar paridade integral com o manual, G1 aprovado ou revisão monotônica no JSON atual.

## Atualização operacional — alpha.4 (2026-11-02)

A implementação corrente possui editor visual ProseMirror integrado (ADR-0003), dependências MIT exatas e build local. A instrução histórica de não exigir instalação aplica-se à alpha.1: agora usar `npm ci --ignore-scripts`, depois `npm run dev` (prebuild automático). Projetos continuam schema 1 até ativação visual explícita; então backup integral verificado precede schema 2, que versões anteriores não devem editar. Não houve conversão dos projetos reais.

Evidências e limites: PROGRESS/NEXT_SESSION; 102 testes Node e 35 verificações Firefox, DOCX LibreOffice, EPUB estrutural/experimental. Pedido vigente: recursos editoriais integrados primeiro, desktop por último. Comentários/footnotes/anexos e durabilidade de produção seguem pendentes. O catálogo do manual é backlog, não atestado de implementação integral.

### Continuidade alpha.5 — revisão vinculada (2026-11-02)

Versão corrente 0.1.0-alpha.5/studio-4. Comentários privados e notas vinculadas integrados ao editor/inspetor, versões/backup e publicação com notas finais por cena (ADR-0009). 115 testes Node, 41 verificações Firefox e exports conferidos. Não há rodapé nativo Word, anexos, importadores ricos ou durabilidade de produção completos. A próxima fronteira é assets/pesquisa com preservação/backup antes de importadores/imagens. Desktop continua por último; consultar PROGRESS/NEXT_SESSION para estado real.

### Continuidade alpha.6 — anexos de pesquisa (2026-11-02)

Versão corrente 0.1.0-alpha.6/studio-5, formato de projeto 3 somente após primeira importação de anexo e backup integral verificado. Abertura não converte formatos 1/2, visual não rebaixa 3. Anexos locais PNG/JPEG/PDF/TXT/MD integram UI/backup/restauração (ADR-0010); bytes incorporados no JSON, com limites explícitos. 129 testes Node e 47 verificações Firefox. Próximo: imagens inline/export de assets e importadores ricos; PDF interno/OCR e storage de produção pendentes. Desktop continua por último.

### Prioridade explícita — UX e configurações (2026-11-02)

A pedido do usuário, a fila urgente em docs/roadmap/URGENT_UX_AND_SETTINGS.md (UX-URG-001–012) passa à frente de imagens inline/importadores: menus editar/remover/duplicar/backup na biblioteca e outras vistas, organização por arraste, personagens/cenários/pesquisa histórica, perfil nome/pseudônimo/contatos e central de backup/conexões. Auditoria apenas, ainda sem implementação dessa fila. Integrações reais Google/Drive/OneDrive/Dropbox não existem; preservar dependências de credenciais/integridade e distinguir backup remoto de sync. Desktop continua por último; consultar NEXT_SESSION para ordem vigente.

### Ordem vigente e entrega alpha.7 (2026-11-02)

O usuário adiou explicitamente Google, Drive, OneDrive e Dropbox para a última etapa antes do desktop. Trabalhar nos recursos locais identificados. Alpha.7/studio-6 entrega menus de biblioteca/documentos, duplicação, arquivamento reversível, arraste por ponteiro com undo estrutural de sessão e recolher pastas (ADR-0011). 139 testes Node/56 fluxos Firefox e 17 verificações privadas do modelo longo. Sem novo schema/migração. UX-URG-005–009 (pesquisa/fichas/perfil/backup local) seguem próximos; 010–012 cloud depois dos demais locais, desktop por último. Não confundir backlog restante com recurso entregue.

### Planejamento profissional confirmado — 2026-11-02

Novo pedido de produto/documentação: modo Autor/Editor com carteira de obras/permissões, revisão formal e redline de autor/editor, comparação lado a lado, pacote para editora e sessão de publicação editável, IA contextual opt-in por projeto e modelos de múltiplas formas de escrita. O usuário confirmou comparação lado a lado **além** de alterações rastreadas e escolheu **pacote criptografado primeiro, acesso online por convite/e-mail depois**, mantendo os dois no escopo.

Fontes canônicas novas: docs/specifications/PROFESSIONAL_EDITORIAL_WORKSPACE.md; docs/roadmap/PROFESSIONAL_EDITORIAL_ROADMAP.md (PRO-001–027); docs/security/EDITORIAL_SHARING_AND_AI.md; ADR-0012. Não implementar falso modo seguro por pastas ocultas; não confundir e-mail com chave/E2EE, comentário com redline, backup completo com projeção editorial ou preview com sessão independente. Não enviar manuscrito/convites nem criar conexão por atualizar o planejamento.

Gates G1–G4/G7 continuam critérios obrigatórios de suas funcionalidades; desktop continua por último e a numeração não impõe desktop antes de colaboração/IA. Recursos locais da fila urgente seguem em andamento; Google/Drive/OneDrive/Dropbox permanecem na última etapa imediatamente antes do desktop. Alpha.7/studio-6 é a versão implementada; novos recursos deste adendo são propostas, não resultado dos testes existentes.

### Continuidade alpha.8 — catálogo, perfil e fontes (2026-11-02)

Versão executável alpha.8/studio-7. Catálogo de 16 estruturas e preset histórico, perfil local separado dos projetos e fontes com metadados/URLs/vínculos/backlinks integrados. São entregas parciais da fundação PRO-001–004/UX-URG-005–008, não engine de roteiro/quadrinhos nem autenticação de autor. Primeira fonte exige backup integral antes de formato 4; rich/anexos não rebaixam. Original/modelo privado-base preservados; somente cópias restauradas nos testes reais. 151 testes Node/62 fluxos Firefox, caso privado com 20 verificações. ADR-0013. Próximos: central de backup, comparação/revisão local e sessão de publicação; IA/E2EE/contas continuam pendentes e sujeitos aos gates. Google/Drive/OneDrive/Dropbox imediatamente antes do desktop; desktop por último.

### Continuidade alpha.9 — backup local gerenciado (2026-11-02)

Alpha.9/studio-8 integra central de backup com cópias verificadas/histórico/download/restore em novo projeto e rotina opt-in do servidor, intervalo/retencão/CAS, sem duplicar inalterados após verify. Destinos por IDs configurados; padrão managed no root de backups, separado das migrações. Retenção só de automáticas verificadas após nova geração válida; fonte/manuais/migrações/corrompidas/incompletas preservadas. 162 testes Node/69 fluxos Firefox e caso privado com 23 verificações. ADR-0014. Não aprovar G1 completo: servidor precisa estar ativo, sem agendador OS, cifra ou lock entre processos. Próximos locais: comparação lado a lado/revisão e sessão de publicação; cloud imediatamente antes do desktop, desktop por último.

## Atualização de aparência — alpha.10 (2026-11-02)

Galeria de aparência alpha.10: **20 opções** no botão **◐** ou em **Configurações → Temas e aparência**. Inclui WritingRoom claro/escuro, Windows 10/11 claro/escuro, Office 365 claro/escuro, Office 2010 claro, retrô, GNOME 50 claro/escuro, macOS claro/escuro, KDE Plasma 6 claro/escuro, WordStar 4, DOS colorido, Cores divertidas e Adaptar ao sistema.

Selecione para experimentar; **Aplicar tema** confirma, **Cancelar/Escape** restaura. A preferência fica neste navegador, separada dos projetos e backups; preferências antigas claro/escuro são reconhecidas. Adaptar ao sistema acompanha `prefers-color-scheme`, usando WritingRoom claro/escuro. São interpretações visuais originais, com fontes locais; os temas de terminal não emulam atalhos ou formatos antigos. A aparência não altera o conteúdo do manuscrito. Impressão tem estilo de papel claro.

Verificação: 166 testes Node e 74 grupos Firefox; detalhes em docs/development/PROGRESS.md e ADR-0015. Desktop permanece por último.

## Tradução e ferramentas de idioma — alpha.11 (2026-11-02)

A alpha.11 acrescenta **Tradução** em todos os projetos e quatro modelos em **Novo projeto → Tradução — livro/artigo/documento/outros textos**. Crie trechos com original e idioma de destino, escreva lado a lado, acompanhe estados e exporte revisão bilíngue MD. Originais e glossário ficam em Pesquisa e fora da publicação; backups preservam os vínculos. Alterar o texto original reabre traduções concluídas para Revisão.

**Dicionário e idiomas** oferece verbetes pessoais (definição, sinônimos, equivalentes, contexto e fonte), busca no glossário e em trechos traduzidos, exportação MD e links explícitos de consulta externa. O glossário funciona offline por obra; **não há base lexical completa offline ou tradução automática integrada**. Nenhuma cena é enviada automaticamente. Veja [especificação de tradução e idiomas](docs/specifications/TRANSLATION_AND_LANGUAGE_TOOLS.md) para limites e evolução.

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
