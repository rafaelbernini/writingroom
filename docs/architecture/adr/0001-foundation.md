# ADR-0001 — Fundação verificável antes do desktop nativo

**Estado:** transitória, implementada em 0.1.0-alpha.1.

A especificação v1 propõe Tauri 2 + Rust + SQLite + React/TipTap. Para entregar um ciclo funcional testável sem toolchains externos, esta primeira etapa usa **Node.js (ES modules) + arquivos JSON atômicos + interface HTML/CSS/JS**.

Esta arquitetura é um **vertical slice de validação de produto**, não substitui a arquitetura-alvo. O armazenamento não tem transação multi-objeto, journal nem SQLite e o editor é plain-text, não ProseMirror. APIs e invariantes de domínio devem ser migrados para Rust sem prometer compatibilidade direta de arquivos até existir uma migração de schema testada. Não usar projetos pessoais críticos sem backups independentes.

## Decisões atuais
- UUID estável por nó, árvore acíclica, um pai por item, lixeira protegida.
- Dados por projeto em `<uuid>.wroom/project.json`; troca por rename após escrita com fsync do arquivo temporário (durabilidade total depende do filesystem e fsync do diretório, ainda não implementado).
- Servidor HTTP local ligado a `127.0.0.1` somente, sem CORS, checagem básica de Origin. **Não expor em rede pública.**
- Interface sem dependências externas para permitir testes e demonstração imediatos.
- Fonte canônica da especificação: `docs/specifications/writingroom_SPEC_v1.0.md`.

## Próximas ADRs obrigatórias
- ADR-0002: protocolo SQLite + documentos, migrações e recuperação de crash.
- ADR-0003: schema ProseMirror e importação com perda semântica reportada.
- ADR-0004: Tauri 2 capabilities, filesystem e sandbox.
- ADR-0005: adaptador Web OPFS/IndexedDB independente do servidor Node.
