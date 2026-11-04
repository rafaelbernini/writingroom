# ADR-0011 — ações da biblioteca e organização direta

Data: 2026-11-02. Estado: implementado na alpha.7/studio-6, nos limites abaixo. Ordem vigente: controles locais primeiro; Google/Drive/OneDrive/Dropbox somente na última etapa antes do desktop.

Plano: integrar menus de biblioteca e documentos, duplicação com IDs remapeados e arquivamento reversível; em seguida arraste estrutural e recolher pastas nas mesmas vistas. Arquivos: domínio/library-service, API, web, testes e documentação de continuidade. Não alterar projetos reais durante testes; caso longo apenas em cópia privada restaurada.

Arquivar move a pasta inteira para `.archived/<UUID>.wroom` sob a biblioteca por rename; restaurar faz o inverso. Caminhos fixos, identidade/versão validadas e symlinks bloqueados. Não excluir definitivamente nem regravar o conteúdo ao arquivar. Destino existente impede operação. Fila por ID na instância serializa com autosave; sem garantia entre processos.

Duplicação de projeto usa o mesmo remapeamento de backup/restauração, com nome escolhido antes de salvar. Duplicação de subárvore clona nós/textos/ricos/snapshots/anexos com novos IDs; coleções existentes não recebem cópias automaticamente. Limites/validação antes de commit; fonte intacta.

Arraste serve para itens da estrutura, não conteúdo HTML no editor. Antes/depois/dentro de pasta, sem mover raiz/ciclos. Reusar moveNode e flush, preservar alternativa por botões e teclado. Organização deve ter hash estrutural e inversão da última operação com conflito detectado; não fingir undo persistente. Preferências de pastas recolhidas não entram no texto do livro.

Validação exigida: baseline, casos de duplicação/limites/arquivo/colisão/symlink, API, arraste real Firefox, persistência/restore, falha/conflito de organização. Só registrar entregue após testes. Backup-base do livro privado permanece intacto.

## Entrega e evidências

Biblioteca tem menu separado da capa: editar dados, duplicar com nome escolhido, backup e arquivar/remover da lista ativa; filtro Arquivados restaura. Projeto indisponível continua sem escrita. Documentos têm menus na árvore, cartões, outline, leitura contínua, fichas e anexos: abrir, renomear, duplicar, mover, subir/descer e lixeira. Raízes não recebem menu destrutivo. Checkbox de publicação de anexo também é bloqueado no outline.

Arraste usa Pointer Events e captura do ponteiro, sem interpretar payload de HTML/arquivos. Tentativa inicial por HTML drag-and-drop não concluiu o drop no harness Firefox; foi substituída pelo fluxo de ponteiro validado. Ghost e marcadores são somente apresentação; o servidor confirma ordem antes de atualizar a árvore. Escape/cancelamento não modifica o livro. A mesma função moveDocument é usada em árvore/cartões/outline/manuscrito de leitura; botões e seletor de pasta usam o mesmo fluxo com undo da última movimentação na sessão. API organize/undo-organize usa hash da estrutura, sem reverter texto/metadata posteriores; alteração estrutural posterior bloqueia desfazer. Não é histórico persistente ou revisão monotônica/lock entre processos.

Pastas recolhidas são preferência local por projeto. Seleção explícita revela ancestrais; não altera formato do projeto. Não há paginação/virtualização ou busca rápida “Ir ao capítulo” nova.

Baseline 129 → 139 testes Node, sem falhas/skips: 5 de organização/duplicação, 3 de biblioteca e 2 HTTP. Firefox Linux: 56 verificações, incluindo menus de projeto, arquivo/restore, cópia de cena rica com anotações, recolher/reabrir, arraste com movimentos reais de mouse para pasta/ordem, undo e Escape. DOCX LibreOffice e EPUB estrutural mantidos. Caso privado do autor: 17 verificações em cópia isolada, incluindo duplicar livro completo, organizar/desfazer mantendo texto/rico e arquivar/restaurar anexos; fonte e backup-base intactos. Artefatos em PROGRESS.

Limites: sem exclusão definitiva de projeto, histórico durável de organização, arraste entre projetos ou seleção múltipla; toque/Windows/macOS/leitor de tela não validados. Arquivo por rename não adiciona exclusividade entre processos nem garantia de crash/energia. Perfil do autor, centro de fontes históricas e backup automático continuam pendentes. Google/Drive/OneDrive/Dropbox ficam na última etapa antes do desktop.
