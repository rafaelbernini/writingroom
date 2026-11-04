# WRITINGROOM — Especificação mestre de produto e engenharia

**Versão:** 1.0 (baseline de arquitetura e escopo)  
**Data:** 2026-11-02  
**Estado:** proposta técnica; nenhum recurso descrito está implícito como já implementado  
**Nome de trabalho:** `writingroom`  
**Filosofia:** open source, local-first, offline-first, multiplataforma, portabilidade antes de lock-in  
**Público prioritário:** escritores de livros, ficção e não ficção, roteiristas, autores acadêmicos; demais perfis por templates.

> Esta especificação utiliza o **manual de Scrivener 3 para Windows, revisão 3.1.6 (março de 2026)**, fornecido pelo usuário, como inventário de conceitos e fluxos; BYOK Studio como inspiração de espaço de trabalho flexível, mapas, wiki, capturas e ergonomia; e NEO como inspiração de simplicidade e autonomia. É uma **obra de especificação original**: não incorpora código, telas, marcas, manual ou ativos desses produtos. As tecnologias e funções não descritas nas fontes são **propostas**.

## 0. Resumo executivo e decisões consolidadas

O Writingroom é um estúdio de escrita de longo formato. Uma biblioteca contém projetos portáveis. Cada projeto é composto por documentos granulares (partes, capítulos, cenas), notas, pesquisas, fichas e objetos de planejamento relacionados. A mesma fonte de verdade é apresentada como manuscrito, árvore, cartões, outline, linha do tempo e painéis conectados. O escritor pode começar com uma página vazia e ativar funções progressivamente. A publicação compila o conteúdo de acordo com um perfil de saída separado dos estilos de edição.

**DEC-001:** implementação totalmente nova; não é fork do NEO nem clonagem do Scrivener/BYOK.  
**DEC-002:** desktop é a plataforma de referência da primeira versão; web, Android e iOS serão implementados por fases, **não** anunciados como completos antes da validação.  
**DEC-003:** o conteúdo deve existir sem serviço online, licença comercial ou IA.  
**DEC-004:** preservação, backup, restauração e exportação testados são bloqueadores de lançamento.  
**DEC-005:** o primeiro produto é monousuário; colaboração e sincronização só após um protocolo confiável de mudanças.  
**DEC-006:** nenhuma função generativa modifica texto existente sem aceite explícito, diff e ponto de restauração.  
**DEC-007:** acessibilidade e internacionalização entram na base do código.  
**DEC-008:** informações sobre licença MIT/Apache-2.0 são candidatas; escolher após verificação das dependências e política de contribuições.

## 1. Fontes e rastreabilidade

### 1.1 Fonte principal — Scrivener 3 Windows
Documento fornecido: `Scrivener_Manual-Win.pdf`, 776 páginas, revisão 3.1.6.0-02, março de 2026. Referências abaixo indicam **capítulos e páginas impressas do manual** (podem divergir da numeração do arquivo PDF). Inventário de tópicos: capítulo 4 Interface (p.20), 5 Projetos (p.41), 6 Binder (p.66), 7 Arquivos (p.88), 8 Editor (p.114), 9 Pesquisa (p.157), 10 Organização (p.172), 11 Busca (p.215), 12 Navegação (p.243), 13 Inspector (p.265), 14 Integração cloud (p.294), 15 Escrita (p.318), 16 Ambientes (p.359), 17 Estilos (p.367), 18 Anotações (p.386), 19 Roteiros (p.407), 20 Ferramentas (p.426), 21 MultiMarkdown/Pandoc (p.448), 22 Sumário (p.471), 23 Compilação (p.476), 24 Designer de formatos (p.518), 25 Exportação (p.585), 26 Impressão (p.591).

Conceitos verificados: estrutura não linear; capítulos/cenas independentes; sinopses associadas; cartão e outline representando unidades da mesma árvore; pesquisa integrada; editores lado a lado; separação entre texto editado e aparência de exportação (cap. 1, pp. 3–4). Interface Binder/editor/Inspector e modos documento, corkboard, outliner e visualização contínua (cap. 4, pp. 20–38). O sistema de compilação é um **subsistema**, não somente um botão de exportação (caps. 23–24). Importar arquivos de Scrivener é diferente de exportar documentos finais (caps. 9, 25).

### 1.2 BYOK Studio e guias
- https://byok.io/studio — editor, manuscritos, outlines, cards, grid map, wiki, scratchpad, drawer, painéis adaptáveis; desktop offline, mobile e web sincronizáveis por serviço BYOK.
- https://byok.io/guides — comparações, workflows e capture commands.
- https://byok.io/novel-writing-workflow — processo de escrever, estruturar e finalizar um romance.
- https://www.youtube.com/watch?v=QFAy1Wi_r-w&t=52s — vídeo fornecido como referência; trilha de temas corroborada pela página do Studio; **transcrição completa não verificada**.

### 1.3 NEO
- https://github.com/hughhowey/neo — referência de UX: estante, foco, arquivos locais e ausência de contas. Licença de repositório MIT; **nenhum código do NEO será utilizado no projeto novo por padrão**.

### 1.4 Observação de propriedade intelectual
Não reproduzir manual, texto de documentação proprietária, iconografia, branding, screenshots ou código de Scrivener/BYOK. Funcionalidades gerais e fluxos podem inspirar uma implementação independente. Importação interoperável deve ser projetada com arquivos de teste de autoria própria, sem contornar controles de acesso. Realizar revisão jurídica de marcas, dependências, fontes e licenças antes da distribuição.

## 2. Objetivos, limites e métricas

### 2.1 Objetivos funcionais
1. Planejar histórias sem obrigar um método de escrita.
2. Escrever manuscritos longos em unidades móveis e visualizar tudo junto.
3. Centralizar referências, notas e fichas vinculadas ao texto.
4. Revisar com comentários, comparações e snapshots.
5. Compilar livros sem alterar a formatação no editor.
6. Migrar materiais e sair do aplicativo por formatos abertos.
7. Funcionar sem internet.

### 2.2 Não objetivos na v1
- Marketplace pago, rede social ou publicação comercial dentro do software.
- Treinamento de IA com textos dos usuários.
- Colaboração simultânea com conflitos resolvidos silenciosamente.
- Suporte indistinto a todos os formatos proprietários com fidelidade perfeita.
- Replicação pixel a pixel dos concorrentes.

### 2.3 Indicadores de qualidade (metas propostas, não resultados)
- **Integridade:** zero perda silenciosa de conteúdo em suíte de testes de falhas; operações mutáveis registradas e restauráveis.
- **Tempo de partida:** meta p95 < 3 s em máquina de referência com biblioteca de 100 projetos; orçamento condicionado a medições.
- **Latência:** digitação fluida com capítulos de 100 mil palavras e projeto de 1 milhão de palavras; avaliar INP/teclas, não apenas FPS.
- **Busca:** p95 < 300 ms para consulta local em projeto de referência após indexação.
- **Autosalvamento:** persistência em até 2 s de inatividade e flush seguro ao perder foco/fechar; recuperação de operações não confirmadas.
- **Import/export:** teste de round-trip sem perda semântica para formatos internos e Markdown suportado; relatórios de perdas para formatos externos.
- **Acessibilidade:** alvo WCAG 2.2 AA para fluxos centrais; navegação por teclado e leitores de tela em testes.
- **Cobertura:** domínio de persistência, serialização, migração e exportação com testes automatizados de casos críticos.

## 3. Perfis, jornadas e casos de uso

**P01 Romancista discovery writer:** abre livro vazio, escreve cenas fora de ordem, organiza depois por cartões, marca POV e guarda fragmentos descartados.  
**P02 Plotter:** planeja arcos, beats, fichas, conflitos, cronologia, acompanha diferenças entre estrutura desejada e real.  
**P03 Autor de não ficção:** agrega pesquisa, referências bibliográficas, capítulos, notas e exportação.  
**P04 Roteirista:** trabalha em elementos de roteiro, cenas e exportação Fountain; Final Draft quando adaptador validado.  
**P05 Usuário migrando:** importa do Scrivener/Markdown/Word, recebe relatório de perdas e verifica antes de descartar origem.  
**P06 Autor que troca de dispositivo:** trabalha offline, exporta pacote, futuramente sincroniza com resolução consciente de conflitos.  
**P07 Usuário de tecnologias assistivas:** usa teclado, foco, contraste, zoom e anúncio de estados.

**Jornada principal:** criar projeto → inserir capítulos/cenas → escrever → anotar e vincular pesquisa → reorganizar em qualquer visualização → revisar e comparar versões → escolher perfil de publicação → visualizar prévia → compilar → exportar/arquivar.

## 4. Modelo de navegação e experiência

### 4.1 Ambientes (perspectivas sobre os mesmos dados)
- **Library:** estante, pastas/coleções, séries, capa, favoritos, recentes, arquivos externos e busca entre projetos.
- **Write Room:** editor e manuscrito contínuo, modos foco e revisão, editores divididos, estatísticas.
- **Story Room:** árvore, outlines, cartões, boards, cronologia, fichas, worldbuilding, mapas e pesquisas.
- **Publish Room:** seleção de escopo, sequenciamento, seções, estilos semânticos, formatos, prévia, validação e exportação.

### 4.2 Layout desktop
Cabeçalho reduzido com breadcrumb, projeto, busca/comandos e estado de persistência. Sidebar esquerda com Binder e coleções; centro com área tabulada ou split horizontal/vertical; direita com Inspector contextual; rodapé opcional com contagem, meta, posição, escrita e salvamento. Painéis redimensionáveis e ocultáveis. Modo foco remove cromos; não elimina funções de recuperação.

### 4.3 Layout mobile
Navegação por uma área ativa, com tree e inspector em drawers, autosave visível, controle de teclado virtual e gestos não essenciais. Não impor controles de drag como única opção. Em tablet, permitir 2 painéis quando o espaço suportar. Cache e recuperação devem funcionar offline.

### 4.4 Regras de interação
- Undo/redo por documento e para operações estruturais; mover cenas é uma operação transacional com desfazer.
- Seleção, foco e painel ativo explícitos; atalhos configuráveis e conflitos indicados.
- Painéis podem ser salvos como layouts de projeto e preferências globais.
- Nada é apagado permanentemente sem política de lixeira/retention e confirmação.
- Palette de comandos pesquisável inclui ações, documentos e navegação.

## 5. Catálogo funcional com prioridades

Legenda: **P0** MVP de escrita seguro; **P1** versão 1.0 estável; **P2** após v1.0; **P3** exploratório. IDs são estáveis para issues/testes. Cada requisito deve gerar casos de teste.

### 5.1 Biblioteca e projetos
| ID | Prior. | Requisito e regra de aceite |
|---|---|---|
| LIB-001 | P0 | Criar, abrir, renomear, duplicar e arquivar projeto; persistir após reinício. |
| LIB-002 | P0 | Templates vazio, romance, não ficção; template cria itens editáveis, não força modelo fixo. |
| LIB-003 | P1 | Estante com capa, coleções, ordenação e favoritos; lista acessível alternativa. |
| LIB-004 | P1 | Séries e múltiplos volumes sem copiar capítulos entre projetos. |
| LIB-005 | P0 | Pasta do projeto selecionável; bloqueio explícito contra duas instâncias mutantes simultâneas. |
| LIB-006 | P1 | Modelos personalizados portáveis e versionados. |
| LIB-007 | P1 | Configurações por projeto e globais separadas e exportáveis. |

### 5.2 Binder, documentos e estrutura
| ID | Prior. | Requisito e regra de aceite |
|---|---|---|
| STR-001 | P0 | Árvore arbitrária com `Draft`, `Research` e `Trash` padrão; nomes podem ser personalizados. |
| STR-002 | P0 | Nós `folder`, `text`, `research`, `asset`, `reference` com tipos extensíveis; ordem persistente. |
| STR-003 | P0 | Mover, copiar, aninhar, dividir, mesclar documentos sem perder metadados e referências. |
| STR-004 | P0 | Sinopse por documento, etiqueta, status, palavras, inclusão na compilação. |
| STR-005 | P1 | Coleções estáticas e dinâmicas por filtros/metadados; sem alterar hierarquia original. |
| STR-006 | P1 | Busca e filtros salvos, bookmarks, backlinks e links internos. |
| STR-007 | P1 | Campos personalizados tipados e esquemas configuráveis por projeto. |
| STR-008 | P0 | Lixeira com exclusão reversível e restauração no local anterior. |
| STR-009 | P1 | Fragmentos descartados/scrap vault com origem e data, sem apagar o original. |

### 5.3 Editor e manuscrito
| ID | Prior. | Requisito e regra de aceite |
|---|---|---|
| EDT-001 | P0 | Edição rich-text semântica com parágrafos, títulos, ênfases, listas, links, aspas, separadores. |
| EDT-002 | P0 | Autosave transacional, indicador `salvo / salvando / falha`; recuperação pós-crash. |
| EDT-003 | P0 | Navegar e editar texto de um nó; mostrar múltiplos nós como manuscrito contínuo sem colá-los. |
| EDT-004 | P0 | Undo/redo, copiar/colar de texto e HTML sanitizado, arrastar blocos opcional. |
| EDT-005 | P1 | Split editor com referência, imagens/PDF e outro documento; foco e estado independentes. |
| EDT-006 | P0 | Modo foco, largura de página, tema claro/escuro, fonte, entrelinha, zoom. |
| EDT-007 | P1 | Modo máquina de escrever com posição configurável do cursor. |
| EDT-008 | P1 | Correção ortográfica por idioma, dicionário pessoal, destaque opcional. |
| EDT-009 | P1 | Comentários ancorados, notas internas, notas de rodapé/fim e marcadores. |
| EDT-010 | P1 | Encontrar/substituir no documento ou projeto com prévia de alterações. |
| EDT-011 | P1 | Metas por sessão/documento/projeto, estatísticas e ritmo não coercitivo. |
| EDT-012 | P1 | Stylesheets semânticos e formatação inline com limpeza de inconsistências. |
| EDT-013 | P1 | Snapshots nomeados, comparação visual e restauração sem sobrescrever a versão atual. |
| EDT-014 | P2 | Controle de alterações formal e fluxo de revisão editorial. |
| EDT-015 | P1 | Substituições tipográficas, autocorreção opt-in e comandos configuráveis. |
| EDT-016 | P1 | Fluxo simples de roteiros e Fountain (seção de roteiro como módulos próprios). |

### 5.4 Story Room: planejamento, wiki e pesquisa
| ID | Prior. | Requisito e regra de aceite |
|---|---|---|
| STO-001 | P0 | Outliner hierárquico do próprio Binder: renomear/reordenar reflete imediatamente no manuscrito. |
| STO-002 | P0 | Corkboard/card view: um cartão por nó com sinopse e status; mover reflete na árvore. |
| STO-003 | P1 | Board independente com cartões vinculados a nós, swimlanes, filtros e múltiplas visões. |
| STO-004 | P1 | Wiki com entidades `character`, `location`, `object`, `organization`, `event`, `concept`, `custom`. |
| STO-005 | P1 | Relações tipadas entre entidades e documentos, backlinks e referências quebradas detectáveis. |
| STO-006 | P1 | Linha do tempo narrativa com data ficcional, ordem do relato e linha alternativa. |
| STO-007 | P2 | Mapa visual de ideias, caixas e conexões; zoom, exportação e navegação por teclado. |
| STO-008 | P1 | Scratchpad de capturas rápidas, convertíveis em nota, capítulo, tarefa ou ficha com histórico. |
| STO-009 | P1 | Biblioteca de pesquisa anexada ou referenciada, com metadados e notas. |
| STO-010 | P1 | Visualização PDF/imagens com navegação e links, sem duplicar material desnecessariamente. |
| STO-011 | P2 | Planejamentos por métodos (3 atos, jornada, save the cat etc.) como templates opcionais, não regra. |
| STO-012 | P2 | Detector de inconsistências determinísticas: nomes divergentes, idade, cronologia, duplicidades — apresenta evidências e nunca altera automaticamente. |
| STO-013 | P2 | Mapas de arcos, pontos de vista, presença de personagens, matriz de cenas e storyline. |

### 5.5 Inspector, metadados, navegação e busca
| ID | Prior. | Requisito e regra de aceite |
|---|---|---|
| INS-001 | P0 | Inspector contextual de sinopse, notas, status, keywords, etiquetas e contagem. |
| INS-002 | P1 | Metadados customizados, bookmarks, referências, comentários e snapshots em abas. |
| INS-003 | P0 | Busca rápida por título e busca full-text local com filtro por escopo. |
| INS-004 | P1 | Índice de pesquisa incluindo notas e anexos que tenham texto extraível localmente. |
| INS-005 | P1 | Navegação por histórico de documentos, recent items e quick reference. |
| INS-006 | P1 | Pesquisa global entre projetos explicitamente autorizados. |

### 5.6 Publish Room
| ID | Prior. | Requisito e regra de aceite |
|---|---|---|
| PUB-001 | P0 | Compilar por seleção de árvore, ordenação, filtro `include_in_compile`, título e quebras sem modificar a fonte. |
| PUB-002 | P0 | Exportar Markdown e TXT com UTF-8 e estrutura previsível. |
| PUB-003 | P1 | Exportar DOCX, HTML, ePub 3 e PDF via pipeline verificável. |
| PUB-004 | P1 | Perfis reutilizáveis: original de submissão, ebook, leitura, impressão, roteiro e acadêmico. |
| PUB-005 | P1 | Prévia fiel com metadados, sumário, numeração, seções, estilos, margens. |
| PUB-006 | P1 | Designer de templates declarativos versionados, com validação e sem scripts arbitrários. |
| PUB-007 | P1 | Gerar TOC por headings e capítulos, controlar notas, citações e elementos pré/pós-textuais. |
| PUB-008 | P1 | Relatório de compilação: avisos, links quebrados, conteúdos omitidos e recursos não encontrados. |
| PUB-009 | P2 | Presets para impressão gráfica, ISBN/metadados editoriais, checklist de acessibilidade ePub. |
| PUB-010 | P2 | Exportação roteiro Fountain/PDF e compatibilidade FDX quando validada. |

### 5.7 Importação e interoperabilidade
| ID | Prior. | Requisito e regra de aceite |
|---|---|---|
| IMP-001 | P0 | Importação TXT/Markdown em UTF-8, incluindo divisão opcional por heading. |
| IMP-002 | P1 | Importação DOCX e RTF com mapeamento semântico e relatório de fidelidade. |
| IMP-003 | P1 | Importação Scrivener `.scriv` / `.scrivx` por adaptador independente e amostras autorizadas: árvore, textos, sinopses, status, notas, pesquisa, quando existentes e interpretáveis; nunca prometer 100%. |
| IMP-004 | P1 | Importação OPML, HTML e Fountain; CSV de metadados sob schema configurável. |
| IMP-005 | P0 | Preview de importação antes de criar/mudar itens; não apagar arquivos originais. |
| IMP-006 | P1 | Exportar pacote completo Writingroom e backup portável verificável. |
| IMP-007 | P1 | Relatório por objeto: importado, transformado, ausente, incompatível, falha. |
| IMP-008 | P2 | Plugins de importação/exportação por interfaces estáveis. |

### 5.8 Plataforma, IA, sincronização, plugins
| ID | Prior. | Requisito e regra de aceite |
|---|---|---|
| PLT-001 | P0 | Windows/Linux/macOS desktop com operações locais, teste de instalador e atualizações assinadas. |
| PLT-002 | P1 | Aplicação web PWA com armazenamento IndexedDB/OPFS e limitações de navegador explicitadas. |
| PLT-003 | P2 | Android e iOS com UI adaptativa e persistência local; bridges nativas auditadas. |
| SYN-001 | P2 | Sincronização opcional E2EE, devices autorizados, resolução explícita de conflitos. |
| SYN-002 | P2 | Provedores self-hosted e adaptadores autorizados; sem sincronizar pasta SQLite aberta via Dropbox/Drive. |
| SYN-003 | P3 | Colaboração em tempo real com identidade e autorização por projeto/documento. |
| AI-001 | P2 | IA opt-in, desligada por padrão; BYOK de API keys ou runtime local. |
| AI-002 | P2 | Prompt contextual com escopo escolhido; prévia de dados enviados, redaction e logs locais. |
| AI-003 | P2 | Ferramentas: brainstorming, resumo, consistência, outline e revisão; apresentar sugestões e diffs. |
| AI-004 | P2 | Chaves armazenadas em cofre de sistema quando disponível; nenhuma chave nos arquivos de projeto. |
| EXT-001 | P2 | SDK de plugins com permissões explícitas, versão de API e compatibilidade. |
| EXT-002 | P2 | Plugins com execução isolada / WASM ou processos limitados; sem acesso arbitrário a arquivos. |

## 6. Regras de domínio e invariantes

- Um projeto tem um `project_id` UUID estável; cada nó tem `node_id` UUID imutável, independente do nome ou posição.
- A árvore é acíclica. Um nó estrutural possui **no máximo um pai**. Boards e coleções guardam **referências** a nós existentes, nunca réplicas do texto.
- Uma cena pode possuir conteúdo e filhos, conforme política de compilação explícita. Evitar perda de texto escondido em pastas.
- Cada movimento atualiza de modo atômico `parent_id`, posição e índices; proibir loops e deletar nós com descendentes sem revisão.
- Uma mudança de metadados não deve reserializar o texto do capítulo inteiro desnecessariamente.
- Contagens devem excluir campos técnicos e poder incluir/excluir notas, headings, comentários e footnotes por perfil.
- `include_in_compile` segue herança de configuração definida e pode ser sobrescrito por nó.
- Relações, links e comentários sobrevivem a renomeação e reordenação; quebra de link é detectada, jamais silenciosamente redirecionada.
- Datas e instantes técnicos em UTC; datas narrativas são representadas em calendário/domain específico, sem forçar ISO Gregorian se história exigir outro calendário.
- Todo formato recebe `schema_version` e migrações; versões futuras desconhecidas abrem apenas em modo de recuperação/read-only.

## 7. Modelo de dados proposto

### 7.1 Objetos centrais

| Entidade | Campos principais | Responsabilidade |
|---|---|---|
| `Project` | id, name, author, locale, kind, settings, schema_version | Agregado raiz |
| `Node` | id, project_id, parent_id, sort_key, kind, title, synopsis, status, label, include_in_compile | Hierarquia unificada |
| `Document` | node_id, content_ref, content_schema_version, word_count_cache | Texto semântico |
| `Asset` | id, media_type, sha256, relative_path, original_name, size | Anexos deduplicáveis |
| `MetadataDefinition` | key, datatype, validation, default, scope | Campos customizados |
| `MetadataValue` | node_id, definition_id, value | Valores individuais |
| `Tag` | id, name, color | Classificação |
| `Relation` | id, from_id, to_id, type, details | Links e worldbuilding |
| `StoryEntity` | id, kind, title, fields, description_ref | Fichas tipadas |
| `Board` | id, view_kind, filters, layout | Projeção / ordenação visual |
| `BoardItem` | board_id, target_id, x, y, lane_id, display_overrides | Referência espacial |
| `Comment` | id, target_node_id, range_anchor, body, resolved | Discussão/nota |
| `Snapshot` | id, target_id, content_hash, created_at, label, actor | Versão imutável |
| `RevisionEvent` | id, sequence, operation, payload, timestamp, checksum | Histórico auditável |
| `Collection` | id, type, query, item_ids | Listas estáticas/dinâmicas |
| `CompileProfile` | id, name, target, stylesheet_ref, options | Template de publicação |
| `WritingSession` | id, started_at, ended_at, counts, local_day | Metas e métricas |
| `ImportJob` | id, source_kind, manifest, warnings, result | Proveniência |
| `ProjectLock` | owner, instance_id, heartbeat, mode | Concorrência local |

### 7.2 Conteúdo rico
Usar **JSON estruturado ProseMirror** como formato canônico inicial para edição, com schema versionado, extensões restritas e preservação de nós desconhecidos sempre que possível. Markdown é **formato de intercâmbio**, não cópia fiel de todos os estilos, anotações e footnotes. Imagens ficam por referências relativas a assets. Cada documento recebe ID e checksum. Não armazenar HTML não sanitizado como verdade canônica.

### 7.3 Pacote de projeto (proposta)
```
Meu Romance.wroom/
  project.json            # identidade, manifest, schema_version, checksum
  project.sqlite          # metadados, árvore, relações, índices (desktop)
  documents/              # blobs de documentos por ID, conteúdo versionado
  assets/                 # imagens, PDFs, anexos hash-addressed
  snapshots/              # snapshots e revisão
  profiles/               # compilação e templates por projeto
  backups/                # backups locais opcionais, fora do pacote por padrão
```
**Regra operacional:** o projeto deve ser movido/copied somente após checkpoint/fechamento ou por exportação de snapshot consistente. SQLite em WAL precisa ter arquivo de journal em uso; copiar só `project.sqlite` com o aplicativo aberto é inseguro. A extensão `.wroom` e o layout acima são propostas de design, não padrões existentes.

### 7.4 Persistência e web
Desktop: SQLite em WAL, transações ACID para metadados, escrita de blobs por temporários + `fsync` + renomeação atômica quando suportada; protocolo de recuperação para operação que cruza DB + filesystem. Web: repositórios de domínio iguais, adapter IndexedDB/OPFS, sem assumir semântica nativa de arquivo/locking. O mecanismo de migração deve validar hashes, aplicar backups preventivos e ser idempotente.

### 7.5 APIs de domínio (contratos ilustrativos)
```ts
interface ProjectRepository {
  create(input: CreateProject): Promise<Project>;
  open(id: ProjectId, mode: 'readwrite'|'readonly'): Promise<ProjectSession>;
  snapshot(id: ProjectId): Promise<BackupManifest>;
}
interface DocumentService {
  applyTransaction(nodeId: NodeId, tx: EditorTransaction): Promise<RevisionId>;
  moveNode(nodeId: NodeId, newParent: NodeId, before?: NodeId): Promise<void>;
  restoreSnapshot(snapshotId: SnapshotId, asNewRevision: true): Promise<void>;
}
interface Importer {
  inspect(source: InputFile): Promise<ImportPreview>;
  execute(preview: ImportPreview, target: ProjectId): Promise<ImportReport>;
}
interface Compiler {
  validate(project: ProjectId, profile: CompileProfile): Promise<CompileDiagnostics>;
  compile(project: ProjectId, profile: CompileProfile): Promise<Artifact>;
}
```

## 8. Arquitetura e stack

### 8.1 Decisão de implementação
- **Tauri 2 + Rust** para desktop e, em fase subsequente, mobile; a viabilidade de cada plugin por plataforma será verificada em spike.
- **React + TypeScript + Vite + TipTap/ProseMirror** para interface/editor. Separar biblioteca de componentes de regras de negócio.
- **Zustand** apenas para estado efêmero de UI; nunca usar como armazenamento persistente autoritativo.
- **SQLite + FTS5** no desktop; adaptador web com IndexedDB/OPFS.
- **pnpm workspaces + Turborepo** para monorepo; crates Rust independentes; workflows reproduzíveis.
- **Vitest, Playwright, cargo test, testes de propriedade/fuzz em parsers.**
- **i18next ou equivalente** com pt-BR e en-US desde o início, sem strings hardcoded.
- **Exportação**: Markdown/TXT nativo; DOCX via biblioteca dedicada; ePub 3 via gerador validado; PDF por HTML→PDF/renderizador escolhido após testes cross-platform. Pandoc como opção externa detectada, não requisito oculto.

### 8.2 Camadas
```
UI React / TipTap
   ↓ typed commands & queries
Application services (TS or Rust FFI / IPC)
   ↓
Domain core (Rust / schemas, invariants, transactions)
   ↓
Repository interfaces / Storage adapters
   ├── SQLite + filesystem (desktop)
   ├── IndexedDB + OPFS (web)
   └── Sandbox local storage (mobile)

Cross-cutting: audit, migrations, backups, search index, accessibility,
localization, permissions, diagnostics (opt-in), cryptographic hashes.
```

### 8.3 Decisão sobre TS/Rust
Evitar duplicação de regras de negócio. Comandos críticos de escrita, árvore, migração e compilação devem residir em um core reutilizável (Rust). O Web pode consumir build WASM quando viável; serviços que exigem filesystem, acesso ao OS ou threading usarão adapters dedicados. **Spike obrigatório:** performance/editor ↔ Rust e viabilidade de FTS/migração no Web antes de congelar a fronteira do core.

### 8.4 Segurança
- Capabilities Tauri minimizadas por janela e plataforma; nada de shell irrestrito.
- CSP restritiva, sanitização de HTML de clipboard/importações, bloqueio de `javascript:`/URLs perigosas, políticas para conteúdo remoto.
- File picker e caminhos por permissões explícitas, bloqueio contra path traversal em ZIP/importações.
- Segredos no keychain/credential vault; projeto livre de API keys.
- Backups sem tokens; telemetria desligada por padrão e documentada quando habilitada.
- Não executar templates ou plugins arbitrários durante compilação sem sandbox.
- Verificação de assinatura/hash de releases; SBOM, auditoria de dependências e threat modeling.

### 8.5 Sincronização futura
Não sincronizar um banco SQLite vivo como arquivo comum. Design sugerido: log de operações com IDs e ordenação causal, merges por campo e, para texto simultâneo, CRDT a ser validado (Yjs é candidato, **não decisão irreversível**). Usuário vê conflitos em exclusões, estrutura, metadados e assets. Criptografia end-to-end exige projeto de gestão de chaves, recuperação e autenticação; sem afirmar E2EE antes de auditoria.

## 9. Pipeline de publicação

1. **Selecionar** parte do Binder, filtros e ordem.
2. **Normalizar** documento em AST de publicação imutável (sem mexer no conteúdo).
3. **Resolver** headings, títulos, numeração, estilos, separadores, notas, citações, imagens e links.
4. **Validar** referências quebradas, imagens ausentes, tabelas, headings incorretos e metadados.
5. **Aplicar perfil** com presets declarativos e stylesheet.
6. **Gerar** artefato específico por renderer (txt/md/html/docx/epub/pdf).
7. **Validar saída** (zip/XML para DOCX/ePub, PDF acessível quando aplicável), gerar relatório e mostrar prévia.
8. **Salvar** arquivo final explicitamente, nunca substituir o original silenciosamente.

A saída ePub deve usar estrutura e metadados válidos e testar com EPUBCheck; DOCX deve ter estrutura OpenXML válida; PDFs exigem comparação visual de páginas e inspeção de texto. Não alegar conformidade sem testes.

## 10. Estratégia de importação Scrivener

**Escopo inicial:** projetos `.scriv` de Windows fornecidos voluntariamente pelos autores, diretório de projeto e `.scrivx`, com itens textuais associados. O formato deve ser estudado mediante fixtures autorizadas, incluindo backups; variáveis por versão, arquivos ausentes e recursos especiais devem gerar avisos.

**Etapas:** detectar versão → copiar fonte para staging seguro → inspecionar manifest e arquivos → mapear Binder e IDs → importar texto e pesquisa compatíveis → converter estilos/links/sinopses/labels/notas/metadados quando possível → relatório por item → comparação de contagens e árvore → aceite do usuário → manter origem intacta.

**Sem prometer inicialmente:** preservar comentários com anchors proprietárias perfeitas, todos os formatos de compilação, layout exato ou recursos protegidos/indocumentados. Fontes de documentação permitem orientar a existência das funções, **não comprovam detalhes exatos do formato interno em todas as versões**. Testes de regressão com arquivos de exemplo são indispensáveis.

## 11. Acessibilidade, qualidade textual e internacionalização

- Keyboard-first: focos visíveis, árvore acessível, menus e cards com alternativas a drag-and-drop, atalhos remapeáveis.
- Contraste alto, dark/light, text scaling, dyslexia-friendly options como preferência (sem prometer benefício clínico), `prefers-reduced-motion`.
- Sem feedback de salvamento exclusivamente por cor; notificações a leitores de tela.
- Títulos semânticos, labels e navegação entre regiões de UI.
- Idiomas editoriais independentes do idioma da interface; separação de caracteres/palavras e regras ortográficas locais.
- PT-BR / EN-US e infraestrutura para traduções comunitárias; RTL tratado como compatibilidade planejada e validada posteriormente.

## 12. Observabilidade, manutenção e governança

- Logs locais redigidos; coleta de diagnóstico só com consentimento.
- Erros críticos geram pacote de diagnóstico **sem conteúdo do manuscrito**, a menos que o usuário revise e aprove.
- Changelog, versionamento SemVer de app/API e schema próprio de projeto.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`, `GOVERNANCE.md`, `ARCHITECTURE.md`, `ADR/`, `ROADMAP.md`.
- Issue templates para bug, RFC, feature, import/export fixture e tradução.
- DCO ou CLA a definir; CI para Windows/macOS/Linux, lint, typecheck, Rust fmt/clippy, testes, assinatura.
- Licença MIT ou Apache-2.0 dependente da avaliação legal das bibliotecas e contribuições; fontes/fontes visuais podem exigir licenças separadas.

## 13. Estrutura sugerida do repositório

```
writingroom/
├── apps/
│   ├── desktop/                  # Tauri 2
│   ├── web/                      # PWA, storage adapter web
│   └── mobile/                   # Android/iOS fase posterior
├── packages/
│   ├── ui/                       # componentes, design tokens, a11y
│   ├── editor/                   # extensões TipTap/ProseMirror
│   ├── app-shell/                # navegação, painéis, layout
│   ├── domain-types/             # contratos e DTOs tipados
│   ├── importers/                # adapters isolados
│   ├── exporters/                # adapters isolados
│   ├── design-system/
│   ├── i18n/
│   └── testing/
├── crates/
│   ├── writingroom-domain/
│   ├── writingroom-storage/
│   ├── writingroom-search/
│   ├── writingroom-compiler/
│   ├── writingroom-platform/
│   └── writingroom-wasm/         # depois de validar spike
├── docs/
│   ├── product/
│   ├── architecture/adr/
│   ├── specifications/
│   ├── importers/
│   ├── contributors/
│   └── security/
├── fixtures/                     # arquivos criados para testes
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── performance/
│   └── recovery/
├── .github/workflows/
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── GOVERNANCE.md
├── LICENSE
├── pnpm-workspace.yaml
└── turbo.json
```

## 14. Roadmap por entregas e gates

### F0 — Descoberta e provas de conceito
**Saídas:** ADR inicial, protótipo navegação, teste TipTap + persistência, teste Tauri/React/Rust, protótipo pacote `.wroom`, política de licença.  
**Gate:** arquitetura dos dados aprovada, vazamento de dados ausente, decisões registradas.  
**Não construir:** sincronização, IA ou mapa gráfico antes do fluxo principal.

### F1 — Alpha estrutural
- Criar/abrir projeto, Binder, nós, editor, autossalvamento, lixeira, snapshots mínimos, recuperação.
- Importar TXT/Markdown; exportar TXT/Markdown.
- Indicador de estado e scripts de stress de crash/power-loss simulados.
**Gate:** criação→escrita→fechamento→reabertura→exportação sem perda; move/undo validado.

### F2 — Alpha criativa
- Manuscrito contínuo, cartões e outline compartilhando a mesma árvore.
- Inspector básico, busca FTS5, etiquetas/status/sinopses, foco, layout dividido.
- Metas simples e teclado.
**Gate:** reorganização em qualquer vista sem divergência nem duplicação.

### F3 — Beta de escritores
- Pesquisa e attachments, snapshots visuais, comentários/notas, templates.
- Importação DOCX/RTF e primeiro importador Scrivener experimental.
- Publish Room com DOCX/HTML/ePub/PDF e validação de saída.
- A11y, performance, fixtures grandes, recuperação em ambiente real.
**Gate:** testes de round-trip, relatórios de perdas, compile presets e issue triage.

### F4 — v1.0 desktop
- Polimento, backup/restauração assistidos, integrações confiáveis, atualizações assinadas, documentação, internacionalização pt-BR/en-US, instaladores desktop.
**Gate:** todos os critérios de lançamento abaixo; release candidate assinado.

### F5 — Expansão pós-v1.0
- PWA, mobile com adapters testados, wiki ampliada, timeline, grid, plugins, IA opt-in, sync E2EE, colaboração (por ordem de evidência de demanda e risco).
- Dependências entre sync, multi-device e colaboração devem ser resolvidas antes do lançamento público.

## 15. Critérios de aceite do produto

**AC-01:** criar projeto vazio e capítulo, digitar 10 mil caracteres, fechar abruptamente, reabrir e recuperar sem corrupção; comunicar qual texto foi realmente confirmado.  
**AC-02:** mover cena de capítulo A para B em árvore, cartão e outline; verificar mesmo ID, texto, relações e ordem de compilação.  
**AC-03:** criar comentário e snapshot, alterar parágrafo, comparar e restaurar como nova versão sem apagar histórico.  
**AC-04:** apagar árvore com anexos, restaurar da lixeira e validar filhos/links.  
**AC-05:** importar Markdown com headings e exportar preservando semântica suportada; relatório onde perda é possível.  
**AC-06:** bloquear ZIP path traversal, HTML malicioso em clipboard e assets externos não autorizados.  
**AC-07:** validar backup de um projeto em máquina/instalação limpa, reabrir e comparar checksum/contagens.  
**AC-08:** gerar PDF, DOCX e ePub a partir do mesmo manuscrito e comprovar hierarquia de capítulos e metadados.  
**AC-09:** navegar por teclado entre Binder, editor, cartões e Inspector com foco anunciado.  
**AC-10:** alternar pt-BR/en-US sem mudar o texto, metadados semânticos nem formatos de data não relacionados.  
**AC-11:** abrir projeto criado por versão futura em modo protegido sem migrar destrutivamente.  
**AC-12:** sem internet ou conta, todas as funções P0 permanecem operantes.

## 16. Matriz de testes

| Tipo | Cenários | Ferramentas sugeridas |
|---|---|---|
| Domínio | árvore acíclica, índices, relações, IDs | Rust unit/property tests |
| Editor | paste, undo, IME, caracteres combinados, split | Vitest, Playwright |
| Persistência | queda no write, falta de disco, retomada, migrations | testes de integração e fault injection |
| Importação | encoding, huge files, malformados, recursos ausentes | fixtures, fuzzing |
| Compilação | perfis, footnotes, TOC, imagens, metadados | golden files + validadores |
| Segurança | XSS, path traversal, permission escalation | testes automatizados + revisão |
| Performance | 1M palavras / 100k capítulos / muitos nós | benchmarks versionados |
| Plataforma | Windows/Linux/macOS, depois web/mobile | matrizes CI e testes manuais |
| A11y | keyboard, screen reader, contraste, zoom | axe + avaliação assistiva |

## 17. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Perda de dados por DB/FS fora de sincronismo | Crítico | transações, commit protocol, recovery, backups e testes de falha |
| Editor rich-text com inconsistências | Alto | schema semântico simples, versionamento, round-trip e IME tests |
| Escopo excessivo entre seis plataformas | Alto | desktop-first e ports liberados por gates |
| Imports proprietários incompletos | Alto | preview, logs de perdas, compatibilidade declarada |
| Sync gera conflito/destruição | Crítico | adiar, protocolo de operações, merge explícito, testes multi-device |
| Plugins maliciosos | Alto | sandbox/capabilities, permissões e assinatura opcional |
| IA envia material confidencial | Alto | off padrão, consentimento por escopo, transparência |
| Licenças de dependências | Médio-alto | SBOM, análise legal e política de assets |
| Exportações de baixa fidelidade | Alto | AST, validadores e golden files |
| Complexidade visual torna app hostil | Médio-alto | progressive disclosure, modo foco, testes com autores |

## 18. Backlog inicial convertido em épicos e issues

**EPIC-00 Fundamentos:** WR-001 iniciar workspace TS/Rust; WR-002 CI 3 sistemas; WR-003 padrões lint/tests; WR-004 ADR core; WR-005 sistema i18n; WR-006 tokens de UI e a11y.  
**EPIC-01 Projeto:** WR-010 schema Project; WR-011 extensão `.wroom`; WR-012 cria/abre; WR-013 lock; WR-014 migration; WR-015 backup e restauração.  
**EPIC-02 Estrutura:** WR-020 árvore; WR-021 operações atômicas; WR-022 lixeira; WR-023 metadados; WR-024 sinopse; WR-025 coleções.  
**EPIC-03 Editor:** WR-030 TipTap schema; WR-031 autosave; WR-032 undo; WR-033 recovery; WR-034 editor contínuo; WR-035 modo foco; WR-036 split.  
**EPIC-04 Planejamento:** WR-040 outliner; WR-041 cartões da mesma árvore; WR-042 drag/reorder; WR-043 scratchpad; WR-044 wiki.  
**EPIC-05 Busca:** WR-050 FTS index; WR-051 busca contextual; WR-052 quick command; WR-053 backlinks.  
**EPIC-06 Importação:** WR-060 TXT/MD; WR-061 preview; WR-062 DOCX; WR-063 Scrivener parser; WR-064 relatório de perdas.  
**EPIC-07 Publicação:** WR-070 AST; WR-071 TXT/MD; WR-072 HTML; WR-073 DOCX; WR-074 ePub; WR-075 PDF; WR-076 perfis e preview.  
**EPIC-08 Qualidade:** WR-080 tests failure injection; WR-081 a11y; WR-082 performance; WR-083 security review; WR-084 installers e assinatura.

### Definition of Done por issue
Código versionado e revisto; requisito rastreado; testes e mocks; persistência e migração quando aplicável; casos de erro; UX teclado/a11y; atualização da documentação; sem arquivos de usuário em telemetria; build reproduzível em CI; ADR atualizado para decisão arquitetural.

## 19. Primeira sprint sugerida

**S1.1** scaffolding do monorepo, comandos de desenvolvimento, teste e CI.  
**S1.2** definir schema de projeto `.wroom`, IDs, nó e documento; implementar validações.  
**S1.3** criar/abrir projeto e banco SQLite com migração v1, sem UI complexa.  
**S1.4** integrar editor TipTap com persistência transacional e status.  
**S1.5** reproduzir teste fim a fim: criar projeto → escrever → fechar → reabrir → exportar Markdown.  
**S1.6** simular crash, falta de espaço e interrupção na gravação; reportar e corrigir.  
**Critério para avançar:** testes do fluxo principal e recuperação verdes em Windows, Linux e macOS.

## 20. Perguntas de produto ainda não bloqueantes

1. A primeira versão se destina prioritariamente a ficção longa ou também a acadêmicos/roteiristas desde o lançamento?
2. Deseja estética minimalista literária, estilo estúdio modular ou perfis intercambiáveis? **Padrão proposto:** minimalista com painéis ativáveis.
3. O licenciamento deve maximizar adoção (MIT/Apache-2.0) ou exigir reciprocidade de forks (GPL/AGPL)? **Padrão provisório:** Apache-2.0, condicionado à auditoria.
4. Haverá um formato único `wroom` portátil independente da plataforma? **Recomendação:** sim, com adapters de storage e exportação documentada.
5. Após desktop, qual prioridade: Web ou mobile? **Proposta:** Web antes de mobile, após validação do core WASM.
6. A sync futura será por servidor próprio, self-host e/ou serviços existentes? **Proposta:** protocolo aberto e implementação self-host opcional.

Essas decisões não impedem começar a F0/F1.

## 21. Fontes e materiais consultados

- **Fonte do usuário:** `Scrivener_Manual-Win.pdf`, Scrivener 3 User Manual for Windows, Literature & Latte Ltd., março de 2026, revisão 3.1.6, 776 páginas. Consulta privada para análise; **não redistribuir** o manual ou seus diagramas no repositório.
- BYOK Studio: https://byok.io/studio (consulta em 2026-11-02).
- BYOK Guides: https://byok.io/guides (consulta em 2026-11-02).
- BYOK workflow: https://byok.io/novel-writing-workflow (consulta em 2026-11-02).
- Vídeo fornecido: https://www.youtube.com/watch?v=QFAy1Wi_r-w&t=52s (transcrição não verificada).
- NEO: https://github.com/hughhowey/neo (consulta em 2026-11-02).
- Tauri: https://tauri.app/security/capabilities/ e https://github.com/tauri-apps/tauri (consulta em 2026-11-02).

## 22. Estado do documento e próximas entregas

Esta especificação é a **baseline completa de escopo e arquitetura**, não uma implementação nem uma certificação de paridade com concorrentes. Próximos arquivos de engenharia recomendados: `docs/architecture/adr/0001-architecture.md`, `docs/specifications/data-model.md`, `docs/specifications/project-format.md`, `docs/specifications/editor.md`, `docs/specifications/compilation.md`, `docs/specifications/import-scrivener.md`, `docs/roadmap/MILESTONES.md` e um `CONTRIBUTING.md` com instruções verificadas em CI. A implementação deve começar pelos invariantes e pela preservação dos dados, não por IA ou painéis sofisticados.
