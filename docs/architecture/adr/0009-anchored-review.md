# ADR-0009 — comentários privados e notas vinculadas

Data: 2026-11-02. Implementado na alpha.5/studio-4. Continuação do editor opcional ADR-0003; desktop por último.

## Contrato

Marcas ProseMirror `comment` e `footnote` contêm identidade `n-<UUID>`, corpo texto simples e, para comentários, `resolved` booleano. O trecho é a âncora: transações de texto remapeiam a marca. Fragmentação por estilo mantém a mesma identidade/corpo; editar percorre todos os segmentos. Servidor rejeita metadados divergentes para uma identidade. Não há offsets paralelos que possam apontar silenciosamente para outro texto.

Limites: 1000 anotações por documento, 4000 caracteres por corpo, limite global JSON visual de 2 MB. Âncora requer texto selecionado; mesmo tipo não se sobrepõe, mas comentário e nota podem ocupar o mesmo trecho. Blocos de código não recebem anotações; converter bloco anotado em código é bloqueado pela UI. Inserções no limite não expandem automaticamente a âncora (`inclusive:false`). Excluir todo o trecho exclui sua anotação junto; desfazer ou restaurar uma versão recupera ambos. Não há recuperação automática de órfãos nem threads/múltiplos autores.

Criar/editar/resolver/reabrir/remover são transações com undo/redo. Exclusão pelo painel guarda snapshot confirmado antes. Filtro por estado e busca por corpo/trecho ficam no inspetor; Ir ao trecho seleciona a âncora. Autosave, cópia local, hash de formatação, snapshots e backup já incluem as marcas. Hash detecta alteração apenas do corpo/estado, mesmo com texto idêntico. Substituição de busca atravessando identidades de anotações é desabilitada; substituição interna preserva marca/corpo.

## Publicação e privacidade

Comentários são privados: omitidos de Manuscrito/Publicar/impressão e TXT/MD/HTML/DOCX/EPUB. Backup/recuperação contém comentários e deve ser tratado como projeto completo. Notas de publicação têm referência numerada e seção Notas ao fim de cada cena em TXT/HTML/DOCX/EPUB; MD usa definições de footnote por identidade. Não são footnotes nativas do Word, notas paginadas ou comentários Word. Sem promessa de EPUBCheck ou suporte universal à extensão footnote Markdown.

Render de preview usa DOM seguro, sem comentário escondido em atributos e sem HTML do corpo. HTML/XML escapam texto; Markdown escapa sintaxe no corpo. Uma nota fragmentada gera somente uma chamada e uma definição. Numeração reinicia por cena; HTML/EPUB prefixam destinos com identidade da cena para evitar colisão entre documentos. Impressão aguarda conclusão dos previews, impedindo saída sem as notas durante carregamento do bundle.

## Compatibilidade e reversão

Projeto continua formato 2; anotação amplia o schema semântico fechado. Versões anteriores rejeitam marcas desconhecidas, em vez de descartá-las; protocolo studio-4 bloqueia frontend/servidor incompatíveis. Nenhum projeto é convertido ao abrir. A primeira ativação visual segue backup integral verificado da ADR-0003. Retornar a texto preserva snapshot rico e remove anotações da cena ativa, conforme confirmação explícita; não rebaixa projeto.

## Evidências

Baseline 102 testes. Final 115 testes Node, incluindo 12 de anotações e um HTTP novo; sem falhas/skips no Node 26/Linux. Firefox real com 41 verificações de fluxo: criação/edição/resolução, nota, busca, exclusão+snapshot+undo, privacidade, restauração e reabertura. Impressão tem chamada interceptada no harness para conferir conteúdo pronto; não é teste de paginação/PDF nativo. DOCX abriu no LibreOffice Linux e PDF/texto contém nota, sem comentário; EPUB ZIP/XML/manifest/spine verificados, sem EPUBCheck.

Sem mudança de dependências. Ainda pendentes rodapé nativo, conversão de tipos, anotações inline editoriais independentes, threads, pesquisa global por anotações, acessibilidade/IME completo e validação multiplataforma. Storage JSON e prova SQLite permanecem separados; esta entrega não aprova G1/G2 completos.
