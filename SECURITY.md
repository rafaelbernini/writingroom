# Segurança

ADR-0032: modo sintético com diretório exige prova por sessão antes de convites/acesso. Não há transação distribuída entre os dois bancos: falha de resposta não garante ausência de compromisso. Emissor, pins e revogação de chave continuam fora das rotas; /devices/revoke legado revoga apenas sessões/códigos.

ADR-0031: diretório sintético durável em SQLite, sem privadas, com revogações e CAS. Restore pela API cria domínio suspenso; não protege contra substituição arbitrária do arquivo por atacante com acesso de escrita. Ainda não está ligado a sessões/HTTP ou identidade real.

ADR-0030: vínculo/posse de dispositivo apenas sintéticos e em memória. Pins exigem conferência externa representada pela fixture; revogações não sobrevivem ao reinício. Nonce é segredo de confirmação e precisa sessão/canal protegido em integração futura. Sem diretório ou E2EE de produção.

ADR-0029: HPKE Base apenas em prova offline sintética/dev-only. Não autentica remetente, não impede replay ou substituição de chave e não oferece E2EE de produção. Pacotes/editor/chaves existentes não foram migrados. Vínculo de dispositivo e recuperação permanecem pendentes.

ADR-0028 valida cookies no Firefox isolado. Secure foi enviado ao HTTP loopback neste ambiente: não alegar bloqueio de downgrade ou homologação pública. A confiança TLS foi importada somente no perfil temporário; nenhuma mudança no trust store do usuário. GET /session sem Origin exige Fetch Metadata same-origin no adaptador isolado.

ADR-0027: transporte **HTTPS sintético em loopback**, com certificado temporário e emissor fora das rotas. Sem login/e-mail reais ou exposição do servidor 4173. Testes de requisição não comprovam as políticas de cookies de um navegador; essa validação permanece pendente.

ADR-0026 acrescenta diário SQLite **sintético e isolado**, com metadados em claro. Checksum não é assinatura. Restore fica suspenso; nenhuma concessão ou sessão é reativada. Sem mudança do servidor do aplicativo.

Alpha.20: preferência local de leitura e ajustes de foco/referência, sem mudança de exposição de rede, confiança ou persistência de obras. Testes continuam isolados e sintéticos.

Alpha.19: revisão responsiva local, sem mudança de autenticação, Host/Origin/CSP ou exposição de rede. O teste móvel usa somente Firefox isolado e dados sintéticos; dispositivo físico não foi homologado.

Sessões sintéticas — 2026-11-03: ADR-0025 e `session-harness.mjs` acrescentam state/código de uso único, rotação, CSRF/Origin, expiração, logout e revogação por dispositivo. Sete testes novos; transporte por chamadas em memória, sem OIDC, e-mail, HTTP, persistência ou mudança da interface alpha.18. Próximo: storage transacional de convites/grants/recibos, com concorrência e recuperação.


Preparação online: [ADR-0024](docs/architecture/adr/0024-online-identity-and-authorization-contract.md) registra revisão interna E1 e o contrato futuro. `packages/sharing-spike` contém somente uma prova sintética em memória, sem login/HTTP/persistência. Não deve ser exposta como serviço nem usada como autenticação.

Versão alpha: não há garantias de endurecimento. Não abra a porta 4173 na rede. Não execute como administrador e não carregue dados importantes sem backup. Para vulnerabilidades, não publique payloads com dados pessoais; procure maintainers do repositório quando existir canal de reporte.

Na alpha.18, pacotes editoriais são cifrados por frase compartilhada e podem ser assinados por chave conferida por outro canal. Rodadas e devolutivas verificam participantes/base/escopo, registram recibos e exigem backup antes de importar novas pendências. Aceitar texto permanece ação separada. Isso não autentica e-mail, não oferece E2EE ou serviço online, e não cifra os projetos/backups locais em disco. Revogação é local e não apaga cópias entregues.

Contrato e limites efetivos: [rodadas e devolutivas](docs/architecture/adr/0023-editorial-rounds-and-returns.md), [chaves e assinaturas](docs/architecture/adr/0022-offline-signing-identities.md), [API local](docs/security/LOCAL_API.md). Evidências e restrições de backup/forks em [PROGRESS](docs/development/PROGRESS.md).
