# ADR-0003 — editor semântico opcional e compatível com o legado

Data: 2026-11-02. Estado: implementado na alpha.4/studio-3, nos limites abaixo.

## Escolha e dependências

Usar ProseMirror diretamente (model/state/view/transform/commands/history/keymap/schema-basic/schema-list) para schema, transações, seleção, listas e undo/redo. MIT, conforme metadata npm e LICENSE do mantenedor. O projeto migrou seus repositórios para code.haverbeke.berlin; os mirrors GitHub arquivados não são a origem corrente de manutenção. Versões são exatas no package.json/lockfile. esbuild MIT apenas em desenvolvimento para bundle local servido pela própria aplicação.

Razão: acrescentar comportamento semântico e histórico sobre uma biblioteca especializada, evitando rich-text como HTML arbitrário e sem migrar a UI inteira para React/Tauri. Alternativas: manter textarea (não entrega formatação visual); implementar contenteditable manualmente (risco de seleção/IME/undo); TipTap/React (maior mudança de stack neste incremento). Custo: instalação npm e build do editor antes de executar a interface; não depender de CDN em runtime.

A primeira consulta npm no sandbox falhou por DNS/permissão de cache. Metadata foi consultada com execução autorizada e cache temporário, sem envio de conteúdo. Instalação feita com scripts de terceiros desabilitados (`--ignore-scripts`); esbuild usa o binário opcional da plataforma fornecido pelo pacote. Versões/transitivas/licenças em EDITOR_DEPENDENCIES.md. Não trocar licença Apache-2.0 do código original.

## Contrato de dados

`rich_documents[nodeId] = {schema_version:1, doc:<JSON ProseMirror>}` é opcional; a primeira ativação/gravação visual eleva o projeto de schema 1 para 2. Antes de salvar, o servidor cria cópia integral verificada dos bytes originais e envelope restaurável fora do projeto (migration-backup.mjs). Falha de backup impede salvar. A abertura não converte; novos projetos começam em schema 1. O formato 2 impede que clientes anteriores tratem conteúdo visual como texto simples. Voltar uma cena a texto não rebaixa o formato. Quando presente, JSON semântico é fonte de formatação e o texto de compatibilidade deve equivaler exatamente à projeção definida pelo schema. Comando de save atualiza ambos em um agregado validado e usa hash que também inclui formatação, não apenas texto.

Legado permanece textarea. Conversão para visual exige ação explícita, snapshot do original e aviso: texto literal, sem interpretação automática de Markdown, quebras normalizadas para LF. Voltar a texto também exige confirmação/snapshot. Abertura não converte nem grava. Snapshots/backup/restauração preservam JSON semântico e remapeiam IDs de documento.

Tipos iniciais: parágrafo, headings 1–3, bloco de citação/código, listas, item de lista, quebra e separador; marks fortes/ênfase/código/sublinhado/riscado/link seguro. Validação estrita de tipos, atributos, conteúdo, tamanho e profundidade no servidor. Sem HTML livre, imagens remotas ou scripts. Paste é interceptado como texto antes de interpretar HTML; drop é bloqueado; recursos ricos de clipboard ficam para etapa posterior.

## Integração e segurança

Controles reais de formatação/estilos/listas/undo/redo. Editor recebe transações e não reescreve DOM a cada tecla. Não perder documento durante flush, troca de cena, conflito ou restauração. Cópia local inclui o JSON não confirmado; confirmação remove somente a cópia correspondente. Hash completo protege alterações apenas de formato. API legada de texto não pode sobrescrever silenciosamente uma cena visual.

Renderização de preview/HTML/EPUB usa o schema permitido; DOCX traduz os elementos suportados. Registrar limitações por formato. Não declarar comentários ancorados, tabelas/imagens, estilos arbitrários, todos os IMEs ou revisão multiplataforma sem testes.

## Verificação exigida

Validação de schema/URLs/limites, projeção legada, snapshot/backup/restauração, conflito de formato, exportação, clipboard hostil e fluxo real no Firefox. Não converter manuscritos reais. Desktop continua por último. Rollback preserva os dados ricos/snapshots; não apagar campos para simular downgrade.

Fontes: documentação/API distribuídas nos pacotes ProseMirror, metadata npm, [licença do mirror oficial](https://github.com/ProseMirror/prosemirror-view/blob/master/LICENSE), [esbuild](https://esbuild.github.io/getting-started/). O site prosemirror.net retornou 403 nesta consulta; usar fontes locais instaladas para APIs exatas.

## Evidência e limites da alpha.4

102 testes Node, 35 verificações Firefox/Linux, DOCX aberto no LibreOffice e convertido/examinado como PDF/texto; EPUB ZIP/XML/manifest/spine verificados. EPUBCheck continua indisponível. Digitação nativa Unicode, undo/redo, listas/estilos/links, clipboard sintético hostil, navegação, snapshots, publicação e backup/reabertura cobertos no Firefox. Não houve validação abrangente de IME, todos os navegadores ou acessibilidade.

Limites: 2 MB de JSON rico, 1,5 MB de texto, profundidade 32 e 20000 nós. Divisão no cursor e máquina de escrever ficam indisponíveis em cenas visuais. Substituição visual preserva marcas apenas dentro de um bloco; ocorrências entre blocos são mostradas como não suportadas. DOCX usa marcadores visíveis para listas; sem numeração semântica Word. Markdown é aproximação exportável, sem garantia de round-trip. Sem comentários/footnotes ancorados, anexos, imagens, tabelas ou estilos arbitrários.

Histórico undo é mantido por cena na sessão do editor; snapshots são a versão persistente. API exige hash do texto+JSON para detectar mudanças apenas de formato; não substitui revisão monotônica/lock entre processos. SQLite segue prova separada e recusa edição textual de cena visual.
