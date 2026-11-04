# ADR-0019 — propostas locais de redline

2026-11-02 · alpha.14 · implementado e verificado.

A revisão é uma proposta de substituição de intervalo, separada do manuscrito. Guarda ID, cena, autor/papel declarado (escritor/editor), justificativa, data, hash da base visual/textual, início/fim, texto original, substituição e estado. Decisão guarda autor, observação e data. Aceitação aponta snapshot anterior; rejeição não grava texto ou snapshot. Registro histórico não implica que uma aceitação antiga ainda seja o estado atual do manuscrito.

Formato de projeto 5, opcional até a primeira proposta. Aceita leitura 1–5; não migrar ao abrir. Antes da primeira gravação em 5, criar backup integral verificado com manifesto para schema 5; falha mantém projeto anterior. Propostas e decisões ficam no backup de obra, nunca na compilação/publicação. Restore remapeia IDs de propostas/cenas/snapshots; duplicar projeto usa esse fluxo. Duplicar documento não duplica histórico de propostas, evitando que sugestões de uma cena pareçam decisões sobre outra.

Criação exige hash da base atual. Decisão exige hash da proposta e estado pendente; aceite exige também hash atual igual à base original da proposta e trecho original exato. Mudança de texto, formatação, anotações visuais ou modo impede aceite. Sem rebase automático, mesmo para edições distantes. Rejeição pode encerrar proposta desatualizada sem modificar o texto. Proposta conflitante pode ser refeita com nova seleção, mantendo a antiga no histórico.

Texto simples: inserção, exclusão e substituição, com limites Unicode para não cortar pares surrogate. Visual: substituição/exclusão dentro de um bloco, respeitando limites de anotações, sem inserção em cursor vazio ou quebras novas. Usa os transforms existentes, mantém documento visual e versões. Não há captura automática de toda tecla, diff de formatação ou export Word Track Changes.

Limites: mil propostas, 4 MB de registros, até 20 mil unidades UTF-16 por original/substituição, 30 MB de projeto; autor até 100 caracteres, justificativa/decisão até 2 mil. Documentos na lixeira exigem restauração para revisar. Limites são validados antes de confirmar mutação.

Autoria é declarada localmente, não autenticada. Qualquer pessoa com acesso à instância local pode escolher um nome/papel e decidir; sem permissões remotas, e-mail, criptografia ou envio. Modo Editor, pacote criptografado e autenticação continuam etapas separadas.

Evidências: 205 testes Node, 85 fluxos Firefox amplos e 9 focados. Cobrem seleção/prévia, autoria/papel, ausência de alteração ao propor/rejeitar, aceite com versão, conflitos/CAS/decisão duplicada, texto visual, publicação e backup/restauração/reload, falha de backup de migração. Caso privado em cópia restaurada: propor/aceitar/snapshot/novo restore, backup original inalterado. Relatório VALIDACAO-ALPHA14-REDLINE.json.

A validação final inclui também marcas visuais preservadas, conflito por formatação sem mudança de texto, limites, referências históricas inválidas, backup gerenciado no schema 5 e formulário/painel em viewport real de 500 px.
