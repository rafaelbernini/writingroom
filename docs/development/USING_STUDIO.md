# Usar o estúdio alpha.14

1. Se já havia um servidor aberto, pare com Ctrl+C e execute `npm run dev`. Recarregue `http://127.0.0.1:4173`. O cabeçalho deve mostrar **ESTÚDIO · α14**. Um aviso de servidor antigo impede ações até reiniciar e recarregar.
2. Em **Novo projeto**, escolha vazio, romance ou não ficção. Seus projetos existentes continuam na biblioteca.
3. Em **Escrever**, use a estrutura para escolher/criar pastas e cenas. Texto e campos do inspetor salvam após pausa/mudança. O status anuncia confirmação ou falha.
4. **Planejar** mostra cartões e outline. Escolha a pasta/estado, use Escrever/Notas nos cartões ou as setas para reordenar. Cada vista altera os mesmos documentos.
5. **Manuscrito** reúne para leitura as cenas incluídas na publicação. Use Editar esta cena para voltar ao trecho.
6. **Referência** abre um documento ao lado para leitura. Mudar a referência não move nem duplica a cena.
7. **Salvar versão** cria snapshot nomeado. **Versões** mostra conteúdo e comparação do trecho alterado; restaurar guarda automaticamente o texto atual. **Dividir no cursor** cria uma continuação e guarda a versão anterior.
8. **Importar TXT/Markdown** abre arquivo UTF-8, apresenta prévia e permite separar títulos em cenas. Escolha o destino e confirme. O original fica intacto.
9. **Publicar** apresenta seleção, contagens/omissões e preview literal. Exporte MD/TXT/HTML ou use o diálogo de impressão para imprimir/salvar PDF. DOCX e EPUB têm saída básica descrita abaixo; não há interpretação completa de Markdown no corpo do HTML/PDF.
10. **Backup do projeto** baixa JSON com todas as cenas, notas e versões atuais. Guarde em outro local. **Restaurar backup**, na biblioteca, verifica checksum e cria outro projeto com IDs novos.

Tema fica no botão ◐. Fonte e máquina de escrever aproximada ficam na barra do editor. Foco reduz painéis; Escape sai dele. Ctrl/Cmd+S pede flush. Em tela estreita, ☰ abre estrutura e Inspetor abre o painel lateral.

Se houver falha, não feche a página antes de preservar a edição. **Baixar recuperação** gera arquivo JSON restaurável com o estado local. **Tentar salvar** verifica o texto do disco; se ele mudou, compare as duas versões e escolha explicitamente. Usar o texto local cria snapshot do disco primeiro. Para metadados que falharam, baixe recuperação e recarregue; retry automático não está disponível.

Cópia local depende de localStorage e não substitui backup externo. Não abrir o mesmo projeto em dois processos servidores/CLI. Veja README/PROGRESS para limites e suporte realmente testado.

## Recursos novos da alpha.4

- **Buscar / substituir**, na barra da cena: escolha cena/manuscrito/projeto, texto e substituição. Gere a prévia, selecione ocorrências e aplique. Notas/títulos/metadados não são modificados. Se o texto mudar, gere outra prévia. Cada cena modificada recebe uma versão anterior.
- **Caderno → Fichas:** crie personagem, lugar, objeto, organização, evento ou conceito. A ficha vira texto editável em Pesquisa e não entra no livro por padrão.
- **Caderno → Coleções:** escolha seleção manual ou consulta salva. Adicione/remova referências sem apagar documentos. Consulta dinâmica usa texto e estado; para mudar seus critérios, crie outra coleção. Renomear/excluir afeta apenas a coleção.
- **Caderno → Capturas:** anote ideias; a captura é salva após pausa e pode ser copiada para uma cena. A origem continua no caderno. Em recuperação de cópia local sobre conteúdo existente, uma cópia do caderno remoto é criada em Pesquisa.
- **Publicar:** DOCX exporta texto/títulos/autor com formatação básica. EPUB é experimental, com sumário e metadados básicos. O corpo Markdown permanece literal nesses arquivos. PDF continua pelo navegador, não por renderer nativo.

A versão atual aparece como **ESTÚDIO · α14**. Recarregue a página após atualizar e reinicie um servidor antigo se o aviso aparecer. O desktop será implementado por último, conforme sua prioridade.

## Editor visual da alpha.4

Na cena, clique **Ativar editor visual** e leia a confirmação. A primeira ativação guarda backup integral verificado fora do projeto e uma versão do texto original. Markdown existente permanece literal, com quebras normalizadas para LF. A barra passa a aplicar formatação real: negrito, itálico, sublinhado, riscado, títulos, citação, código, listas, links e undo/redo. Colagem recebe texto simples; imagens e HTML de origem não são importados.

**Voltar a texto** preserva uma versão com formatação antes de remover os estilos da cena; recupere-a em Versões. O projeto continua schema 2 e exige esta versão do app. Backup/restauração JSON preserva formatação; o backup de migração contém também o original schema 1. Guardar em outro dispositivo continua sendo necessário para proteção externa.

Manuscrito e Publicar exibem as cenas visuais. DOCX/HTML/EPUB levam a formatação suportada; TXT remove estilos, Markdown é aproximação. EPUB segue experimental. Em cena visual, divisão no cursor e máquina de escrever estão indisponíveis; substituição entre blocos exige edição manual. Desfazer/refazer vale para a sessão; versões nomeadas persistem no projeto.

Primeira instalação: `npm ci --ignore-scripts`. Reinicie com `npm run dev` e recarregue; a versão correta mostra **ESTÚDIO · α14**. O build do editor é automático ao iniciar.

## Revisão vinculada — alpha.5

Selecione um trecho do editor visual e use **Comentar** para observação privada ou **Nota** para conteúdo que deve acompanhar o livro. Preencha e guarde. No inspetor, **Revisão do trecho** lista as anotações; busque pelo trecho/corpo, escolha estado, edite e use **Ir ao trecho**. Comentário pode ser resolvido e reaberto. Excluir guarda versão anterior; Desfazer recupera a marca na sessão. Se apagar o trecho inteiro, sua anotação também sai; use desfazer ou Versões para recuperar.

Comentários não aparecem em Manuscrito/Publicar/arquivos de livro. Backup e recuperação incluem comentários privados. Notas aparecem com número e seção Notas ao fim da cena; não são rodapé nativo Word. A numeração reinicia por cena. Markdown usa extensão de footnotes, cujo suporte depende do leitor. Ao voltar a texto simples, comentários/notas ficam na versão visual anterior; a cena textual não os contém.

Limites: 1000 anotações/cena e 4000 caracteres/corpo dentro do limite global visual. Não se sobrepõem duas marcas do mesmo tipo; comentário e nota podem ocupar o mesmo trecho. Blocos de código ficam sem anotações. Substituições que atravessam âncoras diferentes exigem edição manual.

## Pesquisa com arquivos — alpha.6

Em **Caderno → Anexos**, clique **Importar anexo**, escolha PNG, JPEG, PDF, TXT ou Markdown e confira nome, tamanho e prévia. Cancelar não grava. **Importar para Pesquisa** guarda uma cópia do arquivo e abre o material; a origem permanece intacta. A primeira importação guarda backup integral verificado antes de formato 3. Esse formato exige a versão atual; não altere o número manualmente.

Imagens e texto podem ser lidos no app. Markdown de pesquisa é literal. PDF fica disponível em **Baixar arquivo original** para abrir no leitor escolhido; não há leitor interno. O download mantém os bytes do original. No inspetor, dê título, sinopse, notas, status e palavras-chave; a busca da aba considera esses campos. Anexo não entra na publicação. Lixeira preserva os bytes; restaurar o nó recupera o acesso. Ainda não há exclusão permanente ou troca do arquivo de um anexo.

Backup do projeto inclui os arquivos, e restaurar cria um novo projeto com referências remapeadas. Cópia local de texto não é backup de anexos; use o download do projeto e guarde em outro local. Limites: 8 MB/arquivo, 16 MB de anexos no total (inclui lixeira), 100 arquivos e agregado serializado até 30 MB. Preview textual de importação é limitado a 4000 caracteres; leitura a 200 mil, com download integral disponível. PNG animado, SVG, HTML e executáveis não são aceitos.

## Ações e organização — alpha.7

Na biblioteca, use **⋯** na capa para **Editar dados / renomear**, **Duplicar**, **Baixar backup** ou **Arquivar / remover da lista ativa**. Arquivar mantém os arquivos. No filtro **Arquivados**, restaure à biblioteca; não há exclusão permanente nesta entrega.

Nos documentos, **⋯** oferece abrir/editar, renomear, duplicar, mover, subir/descer e mover à lixeira. Está na estrutura, cartões, outline, leitura contínua, fichas e anexos. Duplicar pasta inclui seus documentos, versões e anexos; coleções existentes não recebem a cópia automaticamente. Duplicação de anexo consome o limite de bytes novamente. Se o limite for excedido, a operação é rejeitada.

Arraste a alça **⋮⋮** até um documento: a faixa superior/inferior ordena antes/depois; o centro de pasta move para dentro. Há alças também nos cartões, outline e Manuscrito de leitura. Texto e arquivos soltos no editor não viram itens estruturais. **Escape** cancela. **Desfazer organização**, na barra dos ambientes, reverte a última movimentação da sessão; uma alteração estrutural posterior impede usar uma posição antiga. Os botões de mover/subir/descer também permitem desfazer. Voltar à biblioteca/recarregar encerra esse histórico curto.

Use **− / +** ao lado da pasta para recolher/expandir. A preferência é do navegador, por projeto, sem mudar o manuscrito. Não foi validado toque real ou todos os sistemas. Para organizar o livro privado do modelo, trabalhe numa cópia restaurada e mantenha o backup-base.

Perfil de autor/contatos, fontes históricas e central de backup automático ainda estão na fila local. Conexões Google/Drive/OneDrive/Dropbox ficam somente antes do desktop.

## Tipos, autoria e pesquisa — alpha.8

**Novo projeto** agora oferece 16 estruturas de escrita, incluindo conto, novela, roteiro, teatro e quadrinhos. O preset **Histórica** cria pastas adicionais de pesquisa e pode ser usado com qualquer tipo. São modelos editáveis do editor geral, sem FDX, diagramação de páginas de quadrinhos, execução de grafo ou normas científicas automáticas. Projetos antigos não são reestruturados ao abrir.

Na biblioteca, **Perfil do autor** guarda nome civil, pseudônimo, endereço, telefone, e-mail e biografia opcionais. Não autentica uma conta e não é criptografado. Salvar não altera a autoria dos livros existentes. No diálogo de projeto, **Usar nome de publicação do perfil** copia apenas o nome escolhido. Baixar a cópia privada do perfil inclui os campos atuais e contatos; restaurar substitui o perfil local após confirmação/hash, sem mexer nas obras. Perfil é separado do backup do livro.

Em **Caderno → Fichas**, os atalhos **Personagem**, **Cenário** e **Rascunho** agilizam a criação em Pesquisa. Em **Caderno → Fontes**, crie referência com URL http/https, autoria, publicação/acervo, data/período, data de acesso e classificação atribuída por você. Não é uma confirmação automática de fatos históricos. Selecione múltiplas cenas/fichas/anexos para vincular; os backlinks aparecem no inspetor. O link abre externamente somente por sua ação. Use **Notas / abrir documento** para editar o texto da fonte; mudar a referência não sobrescreve esse texto.

Fontes têm menus de edição/duplicação/lixeira como documentos e não entram no livro. Se um vínculo for para item na lixeira, ele é mantido/sinalizado até restaurar. Backup e restauração preservam metadados, texto e vínculos com IDs novos. A primeira fonte exige backup integral e formato 4; não use versão antiga para editar esse projeto. Não há histórico dos metadados bibliográficos, importação web/OCR ou leitor PDF interno nesta etapa.

## Central de backup — alpha.9

Na biblioteca, Publicar ou configurações, abra **Central de backup local**. Escolha a obra e o destino configurado; **Criar cópia local verificada** grava no servidor e confere bytes/checksums/projeto antes de confirmar. Não é apenas download. O histórico tem **Verificar agora**, **Baixar JSON** e **Restaurar em novo projeto**. Restaurar não substitui nenhuma obra existente; cenas, versões, fontes e anexos são remapeados. Perfil/contatos ficam no backup próprio do perfil.

A rotina automática é opcional e vem desligada. Habilite, escolha intervalo/retenção e **Salve configuração**. Ela cobre todos os projetos ativos disponíveis enquanto o servidor estiver funcionando, mesmo sem aba do navegador. **Executar rotina agora** antecipa a checagem. Sem mudanças, a cópia anterior é verificada/reaproveitada. Arquivados só recebem cópias manuais. O resumo mostra última cópia, tentativa e falhas; histórico diz “verificada na criação”, e a verificação atual deve ser solicitada ao usar um arquivo antigo.

Retenção vale somente às automáticas verificadas e só depois de nova geração válida. Manuais, backups de migração e cópias corrompidas/incompletas são preservados; não existe botão de exclusão manual aqui. Sem espaço/destino disponível, a origem e as cópias anteriores permanecem. Aviso de resumo/retenção não invalida uma cópia já verificada; confira o histórico/destino.

Cópias locais são legíveis e até 32 MB. O histórico mostra até 200 gerações do filtro; anteriores continuam no destino. A rotina não roda com servidor desligado nem copia rascunhos ainda apenas no navegador. Destino padrão: writingroom-backups/managed; configurar outros IDs/pastas no servidor conforme README. Para proteção independente, guarde uma cópia também em outro dispositivo/local.

## Temas e aparência — alpha.10

Galeria de aparência alpha.10: **20 opções** no botão **◐** ou em **Configurações → Temas e aparência**. Inclui WritingRoom claro/escuro, Windows 10/11 claro/escuro, Office 365 claro/escuro, Office 2010 claro, retrô, GNOME 50 claro/escuro, macOS claro/escuro, KDE Plasma 6 claro/escuro, WordStar 4, DOS colorido, Cores divertidas e Adaptar ao sistema.

Selecione para experimentar; **Aplicar tema** confirma, **Cancelar/Escape** restaura. A preferência fica neste navegador, separada dos projetos e backups; preferências antigas claro/escuro são reconhecidas. Adaptar ao sistema acompanha `prefers-color-scheme`, usando WritingRoom claro/escuro. São interpretações visuais originais, com fontes locais; os temas de terminal não emulam atalhos ou formatos antigos. A aparência não altera o conteúdo do manuscrito. Impressão tem estilo de papel claro.

## Tradução e ferramentas de idioma — alpha.11

A alpha.11 acrescenta **Tradução** em todos os projetos e quatro modelos em **Novo projeto → Tradução — livro/artigo/documento/outros textos**. Crie trechos com original e idioma de destino, escreva lado a lado, acompanhe estados e exporte revisão bilíngue MD. Originais e glossário ficam em Pesquisa e fora da publicação; backups preservam os vínculos. Alterar o texto original reabre traduções concluídas para Revisão.

**Dicionário e idiomas** oferece verbetes pessoais (definição, sinônimos, equivalentes, contexto e fonte), busca no glossário e em trechos traduzidos, exportação MD e links explícitos de consulta externa. O glossário funciona offline por obra; **não há base lexical completa offline ou tradução automática integrada**. Nenhuma cena é enviada automaticamente. Veja [especificação de tradução e idiomas](../specifications/TRANSLATION_AND_LANGUAGE_TOOLS.md) para limites e evolução.

No projeto de tradução, abra **+ Trecho de tradução**, digite idiomas como `en` e `pt-BR`, cole/carregue o original e confirme. **Traduzir lado a lado** abre a tradução no editor. Marque o estado no inspetor. Para editar o original, use **Editar original** no painel Tradução. **Publicar** exporta os destinos; **Exportar revisão bilíngue MD** inclui ambos os textos, por escolha explícita.

Para um verbete, abra **Dicionário e idiomas**, informe os idiomas, clique **+ Verbete / decisão** e salve. Idiomas iguais permitem dicionário monolíngue. Use **Abrir / editar verbete** para ajustar o documento ou a lixeira para remover reversivelmente. PDFs e fotos continuam nos Anexos do Caderno.

## Anexos, pesquisa e idiomas — alpha.12

A alpha.12 permite guardar qualquer tipo de anexo como original para download e **extrair texto de PDF, Word DOCX, ODT, TXT e Markdown** no projeto. Em **Caderno → Anexos → Abrir → Extrair texto / pesquisar / traduzir**, revise a prévia ou selecione um trecho e crie pesquisa vinculada ou original de tradução. Arquivos sem extrator aceitam transcrição manual; não há OCR ou execução de anexos.

**Dicionário e idiomas** ganhou consulta offline às bases MyThes pt/en instaladas, importação/exportação de base lexical JSON compartilhada e conector LibreTranslate com autorização de envio, prévia e confirmação separadas. Tradução automática precisa de um serviço configurado; não há motor neural incluído. Credenciais ficam no processo do servidor, fora das obras. Definições/traduções offline dependem da base importada, sem alegação de dicionário universal pré-instalado.

[Análise global, hipótese de uso, formatos, limites e configuração do serviço](../specifications/ATTACHMENT_RESEARCH_TRANSLATION_ANALYSIS.md).

## Comparação de versões — alpha.13

A alpha.13 entrega **Versões → Comparar duas versões lado a lado**: escolha dois snapshots ou o texto atual no disco, inverta os lados, veja linhas inseridas/removidas e filtre somente alterações. Navegue pelas diferenças e carregue mais linhas quando necessário. Em telas estreitas, os lados ficam empilhados. Comparação é somente leitura; restauração continua no fluxo existente com preservação da versão anterior.

A análise é textual. Diferenças de formatação/anotações são avisadas, sem diff visual detalhado. Trechos grandes usam comparação simplificada identificada, com contagens aproximadas; texto não é descartado. Alterar as seleções pede nova consulta. Isto entrega comparação de versões; propostas de redline e aceitar/rejeitar continuam como a próxima etapa.

## Redline por propostas — alpha.14

A alpha.14 acrescenta **Revisão** e **Propor alteração**: selecione texto na cena ou no original de leitura do diálogo, informe autor/papel (Escritor/Editor), substituição e justificativa. O painel mostra original riscado e proposta sublinhada; guardar não altera o manuscrito. Aceitar preserva versão anterior e registra a decisão; rejeitar mantém o texto. Filtros distinguem estado/papel e o histórico acompanha backup/restauração.

O aceite é bloqueado se texto/formatação mudou; atualize a lista e faça nova proposta sobre a base atual, ou rejeite a antiga. A primeira proposta migra a obra para **formato 5**, somente após backup integral verificado. A identificação é local e declarada, sem autenticação, compartilhamento ou permissões remotas. No editor visual, as propostas são limitadas a trechos de um bloco, sem novas quebras ou inserção em cursor vazio.

Para usar: abra a cena, selecione um trecho, clique **Propor alteração** e guarde. Em **Revisão**, escolha Aceitar/Rejeitar e identifique quem decide. Para inserção no texto simples, posicione o cursor e use a seleção do original; para exclusão deixe a substituição vazia. Restaurar um snapshot posterior não apaga decisões históricas. Não é rastreamento automático de teclas nem exportação de alterações controladas do Word.
