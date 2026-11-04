# ADR-0012 — proposta de ambiente editorial profissional

Data: 2026-11-02. **Decisões funcionais confirmadas; desenho técnico proposto, sem implementação.** Não altera a alpha.7/studio-6 nem aprova gates de produção.

## Contexto e decisões do usuário

Expandir o WritingRoom para múltiplos tipos de escrita, modo Autor/Editor, carteira editorial com uma ou várias obras, permissões por área, revisão formal e publicação profissional. Em esclarecimento explícito, o usuário escolheu (1) alterações rastreadas com comparação lado a lado e (2) pacote criptografado e acesso online, começando pelo pacote criptografado. Solicitou atualizar a documentação antes de implementar essa expansão.

## Direção funcional adotada no planejamento

- Modo Editor é uma apresentação de workspace; identidade e autorização são conceitos separados.
- Redlines de autor/editor são camadas de propostas versionadas sobre uma base, com aceitar/rejeitar e conflito; não dois textos canônicos sobrescritos arbitrariamente.
- Área editorial/grants por obra, pasta/documento e capacidade; biblioteca privada não é compartilhada implicitamente.
- Primeiro formato de colaboração é pacote editorial cifrado/autenticado com base congelada e devolutiva idempotente; depois acesso online por convite/e-mail. Autenticação de e-mail exige fluxo real e não substitui gestão/verificação de chaves.
- Sessão de publicação/submissão é cópia de trabalho independente, baseada em versão congelada, com paratextos editáveis e exportação por perfil. Gerar arquivo não envia e-mail.
- IA opt-in com conexão/segredos separados e instruções/contexto por projeto, sem enviar toda a obra ou aplicar sugestões silenciosamente.
- Tipos/modelos extensíveis em Novo projeto; gênero, modo e etapa separados. Nível de suporte de edição/exportação deve ser visível.

## Arquitetura ainda não decidida

Protocolo criptográfico e bibliotecas, credenciais/recuperação, serviço de identidade/e-mail, backend de envelopes, formato/log/merge de revisão e adapters de IA exigem ADRs/provas próprios. Não aprovar infraestrutura ou comprar serviços por este documento. Pacote manual/offline sem serviço de identidade pode ser prova, mas não será chamado de autenticação por e-mail.

Não substituir permissões reais por pastas ocultas, publicar loopback atual, compartilhar chave junto ao arquivo ou enviar backup JSON completo ao editor como se fosse projeção autorizada. A E2EE futura não protege contra cópia por leitor autorizado nem torna chamadas a provedor de IA privadas perante esse provedor.

## Compatibilidade com plano vigente

G1–G4 e G7 continuam como critérios específicos de durabilidade/editor/segurança. Números de gates não obrigam desktop a preceder colaboração/IA; o usuário manteve desktop por último. Recursos locais da fila urgente prosseguem; Google/Drive/OneDrive/Dropbox continuam somente na última etapa anterior ao desktop. Esta solicitação amplia o produto e não autoriza ignorar integridade nem iniciar envios remotos.

## Documentos e evidência

[Especificação profissional](../../specifications/PROFESSIONAL_EDITORIAL_WORKSPACE.md), [roadmap PRO-001–027](../../roadmap/PROFESSIONAL_EDITORIAL_ROADMAP.md) e [threat model](../../security/EDITORIAL_SHARING_AND_AI.md). Verificação desta entrega: coerência documental, links internos, IDs e decisões confirmadas; sem testes novos da aplicação, código, migrações, conexões, chaves ou envio de e-mail. 139 testes/56 fluxos registrados antes não demonstram os novos recursos.
