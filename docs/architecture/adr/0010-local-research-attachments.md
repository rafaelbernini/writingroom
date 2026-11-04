# ADR-0010 — anexos locais de pesquisa no agregado JSON

Data: 2026-11-02. Estado: implementado e validado na alpha.6/studio-5.

Plano: acrescentar validação de assets, serviço de importação, rotas binárias e UI Caderno/Anexos com prévia e confirmação. Testar formatos/limites/checksums, rejeição sem mutação, backup/restauração e fluxo Firefox com fixtures sintéticas. Nenhum arquivo pessoal será usado como fixture; desktop permanece por último.

Decisão transitória: bytes base64 no agregado JSON, em vez de gravar blobs externos antes de existir transação/migrador de storage integrado. Assim rename do agregado e backup incluem bytes e referências juntos. Custo explícito de memória/IO; não é storage de produção para acervos grandes. Sem dependências novas. Limites iniciais: 8 MB/arquivo, 16 MB de bytes por projeto, 100 anexos e agregado serializado até 30 MB para caber na restauração UI de 32 MB.

Anexo é nó research fora da publicação, com identidade própria, nome original, MIME derivado de extensão/assinatura, bytes/checksum e dados. PNG/JPEG com dimensões limitadas, PDF com assinatura/terminador e TXT/Markdown UTF-8 estrito. SVG/HTML/arquivos executáveis e paths/URLs não são importados. Verificação estrutural mínima não é sanitização ou certificação de PDF/imagens. Preview de imagem/texto no app; PDF só download para leitor escolhido pelo usuário. Conteúdo Markdown de pesquisa é literal.

Primeira importação usa formato 3 com backup integral verificado antes da gravação, também para projetos formato 2. Abertura não migra. Clientes antigos rejeitam formato 3; não podem remapear referências desconhecidas nem descartar anexos. Voltar cena a texto não rebaixa formato. Falha de backup/save não confirma importação; rollback usa original verificado em cópia separada, preservando o novo.

Biblioteca de anexos usa hash para mudanças concorrentes na mesma instância. Lixeira mantém bytes e restauração recupera nó; não há exclusão permanente/GC nesta entrega. Backup, recuperação e restauração em novo projeto preservam bytes e remapeiam IDs conhecidos. Download recebe ID, nunca caminho local; Host/Origin e CSP continuam. Não carregar PDF ativo, HTML ou recursos remotos no app.

## Evidências e limites observados

Baseline 115 → 129 testes Node (11 de anexos, uma migração 2→3 e dois HTTP), sem falhas/skips no Linux/Node 26. Firefox real: 47 verificações totais, incluindo PNG/JPEG gerados por canvas e decodificados, texto literal sem HTML, PDF sem embed, cancelamento, download com bytes iguais, lixeira, busca e backup/restauração/reload. DOCX continua abrindo no LibreOffice; EPUB estrutural apenas, sem EPUBCheck. Artefatos em PROGRESS.

PNG tem CRC por chunk e rejeita APNG, JPEG percorre segmentos para dimensões; ambas limitam dimensões/pixels. Não é validação completa do codec: falha de decodificação na UI mantém original disponível. PDF verifica cabeçalho/terminador, sem interpretação/execução; não há certificação de PDF válido ou sanitizado. Texto é UTF-8 estrito e literal. Não existem OCR, extração de texto PDF, imagem inline, referências externas vinculadas, deduplicação física ou gerenciamento de versões dos bytes.

Cancelamento não salva, checksum esperado vincula confirmação aos bytes da prévia, hash da biblioteca rejeita confirmação concorrente obsoleta. Erro de backup impede gravação. Metadata não pode incluir anexo no livro. Formato 3 tem validação de bytes/MIME/hash/referência e tamanho ao abrir/salvar/restaurar; anexo corrompido deixa projeto indisponível para escrita, preservando arquivo original. A solução futura de assets separados precisa migrador/transação/backup antes de substituir o agregado.
