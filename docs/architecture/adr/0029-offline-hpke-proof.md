# ADR-0029 — HPKE offline com biblioteca e vetores oficiais

2026-11-03. Aceita somente para prova sintética; não libera E2EE ou novo formato de pacote. Aplicação permanece alpha.20/studio-19, projetos 1–7 e pacotes v1/v2/v3 intactos.

## Seleção

Selecionada `hpke` de panva, **1.1.8 exata**, MIT, ESM, sem dependências de execução, baseada em Web Crypto. Dependência apenas de desenvolvimento, instalada com ignore-scripts; integridade do tarball fixada no package-lock. README upstream declara suporte Node/browser e manutenção da linha 1.x. Comparada à `hpke-js` de dajiaji, também baseada em Web Crypto, mas distribuída em módulos adicionais para X25519. A escolha reduz a árvore desta prova; não constitui comparação de segurança nem auditoria das bibliotecas.

Suite fixa: DHKEM(X25519, HKDF-SHA256) 0x0020, HKDF-SHA256 0x0001, AES-256-GCM 0x0002, modo Base. Somente algoritmos da biblioteca, sem implementação artesanal de KEM/KDF/AEAD. O upstream também acompanha evolução do HPKE; os testes desta prova fixam interoperabilidade com os vetores RFC 9180, não autorizam adotar drafts ou outras suites automaticamente.

Metadados conferidos no registro público e fonte oficial antes da instalação. SHA-512 npm: `SYkH+rlJWclHv/GIrs2PB24B3rEaQr8rIRIpcCd1RIki3ZFck+c3tUukm6gR9k2MQ/LUJ8Gt5JQhaGfkBGaJsg==`. Sem scripts de instalação executados, credenciais ou mudança manual em dependências existentes. Produção não importa a biblioteca; instalações omitindo devDependencies não executam esta prova.

## Vetor e evidência criptográfica

Fixture `packages/sharing-spike/test-vectors/rfc9180-x25519-aes256-base.json` extrai um vetor Base do arquivo no commit CFRG **5f503c564da00b0687b3de75f1dfbdfc4079ad31**, referenciado pelo RFC. Guarda URL e SHA-256 do arquivo fonte integral. Chaves/IKM desta fixture são **públicos e conhecidos**, nunca gerar identidade real com eles.

Node deriva as chaves oficiais e compara serializações pública/privada; Node e Firefox decifram os **257 ciphertexts sequenciais** oficiais (incluindo evolução de nonce). Isso verifica recebimento, KEM/KDF/AEAD e interoperabilidade com saída oficial independente; não há comparação de encapsulação determinística do remetente nesta prova. Firefox e Node também trocam envelopes novos nos dois sentidos usando a mesma biblioteca em runtimes diferentes. Não é teste entre duas bibliotecas independentes.

Para abertura portátil, passar o par público/privado ao método Open; passar apenas a privada funcionou no Node mas falhou na decapsulação no Firefox com chave não exportável. Correção mantém a privada não exportável, sem contornar a restrição por exportação.

## Envelope experimental

`packages/sharing-spike/src/hpke-proof.mjs` trabalha só com objetos tipados e Uint8Array, em memória, até 64 KiB. Não lê arquivo de projeto, chaves offline existentes, diretório de contas, backup ou HTTP. Não é parser de arquivos recebidos; parser de JSON com chaves duplicadas/limites continua obrigatório em qualquer integração futura.

Cartão experimental: formato/versão, pública X25519 de 32 bytes e fingerprint SHA-256 dessa pública. Fingerprint é identificação de bytes, não confiança, identidade autenticada ou assinatura. Envelope tem formato/versão próprios, modo/suite fixos, fingerprint, contexto `{device,project,recipient,transfer}`, encapsulação e ciphertext em base64 canônico. Campos exatos, IDs sintéticos restritos e limites são verificados. Contexto normalizado e cabeçalho entram no info HPKE com domínio `WritingRoom synthetic HPKE proof v1`; AAD distingue o conteúdo sintético. Entradas são copiadas antes de awaits para não cifrar dados modificados pelo chamador durante a operação.

Nova cifragem usa efêmera aleatória. Destinatário errado, adulteração da cifra/encapsulação, troca de suite/modo/versão, obra/dispositivo/destinatário/transferência diferentes ou campos extras falham com erro genérico, sem liberar texto. Privada gerada como CryptoKey não exportável. Não oferece keystore, persistência, backup ou promessa de zeroização de memória JavaScript.

**Base não autentica remetente:** qualquer portador da pública pode criar cifra válida. Mesmo envelope/contexto pode ser aberto mais de uma vez: HPKE não substitui recibo durável, prevenção de replay, assinatura ou confiança na chave. Comprometimento posterior da privada estática não tem forward secrecy; suite X25519 não é pós-quântica. IDs/fingerprint/tamanho/contexto ficam visíveis. A frase de pacotes v1–v3 continua sem leitura exclusiva pela chave pública; não foi convertida por este experimento.

## Contrato do próximo vínculo de dispositivo

Implementar em incremento separado, antes de integração:

1. Identidade Ed25519 e par X25519 do dispositivo permanecem separados. Vínculo assinado com domínio próprio deve incluir subject sintético, ID do dispositivo, pública/fingerprint de cifra, versão, emissão/expiração e ID de vínculo. Nunca converter Ed25519 silenciosamente em chave de cifra.
2. Primeiro vínculo exige pin externo da identidade; diretório/nomes/e-mail não concedem confiança sozinhos. Verificação da assinatura precisa chave pinada e contexto esperado. Troca de chave não herda pin.
3. Prova de posse requer desafio aleatório cifrado ao dispositivo e confirmação vinculada à mesma assinatura/contexto/nonce/prazo; desafio de uso único. Assinatura do cartão sozinha não prova posse da privada de cifra.
4. Rotação/revogação invalidam entregas futuras e prévias pendentes, sem apagar cópias antigas. Recovery de login não recupera privadas nem autoriza conteúdo antigo. Reassociação exige cadeia anterior ou reconferência explícita; restore de diário permanece suspenso.

Esse vínculo, diretório resistente a substituição e recuperação **ainda não estão implementados**. Não ativar o envelope como pacote v4 ou oferecê-lo ao usuário com manuscritos antes dos gates.

## Testes e execução

```bash
node --test --test-isolation=none packages/core/test/sharing-hpke.test.mjs
python3 scripts/verify-hpke-firefox.py
```

Seis testes Node: vetor completo/derivação, destinatário/aleatoriedade, adulteração/escopo, validação/limite/base64/vazio, limites de autenticação/replay e estabilidade de entrada assíncrona. Seis verificações Firefox: 257 ciphertexts oficiais, Node→Firefox, Firefox→Node, privada não exportável, contexto errado e adulteração. Chaves só em memória; controle da fixture por pipes, bundle local gerado por esbuild em /tmp. Servidor HTTP de fixture somente loopback; Web Crypto usa o contexto local confiável do navegador, sem contato externo após baixar as dependências/vetores públicos. Não é transporte de conteúdo real ou proteção de rede por HTTP.

Validado em Node v26.13.0 e Firefox desktop disponível no ambiente; suporte a outros Node/browser depende de Web Crypto e ainda não foi executado aqui. Não houve teste em celular, Chrome/Safari ou auditoria externa. Interface do aplicativo inalterada.

## Fontes primárias verificadas em 2026-11-03

- [RFC 9180](https://www.rfc-editor.org/rfc/rfc9180.html), incluindo limitações e vetores.
- [Vetores CFRG no commit citado](https://github.com/cfrg/draft-irtf-cfrg-hpke/blob/5f503c564da00b0687b3de75f1dfbdfc4079ad31/test-vectors.json).
- [Biblioteca selecionada](https://github.com/panva/hpke), [README upstream](https://raw.githubusercontent.com/panva/hpke/main/README.md) e metadados npm/arquivo instalado 1.1.8; manutenção declarada e suporte não equivalem a revisão independente.
- [Alternativa avaliada hpke-js](https://github.com/dajiaji/hpke-js).

Evidência final: 283 testes Node sem falhas/skips, seis verificações Firefox aprovadas. Vetor oficial com 257 ciphertexts em ambos os runtimes. Log `/tmp/writingroom-hpke-final-node.log`; relatório `/tmp/writingroom-browser-rqogzglj/report.json`.

Atualização posterior: vínculo sintético e prova de posse em memória implementados na ADR-0030. Não resolve diretório durável, recuperação ou E2EE de produção.
