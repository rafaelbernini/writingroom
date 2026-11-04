# ADR-0020 — Perspectiva Editor e acompanhamento local

Data: 2026-11-03. Estado: aceita para implementação local.

A preferência Escritor/Editor pertence ao navegador (`writingroom.perspective`), fora dos backups. A mudança altera a entrada da biblioteca e abre obras em Revisão; não muda texto, identidade ou permissões.

O acompanhamento pertence à obra: objeto `editorial_tracking` com responsável declarado, etapa (`unassigned`, `assessment`, `editing`, `author-review`, `ready`), observações e próximos passos. Campos limitados e validados, sem IDs externos. Primeiro salvamento exige backup integral verificado e formato 6; leitura aceita formatos 1–6. Abrir painel/cancelar não migra. Versões anteriores rejeitam formato 6 para evitar perda silenciosa.

Atualização usa hash do acompanhamento e fila por obra para recusar edição concorrente. Hash é derivado, excluído de recuperação/restauração. Backup integral inclui o objeto; restauração/duplicação preserva os campos, sem vínculos a remapear.

Painel deriva propostas pendentes/conflitantes e comentários visuais abertos dos dados atuais, excluindo lixeira. Histórico é preservado. Obras indisponíveis continuam visíveis; arquivadas usam a biblioteca existente. Ações encaminham às cenas, versões e revisão existentes; não há decisão em lote. Filtros locais por etapa e pendência.

Validação: testes de domínio, HTTP, backup/restauração, UI Firefox, largura estreita e cópia privada restaurada quando disponível. Rollback: manter formato 6 e usar uma cópia restaurada do backup anterior em versão antiga; nunca rebaixar schema manualmente.
