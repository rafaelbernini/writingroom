# WritingRoom — catálogo de evolução a partir do manual Windows

Data: 2026-11-02. Fonte local: Scrivener 3 para Windows, revisão 3.1.6.0-02, março de 2026. Este documento complementa `writingroom_SPEC_v1.0.md` e o plano mestre; não altera seus gates. É uma síntese funcional original, sem reproduzir ilustrações, texto ou interface do manual.

## Alcance da análise e estados

O PDF foi extraído localmente com `pdftotext -layout`; seu sumário, títulos de seções dos capítulos e apêndices foram indexados. Aprofundamento nesta entrega: estrutura, coleções, versões, metas e layouts de compilação. O catálogo cobre as famílias funcionais identificadas; **não é uma auditoria de cada comando, opção ou exceção das 776 páginas**, nem comprova formatos internos `.scriv`. Regras detalhadas de cada módulo ainda precisam de leitura dirigida, fixtures e testes antes da implementação. O texto extraído permanece fora do repositório.

Os IDs `SCR-*` são itens de backlog complementares, não substituem os IDs canônicos. Cada linha define uma unidade de aceitação e aponta para requisitos existentes. Todos são **planejados**, salvo quando explicitamente marcados como **parciais**. As datas e releases do plano mestre não constituem prazo de entrega.

- G0 / WR-0A: integridade do protótipo, testes de rejeição, API segura.
- G1 / WR-0B: armazenamento, revisão, lock, backup, recuperação e migração.
- G2 / WR-0D: editor semântico e salvamento confirmado.
- G3 / WR-0E: vistas sobre os mesmos IDs, metadados e busca.
- G4 / WR-0F: importação/publicação verificadas; recursos de beta passam também por WR-0G.
- G5 concluído: pré-condição para módulos futuros WR-1X. A indicação do gate é dependência mínima, não afirmação de aprovação.

## Projetos, estrutura e materiais

| ID | Referência no manual | Capacidade e aceite proposto | SPEC / execução |
|---|---|---|---|
| SCR-001 | 5.1, 5.3 | Criar/abrir, recentes, renomear, duplicar, arquivar; duplicação remapeia IDs e links e não modifica origem. **Parcial:** criar/listar/abrir. | LIB-001, LIB-005; G1 |
| SCR-002 | 5.2, B.9 | Backups automáticos configuráveis e manuais, retenção e destino independente; restaurar em pasta limpa e verificar hashes. Snapshot não conta como backup. | IMP-006; WR-0B-06 |
| SCR-003 | 5.3 | Abrir com lock, indicar projeto indisponível/corrompido e proteger versão futura; nunca ocultar erro na biblioteca. | LIB-005; WR-0A-06, G1 |
| SCR-004 | 5.4 | Templates de projeto editáveis, criação em branco e templates pessoais exportáveis, com versão e sem scripts executáveis. | LIB-002, LIB-006; G1/G4 |
| SCR-005 | 5.5, C.1 | Preferências globais e por projeto, com importação seletiva e prévia de alterações; preservar configurações não selecionadas. | LIB-007; G1 |
| SCR-006 | 6.1–6.4 | Árvore, seleção múltipla, expandir/recolher, ordenar, indent/outdent e mover por teclado; mudança em lote atômica. **Parcial:** árvore, reordenação e raízes. | STR-001, STR-002; G0/G3 |
| SCR-007 | 6.2 | Lixeira reversível, subárvores e origem da restauração; impedir apagar raízes e separar esvaziar lixeira de remover referência. **Parcial:** restauração sem exclusão definitiva. | STR-008; G0/G1 |
| SCR-008 | 7.1–7.4 | Indicadores e ícones de tipo/estado, título explícito ou sugestão reversível a partir do texto; não trocar IDs ou títulos silenciosamente. | STR-001, INS-001; G3 |
| SCR-009 | 7.3 | Documento com texto e filhos, conversão pasta/texto sem perda; definir compilação antes de migrar o modelo atual que só permite filhos em pastas. | STR-001; G1/G2, ADR obrigatório |
| SCR-010 | 7.5 | Templates de documento com campos e estrutura, inseridos como objetos independentes e editáveis. | LIB-006, INS-002; G3 |
| SCR-011 | 7.6, C.2 | Tipos de seção semânticos (parte/capítulo/cena), herança por profundidade e override explícito; layout de saída separado do tipo. | PUB-005, PUB-006; G4 |
| SCR-012 | 9.1 | Importar textos, pastas e materiais compatíveis por seleção ou arraste, sempre com preview, limites e relatório por objeto. | IMP-001–005, IMP-007; G4 |
| SCR-013 | 9.2 | Pesquisa anexada ou vinculada; informar indisponibilidade, evitar carregamento remoto automático e verificar referências após mover projeto. | STO-009, STO-010; G1/G3 |
| SCR-014 | 9.3 | Captura rápida independente do editor, transferir ou acrescentar ao documento com histórico e escolha de destino. | STO-008; G1/G3 |
| SCR-015 | 9.4 | Acrescentar seleção/texto a nota ou cena existente, com preview de destino, undo e snapshot anterior para operações em lote. | STO-008, EDT-004; G2 |
| SCR-016 | 9.5 | Limpar espaçamento e formatação importada por regras selecionadas; mostrar diff, manter origem e permitir desfazer. | IMP-005, EDT-012; G2/G4 |

## Vistas, navegação, organização e busca

| ID | Referência | Capacidade e aceite proposto | SPEC / execução |
|---|---|---|---|
| SCR-017 | 8.1 | Editor individual e manuscrito contínuo; cada trecho salva no documento original, com seleção, limites e navegação definidos. | EDT-001, EDT-003; G2 |
| SCR-018 | 8.1, 12.2 | Divisão horizontal/vertical, travar documento no painel, histórico independente, referência auxiliar e foco explícito. | EDT-005, INS-005; G2/G3 |
| SCR-019 | 8.2 | Cartões ligados aos mesmos nós, sinopse, cores, tamanho e wrap configuráveis; mover por teclado produz a mesma ordem da árvore. | STO-002; G3 |
| SCR-020 | 8.2 | Quadro livre, pilhas e organização por etiquetas, com confirmação antes de aplicar ordem espacial ao manuscrito. | STO-003; G3, entrega posterior |
| SCR-021 | 8.3 | Outliner hierárquico com colunas configuráveis, contagens, metas, status e edição em lote; filtros não alteram a árvore. | STO-001, INS-002; G3 |
| SCR-022 | 10.1 | Links internos estáveis, referências externas e backlinks; renomear/mover não quebra destino e links inválidos ficam sinalizados. | STO-005; G1/G3 |
| SCR-023 | 10.2 | Coleções manuais de IDs e dinâmicas por consulta salva; remover da coleção não apaga o documento; ordem experimental não altera Binder. | STR-005, WR-0E-05; G3 |
| SCR-024 | 10.3 | Bookmarks de projeto/documento, internos/externos e preview local; editar referência sem duplicar texto. | INS-002, INS-005; G3 |
| SCR-025 | 10.4, C.3 | Etiquetas e status personalizados, cores e defaults; remover opção usada exige mapear valores existentes. **Parcial:** status textual e sinopse. | STR-004, INS-001; G1/G3 |
| SCR-026 | 10.4, C.4 | Keywords hierárquicas e metadados tipados: texto, checkbox, lista e data; validar valores e apresentar impacto de excluir campos. | INS-002; G1/G3 |
| SCR-027 | 11.1 | Busca por campos/escopo, frase/todas/quaisquer palavras, case/acentos configuráveis, inclusão explícita da lixeira e consulta salva. **Parcial:** título/sinopse/texto, sem lixeira. | INS-003, WR-0E-06; G3 |
| SCR-028 | 11.2–11.3 | Encontrar/substituir em documento ou projeto com contagem, prévia por ocorrência, confirmação e reversão de lote. | EDT-010; G2/G3 |
| SCR-029 | 11.4–11.5 | Filtros de cartões/outline e busca rápida por título; limpar filtro restaura contexto e seleção sem reordenar documentos. | INS-003, INS-005; G3 |
| SCR-030 | 11.6 | Encontrar estilo, anotação, comentário, nota e destaque sem depender só da cor; levar ao trecho correto. | EDT-009, EDT-012; G2/G3 |
| SCR-031 | 11.7 | Expressões regulares opcionais, com sintaxe informada, limites de execução e preview de substituições; consulta patológica não congela UI. | EDT-010; G3, motor a decidir |
| SCR-032 | 12.1–12.2 | Anterior/próximo, voltar/avançar, caminho, ir ao pai e revelar documento na árvore; atalhos acessíveis e foco previsível. | INS-005; G3 |
| SCR-033 | 12.3–12.5 | Layouts nomeados, visibilidade de painéis, somente compiláveis e reset de navegação; preferências não alteram texto. | LIB-007, EDT-006; G3 |
| SCR-034 | 12.6 | Referência rápida em painel/janela com editor ou material de pesquisa independente; fechamento não perde alterações. | EDT-005; G2/G3 |
| SCR-035 | 13.1–13.5 | Inspector acompanha painel ativo; sinopse, notas, imagem de sinopse, bookmarks, campos e estatísticas em abas. | INS-001, INS-002; G3 |

## Escrita, revisão e ferramentas

| ID | Referência | Capacidade e aceite proposto | SPEC / execução |
|---|---|---|---|
| SCR-036 | 13.6, 15.8 | Versões nomeadas, data, leitura e restauração com preservação automática do texto anterior. **Parcial entregue:** lista, prévia literal e restauração; sem diff, revisão/CAS ou backup externo. | EDT-013; G0/G1/G2 |
| SCR-037 | 13.6, 15.8 | Comparar versão com atual ou outra versão, navegação de diferenças, snapshots em lote e gerenciador por projeto; exclusão requer política explícita. | EDT-013; G2/G3 |
| SCR-038 | 13.7, 18.1–18.4 | Comentários ancorados e inline, notas de rodapé/fim, navegar, resolver e converter tipos com âncoras preservadas após edição. | EDT-009; G2 |
| SCR-039 | 15.1–15.3 | Texto rico semântico, Unicode/IME, undo, colagem segura com/sem estilo, listas, tabelas, links, busca e caracteres especiais. | EDT-001–003, EDT-012; G2 |
| SCR-040 | 15.4 | Dividir no cursor ou seleção e mesclar documentos, preservando ordem, referências, versões e metadados com relatório de conflitos. | STR-003; G1/G2 |
| SCR-041 | 15.5 | Edição contínua de seleção arbitrária, divisores claros e busca no escopo; ação num trecho nunca grava no vizinho. | EDT-003; G2 |
| SCR-042 | 15.6 | Imagens inline por asset, tamanho, legenda e texto alternativo, sem fetch remoto implícito; round-trip de referência em exportação. | EDT-001, STO-009, PUB-008; G2/G4 |
| SCR-043 | 15.7 | Recuos, alinhamento, espaçamento, tabulações, listas e tabelas semânticas; limpar formatação não apaga comentários. | EDT-012; G2 |
| SCR-044 | 16.1 | Composição/foco com fonte, largura, zoom e fundo configuráveis; saída por teclado e estado de salvamento sempre acessível. **Parcial:** alternância de foco. | EDT-006; G2 |
| SCR-045 | 16.2 | Visualização paginada separada da edição e preview final; não prometer mesma paginação de formatos diferentes. | PUB-005, EDT-006; G4 |
| SCR-046 | 16.3 | Rolagem máquina de escrever e realce de parágrafo/linha opcionais, sem interferir em seleção ou IME. | EDT-007; G2 |
| SCR-047 | 17.1–17.5 | Estilos nomeados de parágrafo/caractere, próximo estilo, atualização global e transferência de stylesheet; editor e saída têm regras independentes. | EDT-012, PUB-006; G2/G4 |
| SCR-048 | 18.5–18.6 | Destaques e marcação de revisões com legenda textual, ciclos de revisão e filtros; distinguir marcação por cor de controle formal de alterações. | EDT-009, EDT-014; G2, controle formal posterior |
| SCR-049 | 19.1, 19.6–19.7 | Modo roteiro com elementos e transições de teclado, formatos personalizados e templates para usos diversos, sem forçar fluxo no romance. | EDT-016; G2/G4 |
| SCR-050 | 19.2–19.5 | Fountain e intercâmbio com formatos de roteiro após fixtures autorizadas; relatório de perdas, paginação e sugestões de personagens. | EDT-016, PUB-010, IMP-004; G4 |
| SCR-051 | 20.1 | Metas de documento, pasta, projeto e sessão em palavras/caracteres, prazo, reset configurável e escrita/redução, sem cobrança obrigatória. | EDT-011; G1/G3 |
| SCR-052 | 20.1 | Estatísticas por seleção, compiláveis e texto completo; frequência de palavras e histórico por dia com definição de contagem e fuso local. | EDT-011; G1/G3 |
| SCR-053 | 20.2, C.6 | Autocompletar vocabulário configurável por projeto/escopo, opt-in, com sugestões canceláveis e sem substituição silenciosa. | EDT-015; G2 |
| SCR-054 | 20.3, B.6 | Ortografia local pt-BR/en-US, dicionários instaláveis e pessoais, ignorar/sugerir/substituir com undo; não confundir `spellcheck` do navegador com suporte offline validado. | EDT-008, WR-I18N-01–06; G2/G5 |
| SCR-055 | 20.3 | Transformações de texto, tipografia, limpeza de espaços e repetições, hifenização/sinônimos conforme pacotes licenciados; cada ação participa do undo. | EDT-015; G2, extensões posteriores |
| SCR-056 | 20.4 | Gerador opcional de nomes, listas locais licenciadas e filtros; resultado só entra no manuscrito por ação do autor. | STO-008; pós-G5, baixa prioridade |
| SCR-057 | 20.5 | Bibliografia: vínculos com gerenciador externo e identificadores de citação, funcionamento degradado offline e renderização verificável. | EDT-009, PUB-007; G4, adaptador posterior |

## Publicação, exportação e impressão

| ID | Referência | Capacidade e aceite proposto | SPEC / execução |
|---|---|---|---|
| SCR-058 | 21.1–21.7 | MultiMarkdown/Pandoc opcional, metadados e documentos de metadados, matemática, citações e snippets; detectar ferramenta/versão, não executar comandos do manuscrito. | IMP-001, PUB-003, PUB-007; G4 |
| SCR-059 | 22.1–22.3 | Sumário por headings/estrutura, âncoras em ebook e referências de página em saída paginada; detectar links quebrados. | PUB-007; G4 |
| SCR-060 | 23.1–23.3 | Seleção de formato, perfis próprios/globais, duplicar/importar/exportar, atribuir layouts e prévia antes de gerar arquivo. | PUB-004–006; G4 |
| SCR-061 | 23.4.1 | Escolher ramo, seleção ou coleção, ordem e inclusão por nó, conteúdo inicial/final e filtro; compilar sem alterar origem. **Parcial:** Draft, ordem e include. | PUB-001; G0/G4 |
| SCR-062 | 23.4.2–23.4.3 | Metadados editoriais por formato, título/autor/idioma/identificadores, opções de notas, imagens e formatação; validar campos obrigatórios. | PUB-005, PUB-008; G4 |
| SCR-063 | 23.4.4–23.4.6 | Substituições só na saída, capa e sumário do ebook; preview indica transformação sem modificar o manuscrito. | PUB-005–008; G4 |
| SCR-064 | 23.5–23.6 | Renderizadores por formato, salvar configurações, diagnósticos e conclusão de exportação; validar artefato antes de anunciar sucesso. | PUB-002–003, PUB-008; G4 |
| SCR-065 | 24.1–24.2 | Designer declarativo: escopo, layout de seção, título/texto/sinopse/metadados, prefixo/sufixo, numeração e quebras. | PUB-006; G4 |
| SCR-066 | 24.3 | Separadores conforme tipo anterior/seguinte, seções vazias e quebra; fixtures cobrem matriz de combinações. | PUB-001, PUB-006; G4 |
| SCR-067 | 24.4–24.5 | Mapear estilos do editor para saída, preservar estilos selecionados e controlar fluxo, viúvas/órfãs quando renderizador suportar. | PUB-005–006; G4 |
| SCR-068 | 24.6–24.9 | CSS, links de títulos, elementos HTML e markup por formato; validar e sanitizar, sem scripts ou requisições externas ocultas. | PUB-003, PUB-006; G4 |
| SCR-069 | 24.10–24.14 | Metadados, LaTeX, transformações e opções MMD/Pandoc, substituições com escopo e ordem definidos; limites e diagnóstico de recursos incompatíveis. | PUB-006–008; G4 |
| SCR-070 | 24.15–24.18 | Estatísticas de saída, tabelas/listas, notas de rodapé/fim, comentários e anotações: incluir/omitir/converter por perfil, sem alterar origem. | PUB-006–008; G4 |
| SCR-071 | 24.19–24.20 | Papel, margens, cabeçalhos/rodapés, paridade, primeira página e compatibilidade por formato; validar visualmente PDF e estrutura de DOCX. | PUB-003, PUB-005; G4 |
| SCR-072 | 24.21 | Pós-processamento: manter desligado; eventual adaptador só com permissões explícitas e sandbox. Não executar scripts arbitrários de presets importados. | EXT-001–002; pós-G5 |
| SCR-073 | 25.1–25.2 | Exportar documentos individuais e subárvores com nomes seguros, hierarquia, metadados e manifesto; não confundir com compilação nem backup. | IMP-006, PUB-002; G4 |
| SCR-074 | 25.3–25.4 | Exportar outline OPML e tabela CSV de metadados, Unicode, escaping e prevenção de fórmulas de planilha; importar com mapeamento explícito. | IMP-004; WR-0G-04 |
| SCR-075 | 26.1–26.5 | Imprimir documento, cartões, outline e manuscrito com preview, seleção e paginação, via adaptador nativo; cancelamento não modifica projeto. | PUB-005, PUB-009; G4/G5 |

## Preferências, plataformas e adaptação crítica

| ID | Referência | Decisão de produto e aceite | SPEC / execução |
|---|---|---|---|
| SCR-076 | 14.1–14.3, B.8 | Intercâmbio entre dispositivos e pasta externa são referências de fluxo, não protocolo a copiar. Sync futura usa objetos/revisões e conflitos; nunca banco aberto por cópia de pasta. | SYN-001–002; pós-G5 |
| SCR-077 | A.1–A.11 | Inventariar comandos do módulo implementado, atalhos remapeáveis e menus pesquisáveis; toda ação essencial acessível por teclado, sem copiar nomes/layout proprietário. | WR-0E-07, WR-0G-02; G3/G5 |
| SCR-078 | B.1–B.5, B.7 | Preferências de inicialização, salvamento, autor, aparência, painéis, temas e avisos, com defaults seguros e restauráveis; preferência não muda conteúdo sem preview. | LIB-007, EDT-006; G2/G5 |
| SCR-079 | B.2.4, B.6, C.5 | Interface e idioma editorial independentes, catálogos pt-BR/en-US, fallback, pacotes offline e opções de formatação por projeto. | WR-I18N-01–06; G2/G5 |
| SCR-080 | C.7–C.9 | Pastas especiais e fundos configuráveis sem alterar semântica das raízes, referências e política de backups; manter opção de restaurar padrão. | LIB-007, STR-001; G3/G5 |
| SCR-081 | D | Perfis originais de manuscrito, outline, revisão, impressão, ebook, roteiro e saída Markdown/acadêmica, cada um com fixture e matriz de formatos; não copiar presets proprietários. | PUB-004; G4 |
| SCR-082 | E | Histórico de versões é insumo de testes de compatibilidade: estilos, metadados, snapshots e mudanças no pipeline. Não implica compatibilidade com versões Scrivener anteriores. | IMP-003, IMP-007; G4 |
| SCR-083 | F–G | Materiais extras/créditos não são funcionalidades; oferecer documentação e exemplos próprios, registrar licenças das fontes e assets realmente utilizados. | WR-0G-07; G5 |
| SCR-084 | 1–4 | Onboarding de projeto vazio, tutorial próprio opcional, glossário e ajuda contextual; não exigir conta ou método narrativo para começar. Instalação comercial/ativação não se aplica ao WritingRoom. | LIB-002, PLT-001; G5 |

## Melhorias próprias além da referência

As propostas abaixo são escolhas do WritingRoom, não capacidades atribuídas ao manual:

1. **Transparência de salvamento:** estados editando/pendente/salvando/confirmado/conflito/erro e revisão verificável; bloqueio de operações destrutivas quando houver alterações não confirmadas.
2. **Migração auditável:** inspeção, preview e relatório por objeto, origem intacta e reversão; nunca confundir importação com fidelidade visual total.
3. **Privacidade local:** correção e busca offline, sem telemetria por padrão, assets sem downloads ocultos e nenhum envio de manuscrito para IA sem escolha explícita de escopo.
4. **Acessibilidade estrutural:** teclado equivalente ao arraste, anúncios de salvamento, contraste, zoom e cor nunca como único indicador.
5. **Publicação explicável:** prévia de omissões e transformações, validador por formato e relatório de referências faltantes.
6. **Planejamento opcional:** wiki, relações, cronologia e inconsistências com evidência, após seus gates; nenhuma ficha obrigatória para escrever uma página.
7. **Portabilidade:** formato documentado, backup verificável em instalação limpa e exportação sem dependência de serviço ou assinatura.

## Ordem de execução e critérios para concluir

1. Finalizar WR-0A: rejeições sem mutação, subárvores, API concorrente, Host/Origin, projetos inválidos e testes HTTP.
2. ADR e implementação WR-0B: revisão/CAS, lock, backups e restauração, falhas de disco e migração legada; manter projetos originais.
3. Editor WR-0C/0D e idiomas: conteúdo semântico, undo, IME, recuperação, preferências e comparação de versões.
4. WR-0E: outline/cartões, coleções, metadados e busca refletindo os mesmos IDs.
5. WR-0F/0G: importadores, pipeline de compilação, presets, formatos e impressão; provar round-trip, validade de saída e acessibilidade nas plataformas anunciadas.
6. Só após G5: sync, plugins, mobile, IA e ferramentas exploratórias.

Para marcar uma linha como entregue: apontar módulo, teste executado, limites conhecidos e release real em `TRACEABILITY.md`. Esta entrega não encerra os gates nem representa paridade com Scrivener.

## Atualização de implementação — alpha.2

As famílias abaixo avançaram da proposta para **implementação parcial integrada**. Esta tabela complementa o estado histórico das linhas anteriores; não declara aceite integral de cada capacidade.

| IDs | Implementação na aplicação atual | Limites |
|---|---|---|
| SCR-004/005 | Modelos vazio/romance/não ficção e configurações | Sem templates pessoais versionados |
| SCR-006/007 | Vistas da mesma árvore, mover/reordenar e restaurar item | Sem multi-seleção/undo estrutural/drag |
| SCR-012/016 | TXT/MD UTF-8 com preview/avisos, headings planos | Sem formatos ricos ou limpeza de estilo |
| SCR-017/018/034 | Leitura contínua e referência lateral | Sem edição simultânea em dois painéis |
| SCR-019/021/025/027 | Cartões, outline, campos e busca ampliada | Sem FTS/colunas arbitrárias/quadros livres |
| SCR-036/037/040 | Versões, comparação por trecho, restore e split | Sem diff mínimo/manager global/merge |
| SCR-044/046/051/052 | Foco, tema, fonte, rolagem aproximada, metas/estatísticas | Sem histórico diário/contagem linguística validada |
| SCR-059/061/064/073/075 | Sumário e preview textual, MD/TXT/HTML e impressão do navegador | Sem PDF nativo/DOCX/ePub/designer |
| SCR-002 | Backup JSON verificado e restore em novo projeto | Sem retenção/backup agendado/assets externos |

Evidência: 66 testes Node e 19 verificações de fluxo no Firefox, em PROGRESS/TRACEABILITY. ADR-0007 registra o avanço visível autorizado pelo usuário, preservando o JSON atual e sem declarar G1 aprovado.

## Atualização alpha.3

SCR-023 (coleções manuais/consultas), SCR-028 (encontrar/substituir literal com preview), SCR-014/015 (capturas/cópia para cena) e parte de SCR-064 (DOCX básico/EPUB experimental) agora têm implementação integrada. Fichas textuais de Pesquisa ampliam o planejamento original. Evidências: 85 testes Node, 26 verificações de fluxo Firefox e DOCX aberto no LibreOffice com texto conferido. Sem regex, grafo de entidades ou EPUBCheck. Desktop fica por último; a especificação do manual continua parcial.

## Evidência alpha.5 — SCR-030 / SCR-038

Comentários privados e notas vinculadas a seleções visuais estão parcialmente implementados: editar/navegar/buscar na cena/resolver/reabrir/remover, âncoras preservadas nas transações cobertas, snapshots/backup/undo. Notas finais por cena em exports; comentários privados omitidos. Não inclui conversão de tipos, threads, busca global ou rodapés Word nativos. ADR-0009/PROGRESS: 115 testes Node/41 fluxos Firefox. O restante do catálogo permanece backlog; não é declaração de implementação integral.

## Evidência alpha.6 — SCR-012 / SCR-013

Pesquisa com anexos locais implementada parcialmente: PNG/JPEG/PDF/TXT/Markdown, prévia/confirmação/cancelamento, consulta de imagem/texto, download original, metadados/busca e lixeira. Backup conserva bytes e remapeia referências ao restaurar. Sem preview PDF interno/OCR, paths vinculados, acervos grandes ou imagens inline/exportadas com livro. ADR-0010/PROGRESS: 129 testes Node e 47 fluxos Firefox; o catálogo completo continua backlog.
