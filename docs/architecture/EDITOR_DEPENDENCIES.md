# Dependências do editor alpha.4

Instalação com versões exatas, lockfile e `--ignore-scripts`. Código próprio permanece Apache-2.0. Dependências abaixo são MIT, conferidas em metadata/package.json e LICENSE locais; não há dependência de CDN em execução.

| Pacote | Versão | Uso |
|---|---|---|
| prosemirror-commands | 1.7.2 | Comandos |
| prosemirror-history | 1.5.1 | Undo/redo |
| prosemirror-keymap | 1.2.3 | Teclado |
| prosemirror-model | 1.25.12 | Modelo/schema |
| prosemirror-schema-basic | 1.2.5 | Tipos básicos |
| prosemirror-schema-list | 1.6.0 | Listas |
| prosemirror-state | 1.4.4 | Estado/transações |
| prosemirror-transform | 1.12.4 | Transformações |
| prosemirror-view | 1.42.9 | Editor DOM |
| orderedmap | 2.1.1 | Transitiva |
| rope-sequence | 1.3.4 | Transitiva |
| w3c-keyname | 2.2.8 | Transitiva |
| esbuild | 0.28.2 | Build, desenvolvimento |

`scripts/build-editor.mjs` gera bundle e agrega os LICENSE originais de todas as dependências runtime em `apps/web/editor-licenses.txt`, servido em `/editor-licenses.txt`. Distribuir ambos juntos. Os originais também permanecem nos pacotes instalados. Binário esbuild vem do pacote opcional específico da plataforma. Build: `npm run build:editor`, também executado automaticamente antes de dev/start. Gerados são ignorados; não substituir fontes pelos bundles.

Fontes: arquivos distribuídos nos pacotes npm e lockfile; [licença do mirror oficial](https://github.com/ProseMirror/prosemirror-view/blob/master/LICENSE), [esbuild](https://esbuild.github.io/getting-started/). Mirrors GitHub ProseMirror arquivados após mudança do upstream para code.haverbeke.berlin. Consulta ao site prosemirror.net retornou 403; APIs consultadas nos arquivos fonte/declaration instalados.
