# Matriz requisito → trabalho → evidência

## Preparação online — sessão vinculada ao dispositivo (2026-11-03)

Validação desta etapa: **312 testes Node aprovados, sem falhas/skips**, incluindo nove novos de composição, dois HTTPS e um de lock entre processos; **27 verificações Firefox de cookies reexecutadas**. Log `/tmp/writingroom-bound-session-node.log`; relatório `/tmp/writingroom-browser-amxz9i89/report.json`. O ciclo combinado de posse+convites no navegador ainda é a próxima etapa; o teste Firefox desta rodada valida cookies legados. Sem manuscrito privado, identidade real ou mudança da UI.

ADR-0032: modo sintético integrado exige desafio de posse na mesma sessão e vínculo durável atual antes de operar convites/escopo. Outra sessão não herda prova; revogação invalida sessão na próxima verificação. Diretório reservado durante dispatcher síncrono do diário, sem alegação de transação distribuída. Restore suspenso de qualquer componente bloqueia fluxo. Emissor/pins/revogação de chave seguem fora de rotas. Aplicativo preservado em alpha.20/studio-19.


## Preparação online — diretório durável de dispositivos (2026-11-03)

Validação desta etapa: **300 testes Node aprovados, sem falhas/skips**, incluindo nove novos do diretório durável. Log `/tmp/writingroom-device-directory-node.log`. Nove cenários também aprovados isoladamente. Firefox não reexecutado: 11 verificações HPKE/vínculo da ADR-0030 são evidência anterior. Sem manuscrito privado, identidade real, envio ou alteração de UI.

ADR-0031: pins/vínculos públicos assinados/revogações em SQLite separado, CAS global e ativação após prova de posse. Desafios são voláteis e invalidados no restart; vínculos e revogações persistem. Restore em domínio novo suspenso, sem reativar pins de backup antigo. Nove testes adversariais, sem privadas/manuscritos no banco. Próximo: ligar diretório a sessão/operação no serviço sintético. Aplicativo permanece alpha.20/studio-19.


## Preparação online — vínculo e posse de dispositivo (2026-11-03)

Validação desta etapa: **291 testes Node aprovados, sem falhas/skips**, e **11 verificações Firefox** de HPKE/vínculo (incluindo 257 ciphertexts oficiais). Log `/tmp/writingroom-device-binding-final-node.log`; relatório `/tmp/writingroom-browser-nx74mcp9/report.json`. Oito testes Node novos. Sem manuscrito privado, identidade real ou envio externo. Suítes antigas de UI/cookies não foram reexecutadas; aplicativo inalterado.

ADR-0030: identidade Ed25519 sintética pinada assina a pública X25519, subject/dispositivo/ID/prazo. Desafio HPKE de uso único exige posse antes da ativação; testa adulteração, revogação, substituição e corridas. Prova em memória, sem diretório/recovery duráveis ou e-mail real. Próximo: persistência transacional de confiança/revogação e proteção de restauração. Aplicativo permanece alpha.20/studio-19.


## Preparação online — HPKE offline (2026-11-03)

Validação desta etapa: **283 testes Node aprovados, sem falhas/skips**, incluindo seis novos de HPKE; **seis verificações Firefox** com 257 ciphertexts oficiais em cada runtime e intercâmbio nos dois sentidos. Log `/tmp/writingroom-hpke-final-node.log`; browser `/tmp/writingroom-browser-rqogzglj/report.json`. Sem manuscrito privado ou conta real. As suítes anteriores de UI/cookies não foram reexecutadas; a UI não mudou.

ADR-0029: biblioteca hpke 1.1.8 exata, MIT/sem dependências de execução, somente devDependency. Prova X25519/HKDF-SHA256/AES-256-GCM Base com vetores RFC/CFRG e envelope sintético separado, até 64 KiB. Testa destinatário, aleatoriedade, contexto, adulteração e intercâmbio Node/Firefox. Não autentica remetente, não bloqueia replay nem oferece diretório/E2EE de produção. Próximo: vínculo assinado de chave por dispositivo e prova de posse. Produto preservado em alpha.20/studio-19.


## Preparação online — cookies no Firefox (2026-11-03)

Validação desta etapa: **277 testes Node aprovados, sem falhas/skips**, e **27 verificações novas no Firefox** para cookies/origens. Log Node `/tmp/writingroom-browser-cookies-node.log`; relatório Firefox `/tmp/writingroom-browser-szvsbg4l/report.json`. As 186 verificações anteriores da UI alpha.20 não foram reexecutadas nesta etapa. Sem manuscrito privado, identidade real, envio externo ou implantação.

ADR-0028: 27 verificações reais de cookies/CSRF/origens em Firefox isolado, com CA restrita ao perfil NSS e validação TLS ativa. GET /session sem Origin só aceita Fetch Metadata same-origin. Documento constante de fixture opt-in; emissor permanece fora das rotas. SameSite verificado com controle positivo; outra origem no mesmo site também bloqueada por Origin. Secure foi enviado ao HTTP loopback neste ambiente, limite explicitamente registrado. Aplicativo permanece alpha.20/studio-19; sem login real ou integração com obras.


## Preparação online — transporte HTTPS isolado (2026-11-03)

Validação desta etapa (2026-11-03): **276 testes Node aprovados, sem falhas/skips**, incluindo dez testes novos de HTTPS real no loopback. Log `/tmp/writingroom-sharing-https-node.log`. Certificados temporários e SQLite sintético, sem manuscrito privado ou credencial real. Firefox não reexecutado: 186 verificações anteriores pertencem à UI alpha.20, não à política de cookies deste transporte.

ADR-0027: adaptador HTTPS em 127.0.0.1/porta efêmera, sem integração com o servidor do aplicativo. TLS temporário verificado; identidade emitida somente pelo controle privado do teste. Origin/Host/CSRF/cookies, allowlist JSON, limites, escopo durável, lock/replay/reinício exercitados em dez testes reais de requisição. Sem OIDC/e-mail/login real, manuscrito ou implantação. Aplicativo preservado em alpha.20/studio-19.


## Preparação online — diário durável sintético (2026-11-03)

Validação desta etapa: **266 testes Node aprovados, sem falhas/skips**, incluindo oito novos duráveis; 21 testes de compartilhamento também passaram isoladamente. Log `/tmp/writingroom-durable-sharing-node.log`. Firefox não reexecutado: interface preservada, com 186 verificações anteriores da alpha.20. Nenhum manuscrito privado, serviço remoto ou credencial real usado.

ADR-0026: SQLite isolado para convites/concessões/recibos, com transações e reaproveitamento da política existente. Backup verificável; restore em domínio novo suspenso, sem reativar acesso ou restaurar sessões. Oito testes novos de concorrência entre processos, SIGKILL, rollback, escopo/revogação, corrupção e recuperação. Sem login real, HTTP, manuscrito ou serviço remoto; aplicativo permanece alpha.20/studio-19.


## Alpha.20 — continuidade da leitura móvel (2026-11-03)

Validação alpha.20 em 2026-11-03: **258 testes Node aprovados, sem falhas/skips**, e **186 verificações Firefox** (85 gerais + 9 revisão + 11 Editor + 11 pacote v1 + 11 chaves/v2 + 12 rodadas + 47 responsivas). Log Node `/tmp/writingroom-alpha20-final-node.log`. Responsivo final: `/tmp/writingroom-browser-ztkig456/report.json`; captura de leitura em foco inspecionada. Sem manuscrito privado. Teste físico de Safari/iPhone, Chrome/Android e teclado virtual permanece pendente.

Foco agora preserva o Manuscrito quando acionado durante a leitura; sair do foco mantém a mesma vista. No celular, ações de edição ficam fora da leitura em foco. Novo seletor de tamanho de leitura (18/21/24 px), independente do editor e salvo apenas em `writingroom.reading-size` no navegador. Texto simples e prévia visual usam a preferência, sem alterar obras/exportações. Referência ganha botão interno de fechar, utilizável com ferramentas recolhidas e retorno de foco ao botão Ferramentas. Sem mudanças de schema, serviços online, dependências ou node_modules. Aplicação alpha.20/studio-19.


## Alpha.19 — leitura e escrita no celular (2026-11-03)

Validação alpha.19: **256 testes Node aprovados, sem falhas/skips**, e **175 verificações Firefox** (85 amplas, 9 revisão, 11 Editor, 11 pacote v1, 11 chaves/v2, 12 rodadas e 36 novas responsivas). Log Node `/tmp/writingroom-alpha19-final-node.log`. Móvel final: `/tmp/writingroom-browser-7szuf6i5/report.json`, capturas de escrita, estrutura, foco, leitura e visual. Não houve homologação em celular físico nem uso de manuscrito privado.

Ferramentas recolhíveis, abas deslizantes com seleção visível, editor com mais espaço, leitura com margens/entrelinha confortáveis, salvamento visível e diálogos adaptados. Painéis com fechamento, Escape, foco de retorno e conteúdo coberto inert. Aplicativo studio-18; formatos 1–7 e pacotes v1/v2/v3 preservados. Análise detalhada em MOBILE_RESPONSIVENESS.md. Nenhum arquivo de node_modules editado.


Validação de sessões sintéticas (2026-11-03): **256 testes Node aprovados, sem falhas/skips**, incluindo sete novos de sessões e seis anteriores de autorização. Log `/tmp/writingroom-synthetic-sessions-tests.log`. Interface inalterada; Firefox não reexecutado (139 fluxos anteriores da alpha.18). Sem manuscrito privado ou tráfego externo.


Sessões sintéticas — 2026-11-03: ADR-0025 e `session-harness.mjs` acrescentam state/código de uso único, rotação, CSRF/Origin, expiração, logout e revogação por dispositivo. Sete testes novos; transporte por chamadas em memória, sem OIDC, e-mail, HTTP, persistência ou mudança da interface alpha.18. Próximo: storage transacional de convites/grants/recibos, com concorrência e recuperação.


Validação desta etapa (2026-11-03): **249 testes Node aprovados, sem falhas/skips**, incluindo seis novos da prova sintética. Log: `/tmp/writingroom-online-contract-tests.log`. Interface inalterada; Firefox não reexecutado nesta etapa (139 fluxos são evidência anterior da alpha.18). Nenhum manuscrito privado utilizado.

## Contrato online e prova sintética — 2026-11-03

PRO-AC-06–09: ADR-0024 + sharing-spike/authorization.mjs + sharing-authorization.test.mjs. Seis cenários adversariais verificam política em memória. Estado: preparação, sem autenticação ou autorização remota entregue; gates completos continuam abertos.


## Rodadas/devolutivas offline — alpha.18

| Capacidade | Módulos / decisão | Evidência | Estado |
|---|---|---|---|
| PRO-016 oferta com base e participantes congelados | editorial-rounds.mjs; round-schema.mjs; ADR-0023 | criação/cópia/IDs/privacidade, v3 assinado, Firefox | Entregue offline, frase compartilhada, sem E2EE |
| PRO-017 retorno idempotente e conflito | recibos no agregado; staging e checkpoint; review exchange | duas instalações, restart/restore/replay, falha de backup, mil propostas | Pendências apenas, aceite individual existente |
| PRO-005/STO migração/backup/restauração | schema 7; migration-backup; workspace; backup-center | primeira gravação bloqueada sem backup, mapa de cenas/reviews, managed | Sem lock entre processos; forks/backup antigo têm limites explícitos |
| PRO-AC-06/07 parcela offline | pin/rodada/base/escopo/replay e compromisso atômico | adulteração/encerramento/revogação e conflito após prévia | Sem conclusão dos critérios de autenticação online/E2EE/serviço |

243 testes Node sem falhas/skips; 139 fluxos Firefox. Privado: 48 cenas em cópia restaurada, snapshot e modelo-base preservados. PRO-012/015 online e PRO-AC-08/09 completos continuam pendentes.


## Identidades por chave e assinatura offline — alpha.17

| Requisito | Implementação / decisão | Evidência | Estado |
|---|---|---|---|
| PRO-014 chave, pin externo, recuperação e assinatura | editorial-identities.mjs; signed-editorial-package.mjs; ADR-0022 | 8 testes de domínio + 2 HTTP; 11 fluxos Firefox | Entregue como controle de chave local, sem auditoria externa/E2EE |
| PRO-016 pacote v2 cifrado e assinado | wrapper Ed25519 sobre v1, prévia vinculada, verificação antes da KDF | interoperabilidade/adulteração/downgrade/pins e cópia privada | Cópia independente; sem rodadas/devolutivas |
| PRO-015 identidade por e-mail; PRO-017 devolutivas; PRO-AC-06–09 completos | Contratos restantes | Sem alegação de conclusão | Pendentes; assinatura não é conta/grant/base/replay durável |

231 testes Node sem falhas/skips; 127 fluxos Firefox. Chaves fora de backup de obra; schema 1–6 mantido. Privado: 48 cenas, origem preservada.


## Pacote offline por frase secreta — alpha.16 (2026-11-03)

| Requisito | Implementação / decisão | Evidência | Estado |
|---|---|---|---|
| PRO-013 seleção e projeção por allowlist | editorial-package.mjs; ADR-0021; UI Publicar | privacidade/ordem, notas/visual, CAS, Firefox | Parcial local: cenas explícitas, sem grants/remoto |
| PRO-014 primitivas e segredo | node:crypto AES-GCM/scrypt; parâmetros fixos/AAD | senha/IV/salt/tag/cifra/KDF/versão/limites | Parcial: segredo compartilhado, sem assinatura/identidade autenticada ou auditoria independente |
| PRO-016 gerar/abrir pacote | APIs package-preview/export e packages/open/confirm/cancel | 11 fluxos Firefox; staging e cópia privada de 48 cenas | Cópia independente; devolutiva/PRO-017 não implementadas |
| PRO-AC-06/07/08/09 | Sem alegação de conclusão | integridade e confirmação repetível locais, não grants/replay durável | Continuam pendentes no escopo profissional completo |

221 testes Node, 116 fluxos Firefox totais nesta sessão. Sem mudança de schema de obra; formato do pacote versão 1. Originais preservados.


## Perspectiva editorial — alpha.15 (2026-11-03)

| Capacidade | Módulos / decisão | Evidência executada | Estado |
|---|---|---|---|
| PRO-010/011: modo Editor local, carteira/acompanhamento parcial | editorial-tracking.mjs; app.js; server.mjs; ADR-0020 | editor-perspective.test.mjs; HTTP; 11 fluxos Firefox | Entregue localmente; sem identidade autenticada/permissões |
| Pendências/conflitos/comentários e navegação (EDT-009/014, PRO-007–011 parcial) | editorialSummary; revisões e anotações existentes | contagens/lixeira, navegação, aceite e histórico | Dados derivados; sem decisão em lote |
| Backup e restauração editorial (STO) | formato 6; migration-backup; workspace; backup-center | CAS, backup bloqueado, managed/restore/reload; cópia privada | Campos de acompanhamento preservados; preferência fora da obra |

210 testes Node; 85 fluxos Firefox amplos + 9 de revisão + 11 de perspectiva. Compartilhamento criptografado, permissões online, sessão de publicação e IA permanecem pendentes.


Data: 2026-11-02. Sem release nova ou commit emitido; mudanças sobre 0.1.0-alpha.1. Todos os requisitos abaixo permanecem **parciais**, pois cada um inclui comportamentos além dos cenários testados.

| Requisito / capacidade | Trabalho | Módulo | Evidência executada | Estado |
|---|---|---|---|---|
| STR-001, STR-002 | WR-0A-02/03 | core.mjs, validate/move | regression: posição inválida, raízes distintas, conteúdo textual; core: ciclo | Parcial |
| STR-004 | WR-0A-03/04 | core.mjs, updateNode/addNode | regression: metadados rejeitados sem mutação; compile aninhado | Parcial |
| STR-008 / SCR-007 | WR-0A-04 | core.mjs, trash/restore/search | regression: raiz protegida, subárvore, pai excluído | Parcial |
| PUB-001–002 / SCR-061 | WR-0A-04 | core.mjs, compile | regression: ordem, exclusão por pasta e pureza; core: salvar/reabrir/compilar | Parcial |
| EDT-013 / SCR-036 | WR-0A-04 | core.mjs, app.js, index.html | core/regression: versões preservadas; web: nome e sequência, abrir diálogo | Parcial; sem diff |
| EDT-002 | Proteção imediata de flush | app.js | web: debounce antes de snapshot/biblioteca, falha bloqueia saída, troca de cena | Parcial; sem CAS/crash recovery |
| INS-003 / SCR-027 | WR-0A-04 | core.mjs, search | core: conteúdo Unicode/case; regression: lixeira oculta descendentes | Parcial; sem FTS |
| Backlog SCR-001–084 | Catálogo do manual | SCRIVENER_CAPABILITY_MAP.md | Indexação de sumário/seções e consulta dirigida local | Documentado; não implementado |

Suítes: 8 casos em `core.test.mjs`, 9 em `regression.test.mjs`, 5 em `web.test.mjs`. Os testes web usam simulação de DOM/rede, não um navegador ou servidor HTTP real. Consulte PROGRESS para comandos e limitações.

## Segunda etapa — API e concorrência

| Requisito / capacidade | Trabalho | Módulo | Evidência | Estado |
|---|---|---|---|---|
| EDT-002 | WR-0A-05/07, WR-0B-09 parcial | server.mjs, app.js | HTTP: alterações simultâneas; conflito 409/428; web: hashes sequenciais e bloqueio após falha | Parcial; sem revisão monotônica/lock |
| LIB-001, LIB-005 / SCR-003 | WR-0A-06 | core.mjs, biblioteca | HTTP: projeto inválido/futuro/symlink/identidade; web: entrada visível sem abrir | Parcial; sem recuperação assistida |
| PUB-001/002, EDT-013 | WR-0A-07 | server.mjs | HTTP: criar→escrever→snapshot→restaurar→reabrir→exportar md/txt | Fluxo coberto; requisitos continuam parciais |
| Segurança local | WR-0A-05/08 | server.mjs, LOCAL_API.md | HTTP: Host/Origin, JSON/tamanho em bytes, métodos/formatos, erros sem caminhos | Cenários cobertos; sem autenticação completa |
| Integridade de arquivo | WR-0A-05 | core.mjs | storage: saves simultâneos completos, falha no rename limpa só temporário próprio | Parcial; sem garantia de crash |

Total atual: **37 testes**: 8 core, 10 regressão, 9 HTTP real, 2 storage e 8 UI simulada. A contagem de 22 acima é histórica, referente à primeira etapa. Nenhuma release nova emitida. ADR-0006 registra decisões transitórias; ADR-0002 continua como próxima entrega.

Regressão adicional: `documents` em array e datas inválidas são rejeitados pelo core antes da gravação; HTTP verifica que timestamp inválido não derruba a biblioteca.

## Terceira etapa — prova isolada de storage

| Requisito / capacidade | Trabalho | Módulo | Evidência executada | Estado |
|---|---|---|---|---|
| Integridade / EDT-002 | WR-0B-01/04/09 | storage-spike/repository.mjs + schema.sql | CAS monotônico A→B→A, idempotência/reabertura, rollback por falha SQL | Provado no adapter; app não integrado |
| LIB-005 | WR-0B-05 | storage-spike/openRepository | Segundo escritor/processo bloqueado, leitor permitido, SIGKILL libera lock | Provado em Linux; clientes cooperantes |
| IMP-006 / SCR-002 | WR-0B-06 | backup/verifyBackup/restoreBackup | Backup com WAL, origem removida, restore novo e equivalência; corrupção/histórico/path traversal/sidecar rejeitados | Prova parcial; sem UI/retenção |
| Preservação e recovery | WR-0B-08 parcial | storage-spike.test.mjs | SIGKILL antes/depois de COMMIT, fonte/schema futuro e destino existente preservados | Não é teste de queda de energia ou todos os pontos de crash |

Total atual: **50 testes** (37 anteriores + 13 da prova), todos executados sem skip no Node 26.13.0/SQLite 3.54.0 Linux. Demonstração `npm run storage:demo` também executada. Requisitos continuam parciais; G1 não aprovado. Nenhum projeto do usuário migrado, nenhuma release emitida.

## Alpha.2 — interface e workflows integrados

| Requisito / capacidade | Código integrado | Evidência | Estado/limite |
|---|---|---|---|
| LIB-002/007 | workspace applyTemplate/updateSettings + biblioteca/settings | workspace.test, HTTP modelos/configuração, Firefox create/settings/reload | Modelos básicos e campos de projeto entregues; templates pessoais pendentes |
| STO-001/002, STR-003/004/008 | cards/outline/tree/shift/move/trash, API canônica | DOM mesma cena em vistas, Firefox cards/outline, regressões de ordem/lixeira | Integrado, sem drag-and-drop/undo estrutural |
| INS-001/002/003 | notas, label, keywords, target; search | workspace teste busca/metadados, HTTP persistência, Firefox notas/metas | Campos básicos; sem metadata arbitrário tipado/FTS |
| EDT-003/005/006/007/011 | manuscrito de leitura, referência, foco/tema/fonte, contagens | Firefox leitura/referência/tema/reload/mobile; DOM views | Painéis de leitura; rolagem e contagem aproximadas |
| EDT-013, STR-003 | comparação por trecho, restore, split com snapshot | workspace split Unicode/ordem/snapshot; HTTP CAS; Firefox versions/split | Sem diff palavra a palavra ou merge |
| IMP-001/005/007 | inspectImport/importText + modal preview | workspace CRLF/fence/limites/atomicidade; HTTP preview sem mutação; Firefox File | TXT/MD UTF-8; headings planos |
| PUB-001/002/003/005/007/008 | compilation/exportHtml + Publish Room | HTML escapado/omissões/pureza; HTTP md/txt/html; Firefox preview | MD/TXT/HTML textual e impressão do navegador; DOCX/ePub/PDF nativo não entregues |
| IMP-006 / SCR-002 | projectBackup/restoreProjectBackup + download/restore file | checksum/IDs/fonte, HTTP novo projeto; Firefox download e restore | JSON completo atual; sem assets externos/retenção automática |
| EDT-002 | draft local/retry/conflict/recovery download | DOM rascunho até ack; Firefox falha/conflito com snapshot | Sem revisão monotônica/lock no JSON; metadados recovery manual |
| Compatibilidade de interface | /api/status + gate frontend | DOM oldServer bloqueado; Firefox versão nova | Reinício necessário para processo antigo |

**Estado atual: 66 testes Node passaram, zero skips no ambiente validado; 19 verificações de fluxo em Firefox real passaram.** Detalhes e limites em PROGRESS. Versão local 0.1.0-alpha.2; não é v1.0 nem certificação de paridade com o manual.

## Alpha.3 — editorial, caderno e exportadores

| Requisito | Código integrado | Evidência | Estado/limite |
|---|---|---|---|
| EDT-010 | editorial.mjs + replace dialog/routes | 7 testes de preview/Unicode/seleção/CAS/atomicidade; HTTP e Firefox | Literal, sem regex; texto, não metadados |
| STO-004, INS-002 | notebook createEntity + ficha de Pesquisa | Tipos/escopo em testes; Firefox criação/edição/reabertura | Fichas textuais, sem relações tipadas |
| STR-005/006 / SCR-023 | collections CRUD + query/estado | Manual/dinâmica/remoção/backup em testes; HTTP CAS; Firefox referências e consulta salva | Sem ordenação alternativa livre/undo |
| STO-008 | scratchpad/capture routes/UI | Preservação da origem, CAS, backup e Firefox autossalvar/copiar/reabrir | Sem histórico diário; recuperação guarda cópia em Pesquisa |
| PUB-003 | book-export.mjs / DOCX | ZIP CRC e XML; download Firefox; abertura LibreOffice, PDF e texto conferidos | Texto/títulos/autor básicos, não fidelidade Word completa |
| PUB-003/007 | book-export.mjs / EPUB | ZIP CRC/mimetype/container/XML/manifest/spine/nav; download Firefox | **Experimental**: sem EPUBCheck/leitor real |
| IMP-006 | restoreProjectBackup | Coleções remapeadas e fichas/capturas preservadas | Referências conhecidas do schema atual |

**85 testes Node e 26 verificações de fluxo Firefox passaram**, mais validação externa de exports em `scripts/verify-book-exports.py`. Ambiente Linux; Word/Windows/macOS/EPUBCheck não validados. Desktop por último conforme instrução do usuário; não anunciar implantação nativa nem paridade integral.

## Alpha.4 — editor semântico

| Capacidade | Implementação | Evidência | Estado |
|---|---|---|---|
| EDT-001 / editor do manual | packages/editor, app.js | rich.test: schema/projeção/links/limites; Firefox digitação/marcas/listas/undo | Parcial: sem imagens/tabelas/estilos arbitrários |
| EDT-002, EDT-013 | rich-service, API, cópia local, snapshots | hash inclui formato, snapshot/restore; Firefox reabertura | Parcial: sem lock entre processos |
| Backup/migração | migration-backup.mjs, schema 2 | raw bytes/envelope/checksums, corrupção, backup falho impede save | Implementado para ativação visual; não é migrador geral de produção |
| PUB-001–002 | richHtml/richMarkdown, book-export | DOCX LibreOffice/PDF, EPUB XML, Firefox downloads | Parcial; EPUB experimental, listas DOCX visuais |
| SCR-001–084 | catálogo permanece backlog | 102 testes Node, 35 fluxos Firefox no total | Sem alegação de paridade integral |

ADR-0003 registra dependências/licenças e limites. Artefatos em PROGRESS.

## Alpha.5 — revisão ancorada

| Capacidade | Implementação | Evidência | Estado |
|---|---|---|---|
| EDT-009 / SCR-038 | Marcas comment/footnote, annotations.mjs, UI no inspetor | 12 testes de âncora/edição/limites/fragmentação/remapeamento/quebras/exports/snapshot/backup + Firefox real | Parcial: sem threads/conversão/rodapé nativo |
| SCR-030 | Busca por corpo/trecho e filtro de estado na cena | Firefox filtra e localiza anotação | Parcial: sem pesquisa global |
| EDT-002, EDT-013 | Hash de revisão e snapshots ricos | HTTP rejeita anotação obsoleta com texto idêntico; Firefox restaura e reabre | Parcial; sem revisão monotônica/lock |
| PUB / SCR-061 | Notas finais por cena, omissão de comentários, espera de preview antes de imprimir | DOCX LibreOffice/PDF, EPUB XML, todos exports unitários, conteúdo pronto ao chamar impressão | Parcial; sem paginação testada/EPUBCheck/Word nativo |

Baseline 102 → 115 testes Node; 41 fluxos Firefox no total. Artefatos/limites em PROGRESS e ADR-0009. Nenhuma paridade integral com o manual declarada.

## Alpha.6 — pesquisa com arquivos

| Capacidade | Implementação | Evidência | Estado |
|---|---|---|---|
| STO-009/010, SCR-012/013 | assets.mjs, attachment-service, Caderno/Anexos | 11 testes de formatos/limites/integridade/referências/backup; Firefox PNG/JPEG decodificados, texto literal e PDF download | Parcial: sem referências externas, OCR/PDF interno ou arquivos inline |
| Backup/migração / SCR-002/003 | Formato 3, backup antes de gravação, remapeamento de anexos | Uma migração 2→3 e dois HTTP novos; backup bloqueado impede save; Firefox download/restore/reload byte-a-byte | Parcial; não substitui storage de produção/lock |
| SCR-007 | Lixeira retém arquivo/referência | HTTP bloqueia download até restaurar; Firefox restaura | Sem exclusão permanente/GC |

Baseline 115 → 129 testes Node; 47 fluxos Firefox. Sem paridade integral com o manual. ADR-0010/PROGRESS registram custo do agregado, limites e artefatos sintéticos.

## Priorização urgente de UX/configurações — 2026-11-02

UX-URG-001–012: ações de biblioteca/documentos, arraste estrutural, fichas/pesquisa histórica, perfil do autor, central de backup e contas/destinos remotos. Auditoria estática da alpha.6 em apps/web e domínio; estado detalhado e critérios em ../roadmap/URGENT_UX_AND_SETTINGS.md. Não é implementação, conexão remota ou validação de novos fluxos. Resultados de testes anteriores não foram reutilizados para declarar esses itens entregues.

## Alpha.7 — UX-URG-001–004 (parcial)

| Capacidade | Implementação | Evidência | Limite |
|---|---|---|---|
| Ações de biblioteca / LIB, SCR-001/003 | library-service, API, menus e filtro de arquivados | 3 testes library + HTTP; Firefox editar/duplicar/backup/arquivar/restore | Sem exclusão definitiva; formato desconhecido não recebe escrita |
| Ações nas vistas / STR, SCR-006/007 | documentActions, duplicateDocument | 5 testes organização/duplicação; cena rica/anotações duplicadas e lixeira/restauração Firefox | Coleções não adicionam cópias automaticamente; limites de assets mantidos |
| Arraste e estrutura / STR-001/002, SCR-006 | Pointer Events, moveDocument/restoreStructure, hash | Firefox com mouse real, dentro/ordem, undo e Escape; HTTP conflito | Undo de sessão, sem multisseleção/touch real/lock entre processos |
| Livro longo privado autorizado | Cópia isolada de backup, dup/archive/undo | 17 verificações privadas, sem alteração de texto/rico/anexos/origem | Não são fixtures públicas nem cobertura completa de plataformas |

Baseline 129 → 139 testes Node; 56 fluxos Firefox. ADR-0011/PROGRESS. Perfil/pesquisa/backup locais pendentes; cloud foi explicitamente adiado até imediatamente antes do desktop.

## Escopo profissional documentado — 2026-11-02

| Família existente | Nova especificação/tarefas | Estado |
|---|---|---|
| EDT-014 e snapshots/revisão | PRO-006–011: diff lado a lado, propostas/aceite/camadas, workspace editorial | Planejado; comentários/snapshots atuais não são redline |
| SYN-001–003 e permissões | PRO-012–017 e 025–027: grants, projeção, chaves/identidade, pacote, devolutiva, online | Planejado; pacote primeiro confirmado pelo usuário |
| PUB-004/006 | PRO-018–021: sessão separada, paratextos, pacote e envio explícito | Planejado; preview atual não é sessão editável |
| AI-001–004 | PRO-022–024: orientação/contexto por obra, conexão/segredos e sugestões | Planejado; sem provedor/API conectado |
| Tipos/modelos/perfil/pesquisa | PRO-001–005 e UX-URG-005–009 | Planejado além das capacidades parciais da alpha.7 |

Documentos: PROFESSIONAL_EDITORIAL_WORKSPACE.md, PROFESSIONAL_EDITORIAL_ROADMAP.md, EDITORIAL_SHARING_AND_AI.md e ADR-0012. 14 critérios PRO-AC propostos; nenhuma evidência de execução de novos recursos. A suíte registrada de 139 testes não certifica criptografia/colaboração/IA futuras.

## Alpha.8 — fundação profissional local (parcial)

| Capacidade | Implementação | Evidência | Limite |
|---|---|---|---|
| PRO-001/002, modelos | project-catalog/applyTemplate, UI Novo projeto | 16 modelos testados e roteiro histórico criado no Firefox | Estrutura/editor geral, sem engines/exportadores especializados |
| PRO-003 / UX-URG-008 | profile.mjs + APIs separadas + UI | Persistência/conflito/backup/symlink; Firefox save/clear/restore/pseudônimo | Perfil sem autenticação/cifra/lock entre processos |
| PRO-004 / UX-URG-005–007 | research-schema/research, fontes/atalhos/backlinks | URL/date/refs/hash, remapeamento/duplicação; Firefox três vínculos/notas preservadas | Sem cronologia tipada/retratos/OCR/histórico bibliográfico |
| Migração e compatibilidade | source 1/2/3→4, maior formato preservado | HTTP backup indisponível impede save, private book 3→4/restauração | Não é migrador geral de produção |

Baseline 139 → 151 testes Node; 62 fluxos Firefox; caso privado separado com 20 verificações. Exports mantidos, sem EPUBCheck. ADR-0013/PROGRESS. Não usar esses resultados como evidência de E2EE/IA/redline/protocolo remoto futuro.

## Alpha.9 — UX-URG-009 / PRO-005 parcial

| Capacidade | Implementação | Evidência | Limite |
|---|---|---|---|
| Cópias locais gerenciadas | backup-center, rotas e UI | Sete testes store: criação/verify/restore, corrupção, retenção, symlinks, limites, configuração | 32 MB, sem cifra/backup externo garantido |
| Rotina configurável | Timer server, fila central→projeto, estado/CAS e deduplicação | Quatro HTTP incluindo temporizador real sem browser; Firefox executar/persistir/erro/filtro | Exige servidor ativo, sem lock entre processos/agendador OS |
| Recuperação de obra | Verify antes de restore/download, remapeamento existente | Firefox restaura geração anterior e bloqueia corrompida; livro longo privado restaurado | Não inclui perfil/contatos ou rascunhos só do browser |

Baseline 151 → 162 testes Node; 69 fluxos Firefox; caso privado com 23 verificações. ADR-0014/PROGRESS. G1 permanece parcial; não certificar crash de todas plataformas/E2EE/sync.

## Aparência alpha.10 — 2026-11-02

Galeria de aparência alpha.10: **20 opções** no botão **◐** ou em **Configurações → Temas e aparência**. Inclui WritingRoom claro/escuro, Windows 10/11 claro/escuro, Office 365 claro/escuro, Office 2010 claro, retrô, GNOME 50 claro/escuro, macOS claro/escuro, KDE Plasma 6 claro/escuro, WordStar 4, DOS colorido, Cores divertidas e Adaptar ao sistema.

Selecione para experimentar; **Aplicar tema** confirma, **Cancelar/Escape** restaura. A preferência fica neste navegador, separada dos projetos e backups; preferências antigas claro/escuro são reconhecidas. Adaptar ao sistema acompanha `prefers-color-scheme`, usando WritingRoom claro/escuro. São interpretações visuais originais, com fontes locais; os temas de terminal não emulam atalhos ou formatos antigos. A aparência não altera o conteúdo do manuscrito. Impressão tem estilo de papel claro.

Implementação: themes.js, appearance.js, themes.css e diálogo da interface; ADR-0015. Evidência: 166 testes Node e 74 grupos Firefox. Sem alteração do formato de projeto.

## Tradução e idiomas — alpha.11 (2026-11-02)

A alpha.11 acrescenta **Tradução** em todos os projetos e quatro modelos em **Novo projeto → Tradução — livro/artigo/documento/outros textos**. Crie trechos com original e idioma de destino, escreva lado a lado, acompanhe estados e exporte revisão bilíngue MD. Originais e glossário ficam em Pesquisa e fora da publicação; backups preservam os vínculos. Alterar o texto original reabre traduções concluídas para Revisão.

**Dicionário e idiomas** oferece verbetes pessoais (definição, sinônimos, equivalentes, contexto e fonte), busca no glossário e em trechos traduzidos, exportação MD e links explícitos de consulta externa. O glossário funciona offline por obra; **não há base lexical completa offline ou tradução automática integrada**. Nenhuma cena é enviada automaticamente. Veja [especificação de tradução e idiomas](../specifications/TRANSLATION_AND_LANGUAGE_TOOLS.md) para limites e evolução.

Implementação: translation.mjs, project-catalog.mjs, workspace.mjs, API translation/glossary/bilingual e interface. ADR-0016. Sem schema novo; backup antes da migração para fontes schema 4.

Evidência alpha.11: 174 testes Node sem falhas/skips e 84 grupos Firefox no smoke amplo e 3 verificações móveis em perfil próprio. Revisão reaberta após original alterado, estado sincronizado e conflitos rejeitados sem alteração. Não inclui nova validação do manuscrito privado.

## Pesquisa de anexos e idiomas — alpha.12 (2026-11-02)

A alpha.12 permite guardar qualquer tipo de anexo como original para download e **extrair texto de PDF, Word DOCX, ODT, TXT e Markdown** no projeto. Em **Caderno → Anexos → Abrir → Extrair texto / pesquisar / traduzir**, revise a prévia ou selecione um trecho e crie pesquisa vinculada ou original de tradução. Arquivos sem extrator aceitam transcrição manual; não há OCR ou execução de anexos.

**Dicionário e idiomas** ganhou consulta offline às bases MyThes pt/en instaladas, importação/exportação de base lexical JSON compartilhada e conector LibreTranslate com autorização de envio, prévia e confirmação separadas. Tradução automática precisa de um serviço configurado; não há motor neural incluído. Credenciais ficam no processo do servidor, fora das obras. Definições/traduções offline dependem da base importada, sem alegação de dicionário universal pré-instalado.

ADR-0017 e ATTACHMENT_RESEARCH_TRANSLATION_ANALYSIS.md detalham a hipótese implementada, matriz de formatos, limites, fontes lexicais, dependências locais e contrato LibreTranslate. Schema 3/4 preservado; novos tipos de anexo exigem esta versão para leitura. Desktop por último.

## Comparação editorial — alpha.13 (2026-11-02)

A alpha.13 entrega **Versões → Comparar duas versões lado a lado**: escolha dois snapshots ou o texto atual no disco, inverta os lados, veja linhas inseridas/removidas e filtre somente alterações. Navegue pelas diferenças e carregue mais linhas quando necessário. Em telas estreitas, os lados ficam empilhados. Comparação é somente leitura; restauração continua no fluxo existente com preservação da versão anterior.

A análise é textual. Diferenças de formatação/anotações são avisadas, sem diff visual detalhado. Trechos grandes usam comparação simplificada identificada, com contagens aproximadas; texto não é descartado. Alterar as seleções pede nova consulta. Isto entrega comparação de versões; propostas de redline e aceitar/rejeitar continuam como a próxima etapa.

ADR-0018; PRO-006 comparação textual entregue com limites explícitos. Evidência: 193 testes Node, 85 fluxos Firefox amplos e 4 focados. Caso privado: 103 comparações em cópia restaurada, sem alterar originais. Sem promoção dos gates de redline, autenticação, criptografia ou desktop.

## Revisão editorial local — alpha.14 (2026-11-02)

A alpha.14 acrescenta **Revisão** e **Propor alteração**: selecione texto na cena ou no original de leitura do diálogo, informe autor/papel (Escritor/Editor), substituição e justificativa. O painel mostra original riscado e proposta sublinhada; guardar não altera o manuscrito. Aceitar preserva versão anterior e registra a decisão; rejeitar mantém o texto. Filtros distinguem estado/papel e o histórico acompanha backup/restauração.

O aceite é bloqueado se texto/formatação mudou; atualize a lista e faça nova proposta sobre a base atual, ou rejeite a antiga. A primeira proposta migra a obra para **formato 5**, somente após backup integral verificado. A identificação é local e declarada, sem autenticação, compartilhamento ou permissões remotas. No editor visual, as propostas são limitadas a trechos de um bloco, sem novas quebras ou inserção em cursor vazio.

ADR-0019. 205 testes Node, 85 fluxos Firefox amplos e 9 focados; caso privado em cópia restaurada. PRO-007–011 parcialmente atendidos: propostas/decisões locais com CAS e snapshot, sem autenticação, permissões por usuário, rastreamento automático ou colaboração remota. Desktop por último; nuvem imediatamente antes.
