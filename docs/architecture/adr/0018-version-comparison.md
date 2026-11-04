# ADR-0018 — comparação textual lado a lado

2026-11-02 · alpha.13 · implementado.

Comparação somente de leitura entre quaisquer duas versões da mesma cena, incluindo o texto atual no disco. Seleções por IDs; snapshots de outra cena são recusados. Endpoint POST compare-versions retorna dados derivados sem salvar projeto, snapshot ou configuração. Abertura exige flush do editor; texto atual vem do servidor, não de uma cópia antiga da sessão. Não incorpora edições posteriores automaticamente: Comparar faz nova consulta.

Algoritmo LCS por linhas com finais de linha preservados e limite de 250 mil células na matriz. Prefixo/sufixo iguais reduzem custo. Acima do orçamento, comparar blocos intermediários e sinalizar aproximação; mais de 20 mil linhas somadas gera um único bloco. Esse modo pode destacar linhas internas iguais e suas contagens são aproximadas. Nunca descartar texto silenciosamente.

Interface em Versões → Comparar duas versões lado a lado. Alinhamento dos lados, números de linha, inclusões/exclusões com fundo distinto, rótulos textuais, inversão, somente alterações, navegação e carregamento em lotes de 500 linhas. Mobile empilha os lados de cada linha. Alterar seleção invalida resultados antigos até Comparar. Textos inseridos via textContent; não interpretar HTML/Markdown. Símbolo ∅ indica lado vazio.

Diferenças entre documentos visuais/anotações são sinalizadas por comparação estrutural, mas os destaques são de texto; sem diff detalhado de marcas/anotações e sem atribuição de autoria. Redline/aceitar/rejeitar são outra etapa. Restauração de versões continua no fluxo existente, preservando snapshot anterior e CAS.

Evidência: 193 testes Node; 85 fluxos Firefox amplos e 4 focados de comparação, incluindo duas versões salvas, atual, inversão/filtro/navegação, HTML literal e mobile. Caso privado em cópia restaurada: 103 comparações, 2 diferenças textuais, nenhum fallback; backup original e cópia preservados. Nenhuma alteração de schema, manuscrito privado original, credenciais ou desktop.
