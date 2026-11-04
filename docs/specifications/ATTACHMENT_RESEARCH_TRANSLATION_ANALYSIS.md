# Análise global de anexos, pesquisa e tradução

2026-11-02 · alpha.12 · ADR-0017.

## Hipótese de uso

Uma autora de romance histórico guarda um artigo PDF, um capítulo Word e uma fotografia de arquivo. O PDF e o Word viram textos de pesquisa após extração e revisão. Ela registra autoria, acervo, data, página/seção e URL nos documentos/fontes do Caderno, liga-os às cenas e consulta os backlinks durante a escrita. Na foto, transcreve manualmente o trecho relevante. Cada documento derivado aponta para o arquivo preservado.

Se precisar traduzir uma fonte, escolhe **Criar trecho de tradução** na prévia. O original textual permanece em Pesquisa, vinculado ao arquivo; o destino entra no Manuscrito. Ela revisa com os dois textos, consulta sinônimos locais e sua base lexical, guarda escolhas no glossário e, se optar por um serviço de tradução, envia somente o trecho mostrado no diálogo. A resposta é sugestão editável. Alterar o original reabre tradução concluída para Revisão; publicar exporta somente os destinos incluídos. Exportar revisão bilíngue é uma escolha separada que inclui o original.

## Matriz implementada

| Material | Guardar e baixar original | Leitura/uso no projeto | Limite prático |
|---|---|---|---|
| PDF com texto | Sim | Extrair localmente, revisar e criar pesquisa/tradução | pdftotext instalado; senha/arquivo inválido falham sem criar documento |
| Word DOCX | Sim | Texto de parágrafos/tabs/quebras, pesquisa/tradução | Python 3; sem preservação de layout/objetos/notas de rodapé |
| ODT | Sim | Texto de títulos/parágrafos, pesquisa/tradução | Python 3; sem round-trip de formatação |
| TXT/MD/Markdown UTF-8 | Sim | Prévia e uso textual | Até 1 milhão de caracteres na extração |
| PNG/JPEG | Sim | Prévia de imagem e transcrição manual na extração | Não há OCR automático |
| DOC antigo, planilha, áudio, vídeo, EPUB e outros | Sim, download opaco | Notas/fontes/vínculos e texto transcrito/colado na prévia | Não há decodificador automático para todos os formatos |
| HTML/SVG/JS/executáveis | Sim, download opaco | Registro e transcrição, sem renderizar/executar o arquivo | Não funciona como página/plugin dentro do projeto |

Persistem os limites atuais de **8 MB por arquivo, 16 MB de anexos e 30 MB por projeto**, até 100 anexos, incluindo os que estão na lixeira. O manual Scrivener local de 13 MB excede o limite de anexo atual; não afirmar que ele cabe só por ser PDF. Divida uma cópia externamente para uso como fonte, mantendo o original intacto. A extração não remove proteção por senha, faz OCR ou preserva diagramação. Prévia pode conter até 1 milhão de caracteres; cada documento derivado até 200 mil, escolhido/revisado pelo usuário.

## Ferramentas de idioma entregues

**Sinônimos offline:** MyThes instalado no sistema, pt/en, com variante/base exibida. Neste ambiente, a base portuguesa real é th_pt_PT_v2.dat, mesmo sob nome pt_BR. A consulta não exige internet. Ausência de pacote/termo gera aviso, sem inventar resultado. Bases do SO não foram incluídas no repositório.

**Base lexical global:** JSON writingroom-lexicon-1, até 50 mil entradas / 10 MB. Exige nome/origem/licença; cada entrada informa termo, language BCP 47, definition, synonyms e translations [{language,text}]. Consulte **Modelo de base JSON** para o formato. Importar substitui a base compartilhada por todos os projetos após confirmação; **Baixar base lexical** preserva uma cópia. Armazenamento em .settings/lexicon.json, separado dos backups de obra. O sistema valida o formato, não certifica licença ou precisão. Pode conter um dicionário autorizado; não vem com definições universais pré-instaladas.

**Tradução automática integrada:** LibreTranslate local ou HTTPS, com texto exibido e autorização por solicitação. Até 10 mil caracteres enviados, prévia até 30 mil; timeout 15 s e resposta até 100 KB. Sem substituição de cenas ou envio de anexo inteiro. Idiomas/custos/qualidade/retensão dependem do servidor configurado. Configurar no processo do WritingRoom:

```bash
WRITINGROOM_TRANSLATE_URL='http://127.0.0.1:5000/translate' npm run dev
```

Para provedor HTTPS, use a URL completa do endpoint /translate, WRITINGROOM_TRANSLATE_KEY (se necessária) e WRITINGROOM_TRANSLATE_LABEL. A chave nunca é salva na obra ou devolvida ao browser. Sem URL, o diálogo explica a configuração e desabilita solicitação. Instalar/operar o motor e obter credenciais são etapas externas; não existe serviço real ativo apenas porque o conector foi implementado.

Contrato: [documentação oficial LibreTranslate](https://docs.libretranslate.com/api/operations/translate/). Testes usam provedor sintético loopback, não medem qualidade de tradução. Base lexical e conector não substituem revisão humana.

## Fluxo visível

1. Caderno → Anexos → Importar; conferir e confirmar o arquivo.
2. Abrir anexo → **Extrair texto / pesquisar / traduzir**.
3. Revisar ou transcrever na prévia; criar pesquisa vinculada ou trecho de tradução.
4. Dicionário e idiomas → **Consultar bases offline**, importar base lexical, guardar decisões no glossário ou solicitar prévia automática.
5. Guardar backup de obra e, separadamente, baixar a base lexical global.

Próximos incrementos: OCR escolhido pelo usuário, extração por páginas/intervalos, limites maiores com storage externo e backup compatível, importadores DOC/EPUB/tabulares, alinhamento/CAT/TMX/XLIFF/TBX, QA e round-trip de layout. Nenhum desses motores é simulado por um botão.

Validação alpha.12: 186 testes Node; 84 fluxos Firefox amplos, 6 de anexos/idiomas e 3 móveis. Extração do Word privado do autor conferida em memória (5934 parágrafos/833639 caracteres), original intacto. A prévia automática é invalidada se o texto/idiomas mudarem antes de usar; texto da resposta permanece editável para revisão.
