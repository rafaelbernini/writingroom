# ADR-0024 — Fronteira online e prova sintética de autorização

2026-11-03. Contrato aceito para orientar a próxima implementação; serviço remoto e protocolo criptográfico ainda não liberados. Aplicação permanece alpha.18/studio-17, formatos 1–7 e pacotes v1/v2/v3 inalterados.

## Revisão interna E1

O ciclo offline está implementado, mas não conclui PRO-AC-06–09. A frase compartilhada permite decifrar a qualquer portador; assinatura/pin não autentica e-mail. Revogação local não remove cópias. Projetos/backups são JSON em claro. Recibos sobrevivem somente em backups que os contêm; forks e restaurações antigas não têm deduplicação global. Esta revisão é interna, não auditoria externa. Comprometimento do dispositivo, substituição de chaves pelo serviço e recuperação insegura continuam ameaças abertas.

## Identidade, dispositivo e sessão — contrato futuro

Identidade remota tem subject opaco estável, e-mail verificado e dispositivos separados. E-mail prova controle da caixa naquele momento, não identidade civil. Alterar e-mail exige reautenticação e verificação do novo endereço; não substituir subject nem confiança em chaves. Login deve usar provedor OIDC, Authorization Code + PKCE S256, issuer/audience/nonce/state e redirect URI exata; validar a política de e-mail verificado do provedor antes de escolhê-lo. Nenhum provedor/conta está configurado.

Backend próprio, separado do servidor 4173, HTTPS e origem única. Sessão opaca aleatória, armazenada pelo hash, cookie Secure/HttpOnly/SameSite=Lax, sem domínio amplo; rotação no login/reautenticação, 30 minutos de inatividade e máximo de 12 horas. Mutações exigem POST/PUT/DELETE, token CSRF vinculado à sessão e Origin exata; GET nunca aceita convite. Logout/revogação de dispositivo invalidam imediatamente sessões. Limitar tentativas por origem e identidade, respostas públicas uniformes para evitar enumeração, sem tokens em URL/log/analytics. Valores são limites iniciais a validar no adaptador real, não funcionalidades da prova.

## Convites e capacidades

Negar por padrão e verificar toda operação no servidor, inclusive busca, anexos, exportação e recebimento. Identidade vem da sessão autenticada, nunca do body. Owner pode convidar/revogar; receptor não delega. Obra e documento são IDs opacos compostos no contexto da obra. Capacidades iniciais: read e propose; nenhuma permite editar original, aceitar propostas ou administrar. Aceite de proposta permanece ato separado do owner com base/CAS/backup existentes.

Convite vincula destinatário, obra, allowlist imutável de documentos, capacidades e expiração de até sete dias. Pasta é seleção convertida em lista explícita na prévia; novos documentos/movimentos não ampliam concessão. Tela deve mostrar escopo e metadados antes da confirmação. Token aleatório de 256 bits, apenas hash no serviço; prévia não consome, aceite autenticado explícito consome uma vez, com transação e recibo durável na implementação futura. Revalidar destinatário, revogação, prazo e escopo no compromisso e em cada operação. Erro externo genérico; auditoria interna sem manuscrito/token. Revogar impede novas operações, não apaga downloads. Alterar escopo exige novo convite; mudanças de chave suspendem entrega até nova conferência.

## Chaves e recuperação — decisão com gate

Selecionado HPKE RFC 9180 como base para futura encapsulação por destinatário, com X25519/HKDF-SHA256 e AEAD padronizada; assinatura Ed25519 permanece função separada. Não converter chave de assinatura em chave de cifra implicitamente. Biblioteca mantida, suporte Node/navegador, vetores RFC e revisão do envelope ainda precisam ser escolhidos/validados antes de implementar cifra. Não implementar HPKE artesanal nem promover o pacote por frase a E2EE.

Cada dispositivo terá par de cifra próprio, vínculo assinado por identidade e prova de posse. Primeiro vínculo requer conferência externa da impressão; substituição exige autorização da chave anterior ou novo procedimento explícito sem herdar pins. Serviço não pode estabelecer confiança sozinho. Rotação não concede histórico automaticamente; remover dispositivo exige novas chaves de conteúdo para entregas futuras. Recuperar login não recupera privadas: somente backup cifrado/reautorização por dispositivo confiável, ou nova identidade com reconferência. Sem chave recuperável, conteúdo antigo permanece inacessível. Diretório resistente a substituição, múltiplos dispositivos, distribuição de novas chaves e testes adversariais continuam gates, sem alegação de forward secrecy.

Serviço observa subject/e-mail, IDs de dispositivos/obras/documentos, participantes, escopo, tamanhos, horários, IP e eventos de acesso. Títulos/textos/notas/chaves privadas ficam fora do diretório. Cifra não oculta todo metadado. Conteúdo deve sair somente pela projeção allowlist já definida, nunca pelo agregado inteiro. Não há integração com IA/conectores.

## Prova executável e fronteiras

`packages/sharing-spike/src/authorization.mjs` é modelo em memória com identidades sintéticas injetadas por fixture, sem autenticação, HTTP, e-mail, cifra, disco ou leitura de obras. Aceitar um parâmetro actor nesse modelo não constitui autenticação. Não importar esse módulo no servidor atual ou expô-lo como API. Pastas/obras da prova são somente IDs; campos extras de cenas não são retidos. Limites: 100 identidades/obras, 200 cenas por obra, 1000 convites por instância; reiniciar elimina tudo, não representa persistência segura. Token existe apenas no retorno de criação e hash interno. Seis testes adversariais no comando `node --test --test-isolation=none packages/core/test/sharing-authorization.test.mjs`.

Não há schema novo, migração ou backup novo porque nada persiste. Antes de persistir: ADR de storage/transações concorrentes, backup/restauração de grants e recibos, invalidação de sessões no restore, remapeamento explícito sem reutilizar IDs de forks e testes de crash/replay. A prova SQLite existente não migra automaticamente o produto. Nenhum conteúdo privado usado nesta prova.

## Próxima implementação

Atualização: harness sintético de sessão/CSRF entregue na ADR-0025, sem OIDC ou HTTP. Próximo: persistência transacional de convites/grants/recibos com recuperação testada. Seleção de biblioteca HPKE e key binding antes de qualquer transporte de manuscrito. Provedor real, envio de e-mail e implantação exigem autorização específica; não abrir o servidor loopback.

## Fontes primárias verificadas em 2026-11-03

- [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): negar por padrão e conferir cada requisição.
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) e [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): sessão e proteção de mutações.
- [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html): segurança OAuth e PKCE; não substitui a validação de identidade OIDC.
- [RFC 9180](https://www.rfc-editor.org/rfc/rfc9180.html): HPKE; proteção contra replay, confiança no destinatário e armazenamento não são resolvidos apenas pela cifra.
