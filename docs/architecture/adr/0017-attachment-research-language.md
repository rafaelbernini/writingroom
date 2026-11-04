# ADR-0017 — anexos como evidência, pesquisa e origem de tradução

2026-11-02 · alpha.12. Implementação local; desktop permanece por último.

Hipótese: um arquivo é fonte preservada; texto extraído é uma representação revisável; pesquisa e tradução são documentos derivados com referências por ID. Importar não publica nem traduz automaticamente. Uma obra pode combinar materiais digitais, transcrições de imagens e decisões terminológicas sem substituir os originais.

Decisão: permitir qualquer extensão como download opaco, preservando limites, checksum, lixeira e backup existentes. Apenas PNG/JPEG validados exibem imagem, TXT/MD exibem texto. HTML/SVG/executáveis/formatos desconhecidos usam application/octet-stream e Content-Disposition attachment, nunca iframe/script. DOCX/ODT validam assinatura ZIP; a extração valida estrutura e limites. PDF mantém validação existente e usa pdftotext local. DOCX/ODT usam Python stdlib/ZIP/XML, sem extração de caminhos, execução de macros ou fetch de links. Archives limitados em entradas/expansão/XML, DTD e XML UTF-16 com NUL bloqueados; timeout/limite de saída e temporários privados com limpeza.

Extração é leitura: prévia editável, até 1 milhão de caracteres. Confirmar até 200 mil cria pesquisa ou par de tradução, com SHA esperado do anexo e referência explícita. As fontes ficam fora da compilação e seus IDs remapeiam no restore. Transcrição manual permite usar formatos sem extrator; não chamar isso de OCR. Layout, tabelas e estrutura rica não fazem round-trip.

Sinônimos offline: ler índices MyThes instalados, por offset de bytes, português/inglês. Informar nome real da base; neste host pt_BR é link para pt_PT. Não redistribuir bases do SO nem prometer dicionário universal. Base lexical global opcional importável com origem/licença, definição/sinônimos/traduções, consulta offline e download separado. Não faz parte do backup da obra.

Tradução automática: conector LibreTranslate configurado pelo servidor, desligado sem URL; HTTPS ou HTTP loopback, sem credenciais no browser/obra, sem redirecionamento, limite de texto/resposta/timeout. Botão mostra serviço/origem, exige autorização explícita e devolve prévia. Usar transfere para tradução inicial; criar trecho é outra confirmação. Nenhuma resposta sobrescreve cena existente. Contrato verificado com servidor sintético local; não declarar qualidade de tradução real validada.

Nenhum schema novo: ampliação de formatos aceitos em anexos 3 e fontes 4. Versões antigas podem recusar anexos de tipos novos; manter cópias e usar alpha.12 para restaurá-los. Migração para fontes continua exigindo backup integral antes da gravação. Credenciais/serviços externos, corpus lexical licenciado completo, OCR, CAT/TMX/XLIFF e reconstituição de layout continuam dependências separadas.

Validação alpha.12: 186 testes Node; 84 fluxos Firefox amplos, 6 de anexos/idiomas e 3 móveis. Extração do Word privado do autor conferida em memória (5934 parágrafos/833639 caracteres), original intacto. A prévia automática é invalidada se o texto/idiomas mudarem antes de usar; texto da resposta permanece editável para revisão.
