# ADR-0016 — tradução e ferramentas de idioma

2026-11-02. Implementado e verificado na alpha.11.

Adicionar quatro modelos e ambiente Tradução em todos os projetos, com originais em Pesquisa, destinos no Manuscrito, vínculo explícito por source.refs e keywords reservadas `translation:source`, `translation:from:*`, `translation:to:*`. Originais são fontes documentadas e não entram na compilação. Reutilizar schema 4, migração com backup, CAS, snapshots e remapeamento de fontes no restore. Não usar IDs embutidos em texto.

Glossário/dicionário pessoal por obra como fontes `language:glossary`, corpo Markdown legível/editável (definição, sinônimos, equivalentes, contexto, proveniência). Incluído em backups, excluído da publicação. Consultas externas por links explícitos com noopener/noreferrer; não buscar/enviar manuscrito automaticamente, nem alegar dicionário completo offline. Bases completas, licenciamento, TM/TMX/XLIFF, alinhamento automático e QA linguística avançada ficam em backlog explícito.

Tela de tradução lista trechos, progresso por estados existentes, original/tradução lado a lado pelo editor já protegido, exportação bilíngue de revisão separada da publicação. Criação transacional de pares e de verbetes; importação de original TXT/MD com confirmação. Não converter projetos existentes ao abrir.

Alterar texto original em uma operação confirmada reabre destinos Concluídos para Revisão; a resposta da API informa os estados derivados para sincronizar o cliente. Memória local é busca textual nos pares, limitada a 30 resultados, não TM profissional. Idiomas iguais são aceitos no glossário e recusados em pares de tradução.

Evidências: 174 testes Node e 84 grupos Firefox no smoke amplo e 3 verificações móveis em perfil próprio; criação/rejeição atômica, falha de backup de migração, remapeamento em restore, CAS, revisão reaberta, exclusão da publicação, download real dos dois exports MD e interface responsiva. Documento de escopo/limites: TRANSLATION_AND_LANGUAGE_TOOLS.md.
