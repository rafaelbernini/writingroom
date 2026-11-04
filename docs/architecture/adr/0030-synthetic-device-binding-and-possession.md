# ADR-0030 — Vínculo assinado e prova de posse sintéticos

2026-11-03. Aceita para prova offline em memória. Complementa ADR-0029. Sem login real, diretório durável ou E2EE de produção; aplicativo continua alpha.20/studio-19.

## Vínculo e confiança

`packages/sharing-spike/src/device-binding-proof.mjs` gera identidade Ed25519 Web Crypto distinta da chave X25519 da ADR-0029. Privadas são não exportáveis; não há conversão entre algoritmos ou uso de chaves reais da instalação. Cartão de assinatura expõe pública raw de 32 bytes e SHA-256. Pins subject→fingerprint entram somente pelo controlador de fixture, que representa conferência externa; app não verifica um canal ou e-mail real.

Objeto assinado tem formato/versão próprios e payload canônico com subject, dispositivo, binding_id, impressão da identidade, cartão público de cifra, emissão e expiração. Assinatura Ed25519 tem domínio `WritingRoom synthetic device binding v1`. Campos exatos, base64 canônico, hashes das públicas, IDs e validade de até 30 dias são conferidos. Verificação exige subject/dispositivo/pin esperados e horário válido; não confia na pública declarada sem pin. O hash do vínculo identifica o payload canônico, não uma conta ou identidade civil.

A assinatura atesta a declaração da identidade pinada sobre aquela chave, **não** posse da privada de cifra. Chave pública substituída, assinatura alterada, pin/subject/dispositivo divergentes ou vínculo expirado são recusados. São objetos tipados de prova; não existe parser de arquivo não confiável ou formato de pacote novo.

## Desafio e ativação

Verificador recebe até 100 pins explícitos. `begin` verifica a assinatura/pin/estado, cria UUID de desafio e nonce de 256 bits, e cifra um objeto contendo nonce, ID, hash do vínculo e prazo para a pública X25519. Usa HPKE da ADR-0029, com contexto sintético dedicado, não contexto de obra real. Prazo máximo cinco minutos, limitado pela expiração do vínculo. Guarda apenas hash do nonce no registro pendente, sem incluir o segredo no desafio público fora da cifra.

`answerDeviceChallenge` exige subject/dispositivo/pin esperados pelo dispositivo, verifica o vínculo, decifra com seu par X25519 e compara os campos internos com os externos. Retorna ID/hash e prova nonce. Alterar prazo/contexto/hash/ID não transforma um desafio em outro válido. Destinatário errado não decifra.

`confirm` retira o desafio pendente sincronamente **antes dos awaits**, valida resposta, assinatura/pin e estado novamente, e faz guarda final síncrona imediatamente antes de ativar. Assim, confirmação concorrente do mesmo nonce produz um sucesso, e dois vínculos concorrentes para o mesmo dispositivo não se substituem silenciosamente. Resposta errada também consome o desafio; repetir exige novo desafio. Verificador é local e o controle não está exposto em HTTP.

`authorize` exige vínculo ativo e ainda válido. Há até 100 desafios pendentes e 1000 dispositivos ativos. Expirados pendentes são removidos nas operações. Pins e estados de revogação são controlados pela fixture; não há política distribuída de abuso, timing constante ou log inviolável.

## Revogação e substituição

Revogar hash de vínculo o mantém recusado nessa instância, remove ativação e desafios correspondentes. Revogar identidade bloqueia todos seus vínculos e desafios nessa instância. Verificação e guarda final recusam revogação após prévia ou durante await, sem reativação silenciosa.

Vínculo novo não pode ocupar dispositivo já ativo com outro hash. Para a prova, o operador precisa revogar explicitamente o vínculo anterior e comprovar a posse da chave nova. A identidade Ed25519 deve continuar pinada; troca da identidade em si não herda confiança e **não tem fluxo de rotação/recovery implementado**. Revogação não apaga arquivos já entregues ou recupera privadas.

## Limites importantes

Tudo fica em memória. Reiniciar perde pins injetados, ativação, desafios e revogações; um novo verificador exige novos pins e prova de posse. Reintroduzir um pin após reinício não preserva blacklist anterior. Portanto isso ainda não pode servir como diretório durável ou mecanismo de revogação real. Não há restore de vínculos; restore do diário de compartilhamento continua suspenso conforme ADR-0026.

Prova nonce é um segredo de confirmação: interceptação/relay pode concluir o desafio em nome de outro cliente. A integração futura requer sessão autenticada, canal de entrega/conferência adequado e vinculação do desafio à sessão/operação; a prova não demonstra presença física, identidade civil ou resistência a dispositivo comprometido. Não expor `begin/confirm/revoke` diretamente na rede.

Não persiste privadas, não oferece backup/recovery, keystore ou zeroização garantida. Não altera a biblioteca/servidor/UI ou obras; não assina pacotes reais nem cria v4. HPKE Base permanece sem autenticação de remetente e recibo/replay de conteúdo; o uso único implementado aqui é do desafio de posse, não dos pacotes.

## Evidência

Oito testes em `sharing-device-binding.test.mjs`: assinatura sem ativação, adulteração e pin/contexto errado, desafio/nonce/prazo/ID/hash, expiração/revogação após prévia, corrida da mesma resposta, substituição explícita, corrida entre chaves para mesmo dispositivo e reinício sem restauração de confiança/ativação. Verificação de prazo usa relógio injetado.

`verify-hpke-firefox.py` agora tem 11 verificações: as seis HPKE anteriores (incluindo 257 ciphertexts oficiais) e cinco de vínculo/posse. Node assina, Firefox verifica usando pin esperado e responde ao desafio HPKE, Node ativa e recusa replay/revogação. Controles por pipes; chaves apenas em memória e dados sintéticos. Não são testes de OIDC, serviço real, mobile ou biblioteca criptográfica independente.

```bash
node --test --test-isolation=none packages/core/test/sharing-device-binding.test.mjs
python3 scripts/verify-hpke-firefox.py
```

## Próximo incremento

Definir e implementar armazenamento transacional separado de pins/vínculos/revogações/gerações, sem privadas em claro. Desafios e confirmações precisam CAS/uso único durável ou invalidação segura no reinício; impedir que corrida/restore reative chave antiga. Reconferência externa explícita na troca de identidade. Backup/restore deve manter domínio novo suspenso, sem importar confiança automaticamente de fork. Testar reabertura, processos concorrentes, crash, backup antigo e revogação entre prévia/confirm antes de ligar ao serviço sintético.

OIDC/provedor, e-mail e recuperação operacional continuam pendentes. Nenhuma criação de conta, credencial real, envio ou implantação foi feita ou autorizada por essa prova. Interface responsiva aprovada e formatos 1–7/v1–v3 ficam preservados.

## Fontes primárias verificadas em 2026-11-03

[Node Web Crypto](https://nodejs.org/api/webcrypto.html) para geração, importação, assinatura e verificação de Ed25519; [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032.html) para Ed25519. HPKE e biblioteca já fixados na ADR-0029. O desenho do vínculo/desafio é experimental interno, sem auditoria externa ou pretensão de protocolo padronizado.

Evidência final: 291 testes Node sem falhas/skips e 11 verificações Firefox aprovadas. Log `/tmp/writingroom-device-binding-final-node.log`; relatório `/tmp/writingroom-browser-nx74mcp9/report.json`.

Atualização posterior: ADR-0031 adiciona diretório durável separado. O verificador desta ADR continua em memória; integração com sessão/HTTP e recovery real permanecem pendentes.
