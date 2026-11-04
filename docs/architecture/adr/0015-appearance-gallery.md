# ADR-0015 — galeria de aparência e preferência do sistema

2026-11-02. Estado: implementado e verificado na alpha.10.

Plano: catálogo de temas originais, módulo de aparência independente, tela de prévia/aplicar/cancelar e estilos por tokens para toda a interface. Preservar claro/escuro antigo e fonte/tamanho do editor. Testar persistência, cancelamento, mudança do sistema, contraste de pares principais e fluxo Firefox. Nenhum projeto ou backup será convertido.

Estilos inspirados em Windows 10/11, Office 365/2010, GNOME 50, macOS, Plasma 6, retrô, WordStar/DOS e cores divertidas; não copiar logos/ativos nem afirmar reprodução exata dos produtos. Fontes somente do sistema. Automático acompanha prefers-color-scheme, sem inferir tema nativo pelo user-agent.

Preferência por navegador em writingroom.appearance, schema 1; migrar writingroom.theme light/dark quando ainda não houver preferência nova válida. Tema é UI, não conteúdo do livro/exportação. Prévia não confirma persistência; cancelar/Escape restaura a escolha anterior. Impressão permanece em papel claro legível. Não alterar protocolo de arquivos ou cores/estilos autorais do documento.

Evidências: 166 testes Node aprovados; 74 grupos Firefox aprovados, incluindo os 17 presets solicitados fixos, galeria de 20 escolhas, prévia/cancelar/Escape, persistência, preferência atual do sistema e entrada nas configurações. Contraste dos pares principais ≥4,5:1 testado. Listener de mudança do sistema implementado; alternância real do OS e impressão física não exercitadas. Nenhum schema de obra alterado.
