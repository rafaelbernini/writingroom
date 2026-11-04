# ADR-0013 — catálogo de projetos, perfil privado e fontes vinculadas

2026-11-02. Estado: implementado na alpha.8/studio-7, nos limites abaixo.

Plano: catálogo declarativo com tipo e preset histórico, atalhos para fichas/rascunhos e centro de fontes com vínculos; perfil do autor em arquivo separado, com nome/pseudônimo e backup próprio. Testar criação/validação, dados privados fora do livro, remapeamento e conflitos; Firefox sintético e cópia privada do modelo autorizado. Sem integração remota, contas, IA ou desktop.

Tipos novos criam estrutura editável, não anunciam edição especializada/FDX/layout de quadrinhos. Modelos de romance/não ficção anteriores mantêm seu contrato. Perfil não é autenticação: contatos ficam fora do projeto, e autoria entra somente por escolha explícita; arquivo privado com hash de base e troca atômica. Backup do perfil separado do livro.

Fontes de pesquisa: metadados e referências por IDs de nós, sem fetch remoto. Primeiro uso de metadados novos/referências exige formato 4 e cópia integral verificada antes de save, inclusive a partir de formato 3. Abertura não migra; rich/asset não rebaixam 4. Backup/restauração e duplicação remapeiam referências conhecidas, preservam texto da ficha e limites de assets.

Riscos: dados de contato são privados mas não criptografados; JSON continua sem exclusividade entre processos. Schema/URLs/limites e staging/commit clonado protegem operações rejeitadas. Fonte histórica é registro do autor, não fato verificado automaticamente. Rollback: original de migração verificado em cópia separada; perfil separado exportável. Recursos profissionais remotos seguem ADR-0012 e cloud antes do desktop.

## Contratos e evidência

Catálogo com 16 IDs/versionamento declarativo, mais preset histórico opcional e metadados escalares em settings para projetos novos. Não altera tipo/árvore ao abrir projetos existentes. Roteiro/quadrinhos/artigo científico usam editor geral, sem FDX/diagramação/normas especializadas. Atalhos Personagem/Cenário/Rascunho reutilizam fichas/cenas de Pesquisa já existentes.

Perfil em `<WRITINGROOM_HOME>/.settings/author-profile.json`, separado de cada pasta .wroom; modo 0600 e diretório 0700 na criação. Sem conta online/criptografia; nomes/contatos são dados locais. GET/save com hash base, validação estrita, temporário exclusivo/fsync/rename e bloqueio de symlink. Backup/importação do perfil com checksum próprio e escolha explícita; preview valida campos sem salvar. Nome de publicação só entra em obra por clique explícito, sem copiar endereço/telefone/e-mail/biografia.

Fonte é nó text de Pesquisa com `source={url,author,publisher,date,accessed,basis,refs}`; refs usam IDs de cenas/fichas/anexos, sem duplicar bytes. URL http/https sem credenciais/controles e sem fetch automático; data histórica livre e acesso ISO. Classificação é do usuário, não verificação externa. `source_hashes` é derivado, não persistido. Fonte tem conteúdo/notas editáveis independentemente dos metadados. Não é histórico versionado dos metadados. Links para itens na lixeira são preservados e sinalizados indisponíveis.

Primeiro registro eleva formatos 1/2/3→4 somente após backup integral validado. Rich e attachments mantêm o maior formato já usado. Reader futuro/antigo deve rejeitar 4; nada é rebaixado/removido para fingir compatibilidade. Restaurar backup remapeia refs, duplicar subárvore remapeia internas e mantém externas do mesmo projeto. Fonte não pode entrar na compilação; checkbox bloqueado nas vistas.

Baseline 139 → 151 testes Node sem falhas/skips. 62 verificações Firefox Linux, incluindo perfil salvar/baixar/limpar/restaurar, nome de publicação explícito, roteiro com pesquisa histórica, atalhos, fonte com três vínculos/backlinks, notas preservadas, backup com refs remapeadas e contatos ausentes. DOCX LibreOffice/EPUB estrutural mantidos; EPUBCheck ausente. 20 verificações privadas numa cópia isolada do livro longo, incluindo migração 3→4 e fontes/anexos sem alteração do texto original. Relatórios/limites em PROGRESS.

Pendências: campos tipados/retratos/cronologia de eventos, fontes externas indexadas/OCR/PDF interno, central de backup automático, perfil cifrado/cross-process lock, alterações rastreadas e sessão de submissão. Não existe modo Editor autenticado/E2EE/IA; continuam planos da ADR-0012. Credenciais Google/Drive/OneDrive/Dropbox só na última etapa antes do desktop.
