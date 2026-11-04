# Revisão da experiência móvel — alpha.19/20

2026-11-03. Prioridade solicitada pelo usuário: tornar leitura, escrita e revisão confortáveis no celular. Aplicativo alpha.19, interface studio-18. Nenhuma alteração nos formatos 1–7, pacotes v1/v2/v3, dependências ou arquivos de node_modules.

## Análise dos testes anteriores

A suíte Node cobre regras, persistência, conflitos, exportação e HTTP; não demonstra conforto de leitura ou qualidade de toque. Os 139 fluxos Firefox anteriores cobriam amplamente os recursos, mas os recortes móveis eram principalmente capturas/ausência de overflow a 500 px. Isso não verificava a largura real de um celular estreito, tamanho útil do editor, encerramento dos painéis, retorno do foco, acesso às ferramentas ou digitação nativa em layout estreito.

Na inspeção, abas quebravam em várias linhas, ferramentas/ações consumiam altura, botões eram pequenos e o estado de salvamento desaparecia. Estrutura/inspetor sobrepunham conteúdo sem botão de fechar evidente. O painel de referência usava offsets fixos, e a aba selecionada podia ficar cortada na faixa de navegação.

## Alterações

- Até 650 px, ferramentas da cena e formatação começam recolhidas em **Ferramentas**, com estado expandido acessível. Quando abertas, deslizam horizontalmente, sem multiplicar linhas. Modo foco mantém saída explícita e amplia a área de escrita.
- Ambientes em faixa horizontal com aba ativa visível; controles principais de navegação com 44 px de altura. Manuscrito tem margens/entrelinha próprias, sem alça de arraste no corpo da leitura móvel. Organização continua disponível pelos menus e na estrutura.
- Estado de salvamento continua visível no cabeçalho; formulários usam texto de 16 px no celular, ações de diálogo quebram em linhas, e biblioteca acomoda seus controles sem alargar a página.
- Estrutura e inspetor têm fechar visível, fundo de fechamento, foco de entrada/retorno e Escape. Conteúdo coberto fica inert; abrir um painel fecha o outro. Entrar no foco fecha os painéis. Não é uma implementação completa de focus trap/modal ARIA.
- Referência respeita a área real de escrita. Diálogos e workspace usam altura dinâmica de viewport e espaço seguro inferior. Não se afirma suporte completo ao teclado virtual a partir dessas regras.

## Testes e alcance

Novo `scripts/verify-mobile-firefox.py` usa projeto e perfil temporários. Remove o limite mínimo da janela **apenas no chrome do Firefox de teste**, com acesso de sistema restrito àquele processo; não muda o navegador do usuário, produto ou permissões da aplicação. Confere innerWidth real, sem usar zoom para simular 360/390 px. Transporte continua loopback, sem rede externa.

Cenários: biblioteca/diálogo, digitação nativa, salvamento visível, espaço útil do editor, ferramentas por clique nativo, painéis/foco/Escape, modo foco, leitura, aba ativa, referências, editor visual e alturas reduzidas. Leitura testada em 360, 390, 500, 650, 768, 1024 e 1440 px; escrita em 360/390 e viewport com altura interna de 526 px. Isso simula espaço reduzido, não a presença real de um teclado virtual.

Executar:

```bash
python3 scripts/verify-mobile-firefox.py
node --test --test-isolation=none packages/core/test/*.test.mjs
```

Regressão complementar: scripts Firefox amplos, reviews, editor-perspective, editorial-package, editorial-identities e editorial-rounds. Relatórios/capturas ficam nos diretórios temporários indicados no PROGRESS, sem trechos privados. Nenhum teste foi substituído por uma asserção que apenas repete o CSS: a suíte verifica dimensões, ausência de overflow, interação e conteúdo.

## Limites e próxima avaliação

Firefox desktop redimensionado não reproduz Safari/iOS, Chrome/Android, teclado virtual, seleção por toque/IME, leitor de tela, orientação com teclado aberto ou desempenho de um aparelho de pouca memória. Validar esses itens em aparelho físico antes de anunciar experiência móvel plenamente homologada. Aumentar a cobertura para outros navegadores conforme a infraestrutura permitir; não abrir 4173 na LAN para isso sem definir uma estratégia de acesso segura. O serviço online continua pendente e não foi integrado para atender a esta revisão.

## Evidência executada

256 testes Node sem falhas/skips; 175 verificações Firefox, incluindo 36 novas responsivas. Artefatos temporários:

| Suíte | Diretório |
|---|---|
| Responsiva final (36) | `/tmp/writingroom-browser-7szuf6i5` |
| Ampla (85) | `/tmp/writingroom-browser-fm4wm7lu` |
| Revisão (9) | `/tmp/writingroom-browser-pd5zz_nf` |
| Editor (11) | `/tmp/writingroom-browser-4y_ys4al` |
| Pacote v1 (11) | `/tmp/writingroom-browser-0kr53ny1` |
| Chaves/v2 (11) | `/tmp/writingroom-browser-ya_j34e5` |
| Rodadas (12) | `/tmp/writingroom-browser-87mjjojn` |

Log Node final: `/tmp/writingroom-alpha19-final-node.log`. Capturas móveis inspecionadas visualmente. Asserções novas não incluem medição de tempo de frame ou latência de toque; “mais fluido” descreve o fluxo e uso de espaço, não um benchmark de desempenho.

## Continuidade alpha.20

Foco durante leitura passa a preservar o Manuscrito; anteriormente o handler levava ao editor. Sair mantém a vista. Em celular, ações de edição e seletor de tamanho ficam fora do foco. Preferência 18/21/24 px vale apenas para leitura simples/visual e persiste no navegador com validação de allowlist e fallback de 18 px; sem alteração de exportações ou arquivos autorais. A referência fecha por botão próprio com as ferramentas recolhidas e retorna foco a Ferramentas.

A suíte móvel passou de 36 para 47 verificações: preservação de vista/conteúdo no foco, saída, ocultação de ações, tamanho independente, preferência e reload, ausência de overflow com fonte grande e fechamento/foco da referência. Não adiciona homologação de teclado virtual/Safari ou tempo de frame.

Evidência alpha.20: 258 testes Node aprovados sem falhas/skips; 186 verificações Firefox (47 responsivas). Node `/tmp/writingroom-alpha20-final-node.log`; móvel `/tmp/writingroom-browser-ztkig456`; ampla `/tmp/writingroom-browser-s4ij5qxr`; revisão `/tmp/writingroom-browser-yv521g7b`; Editor `/tmp/writingroom-browser-d0rwbsl4`; v1 `/tmp/writingroom-browser-zgwzuktj`; chaves `/tmp/writingroom-browser-66x999m1`; rodadas `/tmp/writingroom-browser-9k8yhhbr`. Novos testes Node cobrem preferência inválida e ausência de gravação autoral. Mock de CSSStyleDeclaration atualizado para suportar setProperty usado pela preferência; a implementação real já funciona no Firefox.
