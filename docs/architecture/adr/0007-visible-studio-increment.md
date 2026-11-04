# ADR-0007 — funcionalidades visíveis no protótipo existente

Data: 2026-11-02. Estado: adotado para 0.1.0-alpha.2 local.

## Contexto e autorização

O usuário solicitou explicitamente implementação na aplicação aberta: “implemente tudo, abri e não mudou nada”. As etapas anteriores de storage eram isoladas e não alteravam sua experiência. Essa instrução autoriza avançar a interface existente; não é evidência de que todos os recursos do manual estejam completos ou de que G1 foi aprovado.

## Decisão

Entregar fluxos completos sobre o servidor JSON atual, preservando hash de base, fila e escrita por temporário. Não trocar o repositório do usuário por SQLite sem migração. UI vanilla continua sem dependências: biblioteca, modelos, quatro ambientes, cartões/outline, leitura contínua, notas/etiquetas/keywords/metas, referência de leitura, tema/fonte/foco, importação TXT/MD com preview, divisão de cena, comparação de versões por trecho, exportação MD/TXT/HTML, impressão do navegador e backup/restauração JSON.

A árvore e IDs permanecem canônicos; vistas são projeções e usam os mesmos comandos. Reordenação tem botões de teclado/mouse, não drag-and-drop. Manuscrito contínuo e painel lateral são leitura, não edição simultânea em vários documentos. Barra de formatação insere sintaxe Markdown em textarea, não HTML/rich-text disfarçado.

Campos opcionais no schema 1: nó `notes`, `keywords`, `label`, `target_words`; projeto `settings` com autor/descrição/idioma/meta. Validar os novos campos quando presentes; legado sem esses campos permanece válido. Nenhum arquivo real é regravado ao atualizar ou abrir. Divisão tem snapshot anterior e rejeita offset que corta surrogate de emoji. Importação cria rascunho completo em memória e só então grava; erro não deixa cenas parciais.

Backup do app atual é um envelope JSON completo com SHA-256, incluindo árvore, textos e snapshots. Restore valida, cria nova identidade e remapeia raízes/nós/proveniência de lixeira/snapshots; nunca substitui projeto existente. Não inclui assets externos, porque o protótipo não os armazena. Isso é diferente do backup SQLite experimental da ADR-0002.

## Recuperação e conflitos

Texto digitado recebe cópia local em localStorage até confirmação do servidor. Cópia é por origem/projeto/documento e contém texto simples não criptografado. Se storage estiver indisponível, escrita normal continua; não declarar recuperação pós-crash garantida. Falha bloqueia navegação destrutiva e oferece download de recuperação JSON.

Retry de texto verifica disco; se mudou, mostra as duas versões. Escolher texto local exige ação explícita e cria snapshot do disco antes de gravar com hash atualizado. Escolher disco exige confirmação para descartar cópia local. Metadados sem confirmação exigem preservar recuperação e recarregar; sem retry cego de operações estruturais que poderiam duplicar itens.

## Limites

Continua alpha JSON, sem lock entre processos de produção, revisão monotônica no app, editor semântico, comentários ancorados, anexos PDF/imagens, importador Scrivener/DOCX/RTF, exportador DOCX/ePub/PDF nativo, múltiplos idiomas completos, dicionários próprios, desktop Tauri, sync ou IA. Impressão/salvar PDF depende do navegador/SO; não é renderer PDF validado. Comparação de versões identifica um bloco alterado por prefixo/sufixo comum, não diff mínimo palavra a palavra.

O preview de publicação usa texto simples, títulos e sumário. Formatação Markdown no corpo permanece literal no HTML/impressão; não prometer renderização semântica de todos os formatos. Estatísticas usam tokens separados por whitespace e são aproximações. Modo máquina de escrever calcula rolagem por linhas explícitas e é aproximado em linhas que quebram automaticamente.

## Verificação e reversão

Testes de domínio/API/DOM e script de smoke Firefox com perfil/pastas/downloads temporários. Script testa controles reais e rede, embora algumas interações de formulário sejam disparadas por JS no DOM; não substitui avaliação com leitor de tela ou todos os atalhos nativos. Nenhum manuscrito real é fixture.

Atualizar frontend e servidor juntos. `/api/status` identifica protocolo studio-1; frontend mostra aviso quando conectado a servidor antigo. `npm run dev` agora usa watch para módulos do servidor; `npm start` mantém execução simples. Reverter código preserva JSON opcional, mas funções novas deixam de estar disponíveis. Não excluir dados para “voltar” a versão anterior.
