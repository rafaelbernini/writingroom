# Tradução e ferramentas de idioma

2026-11-02 · registro do incremento alpha.11 · ADR-0016. Complementa a especificação principal.

**Atualização alpha.12:** extração PDF/DOCX/ODT e uso de anexos, sinônimos offline MyThes, base lexical importável e conector de tradução com prévia foram implementados. As seções abaixo registram o estado anterior; veja [análise atual, hipótese de uso e configuração](ATTACHMENT_RESEARCH_TRANSLATION_ANALYSIS.md) e ADR-0017. Base universal, OCR, CAT e round-trip continuam fora do escopo entregue.

## Fluxo entregue

1. Novo projeto: Tradução — livro, artigo, documento ou outros textos. Cada modelo cria briefing com orientação própria, originais, glossário e revisão em Pesquisa. O briefing registra obra/autor original, direitos, idiomas/variantes, público, tradutor/revisor, créditos, tom, prazo e checklist. O modelo não confere autorização ou certificação.
2. Ambiente **Tradução**, disponível também nas obras existentes: criar trecho com título, códigos de idioma de origem/destino distintos, original e tradução inicial opcional. Original até 200 mil unidades UTF-16; carregar TXT/Markdown UTF-8 apenas preenche prévia até confirmar. Divida textos maiores em capítulos/seções. PDF/imagens permanecem anexos; sem OCR/importador DOCX aqui.
3. Cada par consiste em uma fonte documentada em Pesquisa e um documento no Manuscrito. Original não entra na compilação, mesmo quando contém texto. Vínculo é ID explícito em source.refs, remapeado no backup/restauração. O corpo do original pode ser editado separadamente, com os mecanismos de gravação, conflitos e versões existentes.
4. **Traduzir lado a lado** abre o editor protegido com o original em leitura. Selecionar um destino vinculado abre a referência correspondente. Funciona com texto simples e editor visual; lang por trecho e direção automática. No celular os painéis ficam empilhados. Não há alinhamento/rolagem sincronizada por sentença.
5. Progresso, filtro A fazer/Rascunho/Revisão/Concluído, contagens e alerta literal de números ausentes. Estados são manuais; alteração confirmada do texto original reabre para Revisão um destino Concluído. Conflito rejeitado não muda o estado. Não há certificado de fidelidade, detector completo de omissões ou equivalências numéricas de localidades distintas.
6. Publicar/exportar usa os destinos incluídos e formatos existentes. **Revisão bilíngue MD** é uma exportação separada, com originais/traduções/idiomas/estado; inclui aviso quando o destino está indisponível. Trashing segue os menus existentes. Sem XLIFF/TMX/TBX, tradução automática ou preservação de layout do arquivo de origem.

## Dicionário em todos os projetos

Botão **Dicionário e idiomas** na escrita e no ambiente Tradução. Seleção de texto preenche a consulta limitada a 180 caracteres; nunca envia cena automaticamente. Busca local nos verbetes e em até 30 pares traduzidos da própria obra. Memória local é consulta textual, sem fuzzy matching ou preenchimento automático.

Verbetes pessoais contêm termo, idiomas (podem ser iguais para consulta monolíngue), definição, sinônimos/antônimos, equivalentes preferidos, contexto/restrições e fonte/data/decisão. Texto Markdown editável como documento normal; remoção reversível pela lixeira e exportação do glossário MD. Ficam separados por obra e acompanham backups. Não são uma base lexical completa pré-instalada.

Links explícitos: Wikcionário, Priberam, Google Tradutor e abertura do DeepL. O termo/idiomas entram apenas nos links correspondentes; DeepL abre sem texto. Nova aba, noopener/noreferrer; sem requests de consulta no servidor, scraping, credenciais, resultado incorporado ou cobrança de API. Disponibilidade, cobertura, limites e termos pertencem aos sites. Ortografia continua dependendo do dicionário do navegador.

Fontes verificadas para os destinos de consulta: [Wikcionário](https://pt.wiktionary.org/wiki/Wikcion%C3%A1rio:P%C3%A1gina_principal), [Priberam](https://dicionario.priberam.org/), [Google Tradutor](https://translate.google.com/), [DeepL](https://www.deepl.com/translator). Nenhuma base desses provedores foi copiada para o aplicativo.

## Persistência e compatibilidade

Schema 4 de fontes, sem novo schema. Keywords reservadas translation:source, translation:from:*, translation:to:* e language:glossary identificam o uso; fonte original aponta destino em source.refs. A primeira criação em obra antiga exige backup integral de migração verificado antes de salvar. Falha nessa cópia preserva a obra antiga. Nada migra ao apenas abrir.

Vínculos usam a mesma política de referências do Caderno: editar manualmente keywords/refs altera a identificação/vínculo. Se o destino for removido, o painel avisa; restaurar pode recuperar o vínculo. Não há proteção de imutabilidade do original ou aprovação autenticada de revisor. Cópias/restaurações não apontam para os IDs da obra anterior.

## Evolução necessária para uma suíte CAT e base lexical completa

- LANG-001: selecionar/adquirir bases lexicais licenciadas por idioma; importar/indexar offline, atribuição/versão/licença, atualizações e cobertura verificável. Não marcar completo por oferecer links.
- LANG-002: corpus de sinônimos/antônimos, flexões, pronúncia e traduções por sentido, variantes/registro e fontes; consulta estruturada com consentimento por provedor.
- TRN-001: segmentação configurável, alinhamento e fusão/divisão de segmentos, revisão de divergências do original, rolagem sincronizada.
- TRN-002: memória de tradução dedicada, correspondência exata/aproximada, origem/aprovação, import/export TMX e deduplicação.
- TRN-003: terminologia estruturada com termos proibidos/preferidos, variantes, idiomas, validação de consistência e intercâmbio TBX/CSV.
- TRN-004: XLIFF e round-trip DOCX/ODT/HTML com tags/layout, placeholders e validação; OCR só por fluxo explícito.
- TRN-005: QA de números/unidades, nomes, pontuação, termos, tags, trechos vazios/omissões e checklist humano; não tratar alerta como aprovação automática.
- TRN-006: serviços de tradução/IA opt-in, credenciais fora dos projetos, envio mínimo confirmado, custos e glossário/contexto por obra; depender dos gates de IA.
- TRN-007: revisão bilíngue rica, créditos de tradução/notas do tradutor e entrega editorial, permissões por obra, pacote criptografado e depois colaboração autenticada.

Nuvem permanece imediatamente antes do desktop; desktop por último. Recursos acima não estão implicitamente entregues nesta versão.
