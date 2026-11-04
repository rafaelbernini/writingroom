# WritingRoom — estúdio local de escrita · 0.1.0-alpha.20

## Preparação online — recuperação testemunhada no HTTPS/Firefox (2026-11-04)

**390 testes Node aprovados, sem falhas/skips**, incluindo **7 novos de integração HTTPS**, e **52 verificações Firefox novas de recuperação**. Node `/tmp/writingroom-recovery-https-final-node.log`; isolado `/tmp/writingroom-recovery-https-isolated-node.log`; browser `/tmp/writingroom-browser-k9j45auj/report.json`. As 118 verificações Firefox anteriores não foram reexecutadas nesta etapa; a suíte nova é dedicada à recuperação.

ADR-0038: fixture HTTPS/OIDC de um subject usa o wrapper/witness. Candidato gera privada não extraível no Firefox; preparação, aprovação e compromisso permanecem em pipes privados, sem rota pública de recovery/bootstrap/pin. Witness confirmado bloqueia imediatamente o runtime antigo; ativação explícita troca para diretório/diário vazios na mesma origem. Cookies, callback pendente, chaves e recibos de domínios antigos são recusados. Login novo exige posse nova por sessão; projetos/grants não são herdados. Reconciliação privada identifica destino confirmado após reconhecimento perdido. Reinício reabre bancos, preserva epoch/domínios e exige login/posse. UI alpha.20/studio-19 e arquivos privados preservados.

**Próximo: contrato e prova sintética de isolamento da confiança por subject para múltiplas contas/dispositivos**, sem redefinir outras identidades durante recuperação. A fixture nova é de um subject e um ciclo por execução; a fixture OIDC multi-identidade anterior continua separada. Independência operacional do witness, custódia/rotação da autoridade e recuperação de privadas permanecem gates. Rollback conjunto do witness e diretório local continua limite demonstrado; sem conteúdo real/E2EE/v4 ou implantação liberados.

## Preparação online — recuperação e confiança testemunhada (2026-11-04)

**383 testes Node aprovados, sem falhas/skips**, incluindo **19 novos de recuperação/witness**. **118 verificações Firefox anteriores reexecutadas e aprovadas**: 53 OIDC/operações, 38 posse e 27 cookies; **não são teste browser da recuperação nova**. Node `/tmp/writingroom-recovery-final-node.log`; isolado `/tmp/writingroom-recovery-isolated-node.log`; OIDC `/tmp/writingroom-browser-0fi3y6_7/report.json`; posse `/tmp/writingroom-browser-frkvgpu4/report.json`; cookies `/tmp/writingroom-browser-3j_yjljg/report.json`.

ADR-0037: prova isolada de um subject por âncora. Witness SQLite separado registra sequência/epoch, checkpoint público do diretório e pin de autoridade de reconferência. Wrapper recusa rollback/substituição e bloqueia divergência após falha/SIGKILL entre commits. Reconferência assinada pelo controle independente sintético exige fingerprints explícitas e posse de chave nova; troca para diretório/diário novos, vazios, sem herdar grants ou reativar restore suspenso. Sessão recusa diretório novo com diário antigo e exige posse por sessão. Sem recuperação de privadas, e-mail real, manuscrito ou mudança da UI alpha.20/studio-19.

**Limite demonstrado:** rollback conjunto do diretório e do witness local pode reaceitar estado antigo. A proteção exige witness/autoridade realmente independentes; isso ainda é gate de produção, não resolvido por guardar outro arquivo no mesmo domínio de ataque.

**Próximo: integrar wrapper/witness a fixture HTTPS dedicada de um subject e validar reconferência no Firefox**, com bootstrap/aprovação só por controle privado, troca de domínios e invalidação de sessões/recibos antigos. Fixture OIDC padrão ainda não usa esse wrapper. Multiusuário, custódia/rotação da autoridade e independência operacional real permanecem gates; sem E2EE/v4 ou conteúdo real.

## Preparação online — idempotência e reconciliação (2026-11-04)

**364 testes Node aprovados, sem falhas/skips**, incluindo **16 novos de operações + 2 HTTPS**. **118 verificações Firefox aprovadas nesta etapa: 53 OIDC/operações (12 a mais), 38 ciclo anterior e 27 cookies**. Node `/tmp/writingroom-operations-final-node.log`; operações isoladas `/tmp/writingroom-operations-unit-node.log`; Firefox operações `/tmp/writingroom-browser-r64415to/report.json`; ciclo anterior `/tmp/writingroom-browser-txm3qpyd/report.json`; cookies `/tmp/writingroom-browser-lb4m48m4/report.json`.

ADR-0036: novas rotas protegidas de contexto/execute/reconcile vinculam operationId, pedido canônico, subject/dispositivo/binding e domínios do diário/diretório. Mutação e recibo no mesmo evento SQLite; primeira operação promove só o diário sintético a user_version 2. Retry explícito não duplica convite/grant/revogação; recibo histórico não renova acesso. Convite devolve token só uma vez: resposta perdida exige reconciliar, revogar explicitamente aquele convite e criar outro ID se necessário, sem recuperar segredo do banco. Testes de processos/SIGKILL antes e depois do commit, sessão/posse/revogação/reinício/restore suspenso e perda real de resposta no Firefox. Continua sem transação distribuída ou defesa contra rollback hostil do filesystem. UI alpha.20/studio-19, obras e pacotes preservados; sem manuscrito privado ou conta real.

**Próximo: contrato e prova sintética de recuperação/reconferência de dispositivos e confiança**, cobrindo substituição e rollback de estado antigo sem reativar backup suspenso ou herdar pins por nome/e-mail. Operações legadas continuam sem idempotência retroativa; a garantia exige as novas rotas desde a primeira tentativa. E2EE/v4 e conteúdo real permanecem sujeitos aos gates de recuperação, diretório e revisão de segurança.

## Preparação online — OIDC no HTTPS e Firefox (2026-11-04)

**346 testes Node aprovados, sem falhas/skips**, incluindo **11 novos HTTPS**, e **41 verificações OIDC novas no Firefox**. Reexecutadas também **38 do ciclo integrado anterior** e **27 de cookies** (106 verificações Firefox nesta etapa). Node `/tmp/writingroom-oidc-https-final-node.log`; HTTPS isolado `/tmp/writingroom-oidc-https-isolated.log`; OIDC `/tmp/writingroom-browser-5bwcxj3f/report.json`; ciclo anterior `/tmp/writingroom-browser-6e324228/report.json`; cookies `/tmp/writingroom-browser-5w0k052m/report.json`.

ADR-0035: dois servidores HTTPS restritos a 127.0.0.1, com issuer localhost e RP 127.0.0.1. Identidade e autorização preparadas somente por pipes privados; redirects e token endpoint são reais, com CA/host TLS verificados, prazo total e PKCE. Callback exige documento/top-level GET e vínculo de prelogin; sucesso limpa URL por 303, remove prelogin e disponibiliza CSRF em resultado de sessão de uso único. Origin/CSRF permanecem estritos nas mutações. Login continua exigindo posse e escopo; revogação/reinício exercitados. Sem conta/e-mail real, manuscrito privado, mudança da UI ou dependência nova. Aplicativo alpha.20/studio-19.

**Próximo: contrato e implementação sintética de idempotência/recibos/reconciliação entre diário e diretório**, incluindo resposta perdida após compromisso, retry explícito e revogação atual. O lock de admissão não é transação distribuída. Recovery/reconferência e resistência a substituição/rollback hostil continuam gates antes de conteúdo real/E2EE/v4. OIDC de fixture em memória e no HTTPS/browser está entregue; não equivale a provedor de produção.

## Preparação online — contrato OIDC e fixture (2026-11-04)

**335 testes Node aprovados, sem falhas/skips**, incluindo **22 novos de OIDC**. Completo `/tmp/writingroom-oidc-final-node.log`; isolado `/tmp/writingroom-oidc-isolated-node.log`. Firefox não reexecutado nesta etapa: 38 verificações integradas/27 de cookies da ADR-0033 são evidência anterior e **não cobrem OIDC**.

ADR-0034: provedor/adaptador exclusivamente em memória, Authorization Code + PKCE S256, cookie de prelogin vinculado ao navegador, issuer/redirect/state/nonce estritos e JWT ES256 verificado por `jose` 6.2.15 (devDependency exata, MIT). Conta por issuer/sub, nunca por coincidência de e-mail; claims `@example.invalid` são sintéticos. Revalida logout/revogação/epoch/suspensão/prazo durante awaits; login ainda exige posse e escopo. Sem integração à UI/HTTPS, conta real, rede OIDC ou manuscrito privado. Aplicativo permanece alpha.20/studio-19.

**Próximo: adaptar HTTPS de fixture e validar redirects/callback/cookies OIDC no Firefox**, mantendo escolha de identidade em controle privado e Origin estrita nas mutações. Depois idempotência/recibos/reconciliação entre diário/diretório, recovery e reconferência. Contrato/prova em memória estão entregues; não anunciar e-mail autenticado ou E2EE de produção.

## Preparação online — ciclo integrado no Firefox (2026-11-04)

**313 testes Node aprovados, sem falhas/skips**, **38 verificações novas do ciclo integrado no Firefox** e **27 de cookies reexecutadas**. Log Node `/tmp/writingroom-combined-final-node.log`; ciclo `/tmp/writingroom-browser-08510kbe/report.json`; cookies `/tmp/writingroom-browser-b8fal6sm/report.json`.

ADR-0033: login sintético → posse por sessão → convite/escopo → revogação, incluindo sessão cruzada, desafio pendente e reinício do transporte com reabertura dos dois bancos. Recibos/vínculos persistem; cookies e prova de sessão não. Controlador e documento Firefox ficam vivos; não é recuperação de privadas ou crash de processo. Emissor/pins/revogação durável somente em pipes. Opções de script público e porta reutilizável exigem fixture explícita. Sem manuscrito privado, conta real, envio ou mudança da UI alpha.20/studio-19.

**Próximo: contrato OIDC detalhado e provedor/adaptador de fixture**, com issuer/audience/nonce/state/PKCE S256/redirect estritos, assinatura/prazos e replay. Depois idempotência/reconciliação entre bancos e recovery/reconferência. O ciclo combinado está concluído; não repeti-lo como próxima implementação. Não há login real/e-mail autenticado/E2EE liberados.

## Preparação online — sessão vinculada ao dispositivo (2026-11-03)

ADR-0032: modo sintético integrado exige desafio de posse na mesma sessão e vínculo durável atual antes de operar convites/escopo. Outra sessão não herda prova; revogação invalida sessão na próxima verificação. Diretório reservado durante dispatcher síncrono do diário, sem alegação de transação distribuída. Restore suspenso de qualquer componente bloqueia fluxo. Emissor/pins/revogação de chave seguem fora de rotas. Aplicativo preservado em alpha.20/studio-19.


## Preparação online — diretório durável de dispositivos (2026-11-03)

ADR-0031: pins/vínculos públicos assinados/revogações em SQLite separado, CAS global e ativação após prova de posse. Desafios são voláteis e invalidados no restart; vínculos e revogações persistem. Restore em domínio novo suspenso, sem reativar pins de backup antigo. Nove testes adversariais, sem privadas/manuscritos no banco. Próximo: ligar diretório a sessão/operação no serviço sintético. Aplicativo permanece alpha.20/studio-19.


## Preparação online — vínculo e posse de dispositivo (2026-11-03)

ADR-0030: identidade Ed25519 sintética pinada assina a pública X25519, subject/dispositivo/ID/prazo. Desafio HPKE de uso único exige posse antes da ativação; testa adulteração, revogação, substituição e corridas. Prova em memória, sem diretório/recovery duráveis ou e-mail real. Próximo: persistência transacional de confiança/revogação e proteção de restauração. Aplicativo permanece alpha.20/studio-19.


## Preparação online — HPKE offline (2026-11-03)

ADR-0029: biblioteca hpke 1.1.8 exata, MIT/sem dependências de execução, somente devDependency. Prova X25519/HKDF-SHA256/AES-256-GCM Base com vetores RFC/CFRG e envelope sintético separado, até 64 KiB. Testa destinatário, aleatoriedade, contexto, adulteração e intercâmbio Node/Firefox. Não autentica remetente, não bloqueia replay nem oferece diretório/E2EE de produção. Próximo: vínculo assinado de chave por dispositivo e prova de posse. Produto preservado em alpha.20/studio-19.


## Preparação online — cookies no Firefox (2026-11-03)

ADR-0028: 27 verificações reais de cookies/CSRF/origens em Firefox isolado, com CA restrita ao perfil NSS e validação TLS ativa. GET /session sem Origin só aceita Fetch Metadata same-origin. Documento constante de fixture opt-in; emissor permanece fora das rotas. SameSite verificado com controle positivo; outra origem no mesmo site também bloqueada por Origin. Secure foi enviado ao HTTP loopback neste ambiente, limite explicitamente registrado. Aplicativo permanece alpha.20/studio-19; sem login real ou integração com obras.


## Preparação online — transporte HTTPS isolado (2026-11-03)

ADR-0027: adaptador HTTPS em 127.0.0.1/porta efêmera, sem integração com o servidor do aplicativo. TLS temporário verificado; identidade emitida somente pelo controle privado do teste. Origin/Host/CSRF/cookies, allowlist JSON, limites, escopo durável, lock/replay/reinício exercitados em dez testes reais de requisição. Sem OIDC/e-mail/login real, manuscrito ou implantação. Aplicativo preservado em alpha.20/studio-19.


## Preparação online — diário durável sintético (2026-11-03)

ADR-0026: SQLite isolado para convites/concessões/recibos, com transações e reaproveitamento da política existente. Backup verificável; restore em domínio novo suspenso, sem reativar acesso ou restaurar sessões. Oito testes novos de concorrência entre processos, SIGKILL, rollback, escopo/revogação, corrupção e recuperação. Sem login real, HTTP, manuscrito ou serviço remoto; aplicativo permanece alpha.20/studio-19.


Na **alpha.20**, o modo Foco também mantém a leitura do Manuscrito. Escolha texto de 18, 21 ou 24 px para leitura; a preferência fica neste navegador e não muda o editor ou a publicação. Referência tem botão próprio de fechar no celular.

A **alpha.19 melhora o uso no celular**: mais espaço para escrever, ferramentas recolhíveis, navegação deslizante, leitura com margens confortáveis e painéis com fechamento acessível. Veja a [análise e validação móvel](docs/development/MOBILE_RESPONSIVENESS.md).

Histórico da preparação online — 2026-11-03: ADR-0025 e `session-harness.mjs` acrescentam state/código de uso único, rotação, CSRF/Origin, expiração, logout e revogação por dispositivo. Sete testes novos; transporte por chamadas em memória, sem OIDC, e-mail, HTTP, persistência ou mudança da interface alpha.18. Próximo: storage transacional de convites/grants/recibos, com concorrência e recuperação.


## Preparação do compartilhamento online

Revisão interna E1 e [contrato de identidade/autorização](docs/architecture/adr/0024-online-identity-and-authorization-contract.md) registrados. Prova isolada e sintética de convites/capacidades em `packages/sharing-spike`, sem autenticação real, rede ou persistência. O aplicativo atual é alpha.20; login e compartilhamento online ainda pendentes.


Biblioteca, escrita, planejamento e publicação em uma aplicação local, sem conta ou serviços externos obrigatórios. Esta é uma **alpha funcional**, com texto simples/Markdown, editor visual semântico opcional e armazenamento JSON. Não é ainda um aplicativo desktop de produção nem implementação integral do manual Scrivener.

## Abrir a versão atual

Requer Node.js 20+ para a aplicação. Instale as dependências exatas do lockfile na primeira execução: `npm ci --ignore-scripts`.

Se há um servidor antigo rodando, pare-o com **Ctrl+C** antes de iniciar:

```bash
npm run dev
```

Abra **http://127.0.0.1:4173** e recarregue a página. O cabeçalho identifica **ESTÚDIO · α20**. As abas **Escrever, Planejar, Caderno, Manuscrito, Revisão, Tradução e Publicar** aparecem dentro do projeto. Um aviso indica se o frontend novo ainda estiver conectado ao servidor antigo.

`npm run dev` e `npm start` geram primeiro o bundle local do editor. Após instalar as dependências, a aplicação funciona sem CDN. `npm run dev` reinicia o servidor ao alterar seus módulos. Para executar sem watch, use `npm start`.

## Tradução e dicionário

Na alpha.11 foi acrescentado **Tradução** em todos os projetos e quatro modelos em **Novo projeto → Tradução — livro/artigo/documento/outros textos**. Crie trechos com original e idioma de destino, escreva lado a lado, acompanhe estados e exporte revisão bilíngue MD. Originais e glossário ficam em Pesquisa e fora da publicação; backups preservam os vínculos. Alterar o texto original reabre traduções concluídas para Revisão.

**Dicionário e idiomas** oferece verbetes pessoais (definição, sinônimos, equivalentes, contexto e fonte), busca no glossário e em trechos traduzidos, exportação MD e links explícitos de consulta externa. O glossário funciona offline por obra; a alpha.11 não incluía base lexical completa offline ou tradução automática integrada; a alpha.12 adiciona bases importáveis e conector configurável (veja abaixo). Nenhuma cena é enviada automaticamente. Veja [especificação de tradução e idiomas](docs/specifications/TRANSLATION_AND_LANGUAGE_TOOLS.md) para limites e evolução.

## Temas e aparência

Galeria de aparência alpha.10: **20 opções** no botão **◐** ou em **Configurações → Temas e aparência**. Inclui WritingRoom claro/escuro, Windows 10/11 claro/escuro, Office 365 claro/escuro, Office 2010 claro, retrô, GNOME 50 claro/escuro, macOS claro/escuro, KDE Plasma 6 claro/escuro, WordStar 4, DOS colorido, Cores divertidas e Adaptar ao sistema.

Selecione para experimentar; **Aplicar tema** confirma, **Cancelar/Escape** restaura. A preferência fica neste navegador, separada dos projetos e backups; preferências antigas claro/escuro são reconhecidas. Adaptar ao sistema acompanha `prefers-color-scheme`, usando WritingRoom claro/escuro. São interpretações visuais originais, com fontes locais; os temas de terminal não emulam atalhos ou formatos antigos. A aparência não altera o conteúdo do manuscrito. Impressão tem estilo de papel claro.

## O que está disponível na interface

- Biblioteca com menu por projeto: editar dados/renomear, duplicar, baixar backup, arquivar e restaurar na lista Arquivados. Arquivar preserva a pasta inteira; não é exclusão permanente.
- Biblioteca com 20 modelos: vazio, romance, conto, novela, não ficção, artigo/reportagem, artigo científico, tese, roteiro audiovisual, teatro, quadrinhos, poesia, antologia, podcast, narrativa interativa, técnico/educacional e tradução de livro/artigo/documento/outros textos. Preset histórico opcional cria pastas de fontes, cronologia, documentos e rascunhos; são estruturas editáveis, sem motores especializados de roteiro/layout/citações. Configurações de nome, autor, descrição, idioma do manuscrito e meta.
- Menus diretos na árvore, cartões, outline, leitura, fichas e anexos para abrir/renomear/duplicar/mover e lixeira. Pastas podem ser recolhidas. Alças ⋮⋮ permitem arrastar para ordenar ou entrar em pasta; botões continuam disponíveis. Desfazer organização reverte a última movimentação da sessão, se a estrutura não mudou.
- Estrutura de manuscrito/pesquisa, pastas e cenas, mover/reordenar e lixeira com restauração individual.
- Editor visual opcional com negrito/itálico/sublinhado/riscado, títulos, listas, citações, código, links e desfazer/refazer; versões e exports preservam a formatação suportada.
- Comentários privados e notas vinculadas a trechos visuais; editar, localizar, resolver/reabrir, buscar e excluir com versão anterior. Notas são publicadas ao fim da cena; comentários ficam no projeto/backup.
- Editor de texto simples com botões de sintaxe Markdown, fonte ajustável, foco, galeria de temas, rolagem de máquina de escrever aproximada e referência de leitura lateral.
- Inspetor com sinopse, notas, status, etiqueta, palavras-chave e meta da cena; busca inclui texto, sinopse, notas e keywords.
- **Planejar:** cartões e outline dos mesmos documentos, filtros por pasta/estado e reordenação por botões.
- **Perfil do autor:** nome civil, pseudônimo e contatos privados, com backup/restauração próprios. Nome de publicação só entra na nova obra por escolha explícita; contatos permanecem fora do backup do livro.
- **Caderno → Fontes:** referências com URL/autoria/acervo/data/classificação, vínculos a cenas/fichas/anexos e backlinks no inspetor. Links externos não são carregados automaticamente; pesquisa não entra na publicação. Atalhos para personagem, cenário e rascunho de pesquisa.
- **Caderno → Anexos:** arquivos locais com prévia e confirmação, extração PDF/DOCX/ODT/TXT/MD, pesquisa/tradução vinculadas e download do original. Lixeira preserva bytes; backup inclui os arquivos.
- **Caderno:** fichas de personagens, lugares, objetos, organizações, eventos e conceitos; coleções manuais e consultas salvas; capturas que podem virar cenas sem apagar a origem.
- **Buscar/substituir:** prévia por ocorrência, escopos cena/manuscrito/projeto, palavra inteira e case; seleção individual, snapshots e rejeição atômica se o texto mudou.
- **Manuscrito:** leitura contínua das cenas incluídas, com acesso à edição de cada cena.
- Versões nomeadas, leitura, comparação por trecho alterado e restauração que preserva o texto atual. Dividir cena no cursor com snapshot anterior.
- Importação TXT/Markdown UTF-8 com preview, divisão opcional por headings e relatório de limitações; nunca modifica o arquivo de origem.
- **Publicar:** preview de texto simples, sumário, contagens/omissões, exportação Markdown/TXT/HTML, **DOCX básico**, **EPUB experimental** e impressão/salvar PDF pelo navegador.
- **Central de backup local:** criar/verificar/baixar/restaurar cópias no destino do servidor, histórico por obra e rotina opt-in com intervalo/retenção. Funciona com servidor ativo, mesmo sem browser; manuais/migrações não são removidas pela retenção.
- Backup JSON com checksum de todo o projeto atual e restauração em **novo projeto**, sem substituir os existentes.
- Texto local de recuperação, retry e resolução explícita de conflito com snapshot do texto do disco. Download de recuperação inclui o estado local do projeto.

Anotações exigem seleção no editor visual: use **Comentar** ou **Nota** e consulte **Revisão do trecho** no inspetor. O painel busca no corpo e no trecho da cena. Notas são reunidas ao fim de cada cena; não são rodapés nativos do Word. Apagar o trecho inteiro apaga sua anotação; undo/versões recuperam ambos. Backup contém também os comentários privados.

Perfil local fica em `./writingroom-projects/.settings/author-profile.json` (ou sob `WRITINGROOM_HOME`), separado de cada obra. Arquivo não criptografado com permissões privadas na criação; **não é conta/autenticação**. Baixar/restaurar perfil é ação própria, com seus contatos; guarde essa cópia conscientemente.

## Dados e limites

Projetos ativos ficam em `./writingroom-projects/<uuid>.wroom/project.json`; arquivados em `./writingroom-projects/.archived/<uuid>.wroom/`. O filtro Arquivados permite restaurá-los. Abrir a versão nova não migra nem regrava os projetos. Campos novos são opcionais; faça uma cópia independente da pasta antes de experimentar com material importante.

**Ativar editor visual** é uma ação explícita por cena: preserva snapshot e, na primeira conversão, copia e verifica o projeto completo em `./writingroom-backups/<projeto>/<backup>/` antes de gravar schema 2. Abertura e edição textual não convertem schema 1. Versões antigas não devem editar schema 2; voltar uma cena a texto não rebaixa o projeto. O backup contém `project.json` original, `backup.json` restaurável pela biblioteca e manifesto com checksums. Configure o destino com `WRITINGROOM_BACKUP_HOME`; por padrão é irmão da pasta de projetos. Para reverter ao formato anterior, preserve o projeto novo e use uma cópia separada do original verificado.

**Importar o primeiro anexo** eleva formatos 1/2 para 3 após backup integral verificado, mantendo formatos superiores existentes. Versões anteriores rejeitam formato 3; não rebaixe o número manualmente. Os bytes ficam incorporados no JSON, uma solução transitória com custo de memória/IO e sem dependências novas. PDFs são armazenados/baixados, sem execução ou leitor interno; verificação estrutural não é sanitização de conteúdo. Abrir um projeto não migra.

**Guardar a primeira fonte vinculada** eleva formatos 1/2/3 para **4**, após backup integral verificado. Versões anteriores rejeitam esse formato; edição visual/anexos não o rebaixam. Metadados do modelo em projetos novos não reestruturam projetos antigos.

Não edite o mesmo projeto por dois **processos servidores/CLI**. A fila atual protege requests da mesma instância; hash impede sobrescrita de texto desatualizado nessa instância. Falha de energia, falta de disco e exclusividade entre processos ainda não têm garantia de produção. localStorage não é backup externo e pode ser apagado pelo navegador. Metadados com falha ainda exigem download de recuperação antes de recarregar.

Importação: até 1,5 MB e 200 cenas por arquivo. Títulos viram cenas na mesma pasta; não há reconstrução de hierarquia rica. Backup/restauração pela UI: até 32 MB; inclui os campos, textos e anexos incorporados no JSON, sem depender de arquivos externos. Anexos: 8 MB/arquivo, 16 MB de bytes/projeto, até 100 arquivos e projeto com anexos até 30 MB serializado. PNG estático e JPEG até 10000 px/eixo e 25 megapixels; texto UTF-8. Prévia de texto importado mostra 4000 caracteres e leitura até 200 mil; download preserva o conteúdo completo. Checksum detecta corrupção, não autentica a origem. Guardar download em outro dispositivo/local é responsabilidade do usuário.

Não estão prontos: rodapés nativos Word, threads de revisão, imagens inline/tabelas, leitor PDF interno, importação Scrivener/DOCX/RTF, exportação avançada de estilos/imagens/footnotes em DOCX/ePub e PDF nativo, inglês completo da interface/dicionários próprios, instaladores Tauri, sync, colaboração, IA ou plugins. Idioma editorial configura o corretor do navegador, conforme seus pacotes. Cenas textuais continuam literais: não há interpretação automática de Markdown. Cenas visuais usam o documento semântico.

## Central de backup local

Abra **Central de backup** na biblioteca, em Publicar ou nas configurações do projeto. O download JSON anterior continua disponível. A central grava cópias verificadas no servidor, restaura sempre como outro projeto e mantém histórico de até 200 gerações por filtro. Cópias até 32 MB, sem perfil/contatos; não são cifradas.

Padrão: `./writingroom-backups/managed/`, ou `managed` dentro de `WRITINGROOM_BACKUP_HOME`. Destinos adicionais podem ser configurados antes de iniciar o servidor com `WRITINGROOM_BACKUP_DESTINATIONS`, um objeto JSON de ID para pasta absoluta. Por exemplo, em Bash:

```bash
WRITINGROOM_BACKUP_DESTINATIONS='{"local":"/caminho/backup-local","externo":"/caminho/disco-externo/writingroom"}' npm run dev
```

A UI seleciona destinos já configurados; não envia paths arbitrários. Destinos dentro de uma pasta de projeto `.wroom` são recusados. Mantenha o ID escolhido configurado até mudar a seleção na central. Remover um destino da configuração não apaga as cópias. Escolher uma pasta no mesmo dispositivo não oferece proteção contra falha desse dispositivo.

A rotina vem **desligada**. Depois de ativar/salvar, verifica todos os projetos ativos disponíveis em intervalos de 15 min a 24 h, com retenção de 2–50 automáticas por obra. Só copia estado confirmado no servidor; rascunhos exclusivos do navegador continuam na recuperação local. Sem alterações, verifica a cópia anterior e reaproveita. Retenção só remove automáticas verificadas depois de uma nova cópia válida; manuais, migrações, corrompidas e incompletas são preservadas. Não funciona com o servidor fechado e não substitui agendador do sistema/backup externo.

## Verificação

```bash
npm test
```

A suíte usa dados sintéticos, diretórios temporários e HTTP somente em loopback. Prova SQLite exige Node com `node:sqlite`; seus testes indicam skip quando indisponível. No Node 26 validado, todos foram executados.

Para o teste de interface real, requer Firefox e Python 3.9+, sem bibliotecas extras:

```bash
python3 scripts/verify-studio-firefox.py
python3 scripts/verify-reviews-firefox.py
python3 scripts/verify-editor-perspective-firefox.py
python3 scripts/verify-editorial-package-firefox.py
python3 scripts/verify-editorial-identities-firefox.py
python3 scripts/verify-editorial-rounds-firefox.py
```

O script usa perfil, projetos e downloads próprios em `/tmp`, gera capturas e encerra somente os processos que criou. Não utiliza seu perfil Firefox. Em sandbox, pode exigir permissão para loopback e executar navegador.

## Validação de arquivos de livro

`python3 scripts/verify-book-exports.py` verifica ZIP/XML, metadados e estrutura do EPUB e abre um DOCX sintético no LibreOffice headless para converter/extrair texto do PDF. Exige Python, LibreOffice e pdftotext **apenas para esta validação**, não para exportar no app. Usa perfil e arquivos temporários.

DOCX exporta texto, títulos, autor, notas finais por cena e formatação visual suportada; listas usam marcadores visíveis, sem numeração semântica do Word. Markdown de cenas textuais permanece literal. EPUB está explicitamente experimental: EPUBCheck não foi executado. Não há promessa de fidelidade completa a Word/EPUB ou acessibilidade final. Na alpha.18 foram executados 243 testes Node e 139 fluxos Firefox (85 amplos, 9 revisão, 11 Editor, 11 v1, 11 chaves/v2, 12 rodadas).

## Ordem de evolução

**Recursos locais primeiro; Google, Drive, OneDrive e Dropbox somente na última etapa antes do desktop**, conforme instrução mais recente do usuário. **Desktop por último**. Primeiro completar e validar os recursos editoriais, organização, interoperabilidade, idiomas e durabilidade na aplicação atual; só depois empacotamento/instaladores. Não haverá conversão automática dos projetos reais para experimentar essas mudanças.

## Prova SQLite separada

[storage-spike](packages/storage-spike/README.md) prova revisões monotônicas, lock cooperante e backup/restauração. `npm run storage:demo` usa dados sintéticos em pasta temporária. **Ainda não é o armazenamento da interface atual.**

## Planejamento profissional

Modo Editor, redline com comparação lado a lado, compartilhamento criptografado, sessão de submissão e IA por projeto estão [especificados para evolução](docs/specifications/PROFESSIONAL_EDITORIAL_WORKSPACE.md). Modo Editor local, propostas e comparação estão entregues com limites abaixo; pacote offline por frase secreta tem primeiro incremento na alpha.16; a alpha.18 acrescenta rodadas/devolutivas offline assinadas. Autenticação remota, sessão de submissão e IA continuam pendentes. O catálogo básico de tipos/modelos, perfil local e fontes vinculadas já estão na alpha.8. O fluxo escolhido começa pelo pacote criptografado e depois acesso online por convite/e-mail. [Roadmap](docs/roadmap/PROFESSIONAL_EDITORIAL_ROADMAP.md) e [segurança proposta](docs/security/EDITORIAL_SHARING_AND_AI.md).

## Documentação

- [Guia para usar a nova interface](docs/development/USING_STUDIO.md)
- [Progresso e evidências](docs/development/PROGRESS.md)
- [Decisão da entrega visível](docs/architecture/adr/0007-visible-studio-increment.md)
- [Central de backup: decisão e limites](docs/architecture/adr/0014-local-backup-center.md)
- [Catálogo, perfil e fontes](docs/architecture/adr/0013-project-catalog-profile-and-research.md)
- [Ações de biblioteca e organização](docs/architecture/adr/0011-library-and-organization-actions.md)
- [Fila urgente e pendências](docs/roadmap/URGENT_UX_AND_SETTINGS.md)
- [Decisão e limites de anexos](docs/architecture/adr/0010-local-research-attachments.md)
- [API e limites de segurança](docs/security/LOCAL_API.md)
- [Especificação](docs/specifications/writingroom_SPEC_v1.0.md) e [catálogo do manual](docs/specifications/SCRIVENER_CAPABILITY_MAP.md)
- [Próximas etapas](docs/development/NEXT_SESSION.md)

Dependências de terceiros são MIT; veja [inventário e avisos](docs/architecture/EDITOR_DEPENDENCIES.md). O manual original é referência privada, não material para redistribuição. Código e UI são originais. Licença Apache-2.0.

## Anexos, pesquisa e idiomas — alpha.12

A alpha.12 permite guardar qualquer tipo de anexo como original para download e **extrair texto de PDF, Word DOCX, ODT, TXT e Markdown** no projeto. Em **Caderno → Anexos → Abrir → Extrair texto / pesquisar / traduzir**, revise a prévia ou selecione um trecho e crie pesquisa vinculada ou original de tradução. Arquivos sem extrator aceitam transcrição manual; não há OCR ou execução de anexos.

**Dicionário e idiomas** ganhou consulta offline às bases MyThes pt/en instaladas, importação/exportação de base lexical JSON compartilhada e conector LibreTranslate com autorização de envio, prévia e confirmação separadas. Tradução automática precisa de um serviço configurado; não há motor neural incluído. Credenciais ficam no processo do servidor, fora das obras. Definições/traduções offline dependem da base importada, sem alegação de dicionário universal pré-instalado.

[Análise global, hipótese de uso, formatos, limites e configuração do serviço](docs/specifications/ATTACHMENT_RESEARCH_TRANSLATION_ANALYSIS.md).

## Comparação de versões — alpha.13

A alpha.13 entrega **Versões → Comparar duas versões lado a lado**: escolha dois snapshots ou o texto atual no disco, inverta os lados, veja linhas inseridas/removidas e filtre somente alterações. Navegue pelas diferenças e carregue mais linhas quando necessário. Em telas estreitas, os lados ficam empilhados. Comparação é somente leitura; restauração continua no fluxo existente com preservação da versão anterior.

A análise é textual. Diferenças de formatação/anotações são avisadas, sem diff visual detalhado. Trechos grandes usam comparação simplificada identificada, com contagens aproximadas; texto não é descartado. Alterar as seleções pede nova consulta. Isto entrega comparação textual de versões; o redline local foi acrescentado na alpha.14.

## Redline por propostas — alpha.14

A alpha.14 acrescenta **Revisão** e **Propor alteração**: selecione texto na cena ou no original de leitura do diálogo, informe autor/papel (Escritor/Editor), substituição e justificativa. O painel mostra original riscado e proposta sublinhada; guardar não altera o manuscrito. Aceitar preserva versão anterior e registra a decisão; rejeitar mantém o texto. Filtros distinguem estado/papel e o histórico acompanha backup/restauração.

O aceite é bloqueado se texto/formatação mudou; atualize a lista e faça nova proposta sobre a base atual, ou rejeite a antiga. A primeira proposta migra a obra para **formato 5**, somente após backup integral verificado. A identificação é local e declarada, sem autenticação, compartilhamento ou permissões remotas. No editor visual, as propostas são limitadas a trechos de um bloco, sem novas quebras ou inserção em cursor vazio.

Para usar: abra a cena, selecione um trecho, clique **Propor alteração** e guarde. Em **Revisão**, escolha Aceitar/Rejeitar e identifique quem decide. Para inserção no texto simples, posicione o cursor e use a seleção do original; para exclusão deixe a substituição vazia. Restaurar um snapshot posterior não apaga decisões históricas. Não é rastreamento automático de teclas nem exportação de alterações controladas do Word.

## Modo Editor local — alpha.15

A alpha.15 entrega **Configurações · Escritor/Editor** no cabeçalho. Editor abre um painel das obras locais com propostas pendentes, conflitos, comentários visuais abertos e acesso à cena, histórico de propostas e versões/comparação. Filtros por etapa e pendência; Atualizar painel consulta o disco. Voltar a Escritor restaura a biblioteca. Autoria/responsabilidade continuam declaradas, sem autenticação ou permissões.

**Acompanhar obra** guarda responsável declarado (100 caracteres), etapa, observações e próximos passos (10 mil caracteres cada). A preferência de perspectiva fica no navegador; acompanhamento pertence à obra e acompanha backup, restauração e duplicação. O primeiro salvamento exige backup integral verificado antes do **formato 6**. Abrir painel ou cancelar não migra. Leitura aceita formatos 1–6; propostas, fontes, anexos e editor visual não rebaixam o formato. Conflito de acompanhamento mantém os campos locais e pede reabertura explícita. `tracking_hash` é derivado e não entra na recuperação/restauração.

Decisão: [ADR-0020](docs/architecture/adr/0020-local-editor-perspective.md). A alpha.16 acrescenta cópia editorial cifrada por frase secreta; acesso online permanece pendente.

## Pacote editorial cifrado — alpha.16

A alpha.16 acrescenta **Publicar → Pacote editorial cifrado** e **Abrir pacote cifrado** na biblioteca. Escolha de 1–200 cenas do Manuscrito, título compartilhado e remetente/destinatário declarados; confira o texto e as notas incluídas antes de cifrar. A projeção preserva texto/formatação suportada e notas de publicação, excluindo pesquisa, anexos, lixeira, comentários privados, notas do inspetor, metadados, acompanhamento, perfil, versões e propostas. Não há envio automático.

O arquivo `.wroom-package.json` usa AES-256-GCM e scrypt (N=131072, r=8, p=1), com salt/IV aleatórios e cabeçalho autenticado. Parâmetros fixos e uma operação criptográfica por instância limitam recursos. Frase secreta de 16–256 caracteres, confirmada na exportação, combinada por outro canal; não é persistida pelo app. Tamanho mínimo não garante entropia: use frase longa e exclusiva. Sem recuperação: perdida a frase, gere outro pacote pela origem preservada.

A abertura confere integridade e destinatário declarado e apresenta prévia temporária (5 minutos, até 4 entradas) antes de criar uma **nova obra independente**. Cancelar/expirar não cria obra; repetir a confirmação do mesmo token não duplica. Reabrir o arquivo em nova prévia pode criar outra cópia. A obra importada e seus backups são **JSON sem criptografia no disco**, como os projetos locais existentes. Não há migração nem sobrescrita da origem.

Este é um primeiro incremento de cópia editorial protegida por segredo compartilhado: **sem autenticação de e-mail, assinatura de remetente, grants, E2EE ou devolutiva/merge ao original**. Quem tem a frase pode abrir e criar pacotes. Não há revogação de arquivo já entregue nem cofre/recuperação de chaves. Cifra executada no servidor local confiável; frase/conteúdo passam pelo loopback. ADR-0021 registra contrato, ameaças, limites e fontes primárias.

Limites: 8 MB de conteúdo, 11 MB de arquivo, 1,5 MB por cena. Não é backup integral nem devolutiva: só as cenas escolhidas. [ADR-0021](docs/architecture/adr/0021-passphrase-editorial-package.md).

## Chaves e assinatura de pacotes — alpha.17

A alpha.17 acrescenta **Biblioteca → Chaves editoriais**: criar identidade Ed25519 com chave privada cifrada por frase, baixar cartão público e backup cifrado da chave, restaurar backup e trocar a identidade ativa com confirmação da impressão anterior. Chaves antigas ficam preservadas/inativas; até 5 identidades e 50 contatos. O arquivo separado `.settings/editorial-identities.json` não entra nos backups das obras. Frases não são guardadas pelo app; backup de chave sem a frase não recupera acesso.

Cartão de contato só vira chave conferida quando o usuário informa a impressão SHA-256 completa confirmada por outro canal. Nome permanece declarado; a conferência do canal é declaração do usuário, não autenticação de e-mail/civil pelo app. Chave nova com nome igual exige nova conferência. Revogar mantém o registro e bloqueia novas operações e confirmações pendentes nessa instalação; não apaga arquivos entregues nem reativa o pin.

Em **Publicar → Pacote editorial cifrado**, escolha **Assinar com chave conferida — v2**, o destinatário conferido e informe a frase de desbloqueio da sua chave, separada da frase do pacote. A prévia vincula chaves/estado/conteúdo. Assinatura Ed25519 cobre o envelope cifrado inteiro e o destinatário, com domínio próprio. Verificação usa o pin já conferido, antes de decifrar. O arquivo expõe chave pública do remetente e fingerprints para roteamento/verificação, permitindo vinculação entre arquivos.

A abertura exige assinatura por padrão na UI. Para v1, desative explicitamente essa exigência e veja “Sem assinatura”; v2 inválido não cai para v1. Antes de confirmar staging, a confiança/revogação é conferida novamente. A assinatura prova controle da chave pinada, não identidade civil ou e-mail. A cifra ainda depende da frase compartilhada; não cifra para a chave pública do destinatário nem oferece E2EE/grants. Cópia importada continua independente, JSON em claro, sem atribuição autenticada ou proveniência assinada persistida na obra. **Rodadas, bases e devolutivas ao original continuam pendentes.** ADR-0022; obras permanecem nos formatos 1–6.

Contrato e limites: [ADR-0022](docs/architecture/adr/0022-offline-signing-identities.md). Para compartilhar v2: crie sua chave, guarde seu backup, troque cartões públicos e confira fingerprints por outro canal antes de exportar. O app não envia cartões/pacotes.

## Rodadas e devolutivas offline — alpha.18

A alpha.18 entrega **Revisão → Nova rodada editorial**: selecionar cenas, título e participantes declarados, conferir a projeção e assinar/cifrar uma base congelada. A primeira rodada exige backup integral verificado antes do **formato 7**. Abrir o diálogo/cancelar antes de confirmar não migra. Leitura aceita formatos 1–7; acompanhamento, visual, fontes, anexos e propostas não rebaixam o formato.

Na biblioteca, **Abrir rodada / devolutiva** confere assinatura/pin e frase. Uma oferta cria cópia de trabalho nova com vínculos por IDs opacos, sem expor IDs da origem ou comentários privados. Na cópia, use **Propor alteração** mantendo texto/formatação na base; **Preparar devolutiva** exporta somente propostas pendentes vinculadas. Aceitar na cópia não altera o original nem equivale a devolver sugestões. Cópias independentes v1/v2 não são associadas retroativamente a uma obra.

Na origem, **Receber devolutiva** exige escolha explícita da obra, mostra original/proposto, duplicatas e conflitos. A confirmação revalida participante, rodada, confiança e base completa e cria apenas pendências; antes de gravar uma entrada nova, gera backup manual integral verificado no destino selecionado da central. Aceitar texto continua decisão individual com snapshot, preservando as anotações privadas do original. Qualquer mudança de texto/formatação/comentário bloqueia a devolutiva inteira sem aplicar parcialmente. Encerrar rodada bloqueia novos recebimentos, sem decidir pendências já importadas.

Recibos de proposal_id/hash/review_id e return_id/hash ficam na obra. Replay conhecido não duplica nem reabre decisão, inclusive após aceite/reinício e backup/restauração que contém esses recibos. Restauração remapeia cenas/review_id/snapshots, preservando IDs externos de rodada/proposta. Backup anterior a um recebimento não conhece esse recibo; forks restaurados são independentes e o destino precisa ser escolhido pelo usuário. Não há idempotência global entre forks ou log inviolável.

Limites: 10 rodadas/12 MB de bases e metadados, 200 cenas por rodada, 1000 propostas/4 MB por devolutiva, 20 mil unidades UTF-16 por lado e obra de até 30 MB. Quatro prévias de rodada por instância, 5 minutos, além das prévias legadas. Envelope v3 assinado Ed25519 sobre a cifra AES-GCM/scrypt existente; kind/participantes/base/escopo conferidos. Chaves/pins globais permanecem fora da obra e de seus backups. Confidencialidade continua por frase compartilhada; sem autenticação de e-mail, E2EE, serviço online ou auditoria externa. Formato 7 é JSON em claro no disco. ADR-0023.

Fluxo: confira os cartões de chave com o participante → Nova rodada → abrir a oferta em outra instalação → propor sobre a base → Preparar devolutiva → Receber devolutiva na obra escolhida → conferir e registrar → aceitar/rejeitar individualmente. Nenhum envio é feito pelo app.

## Retomar o desenvolvimento

Estado consolidado, próximo passo e critérios de aceite em [RETOMAR_PROXIMA_SESSAO.md](RETOMAR_PROXIMA_SESSAO.md).
