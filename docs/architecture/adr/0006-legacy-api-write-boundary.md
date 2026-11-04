# ADR-0006 — proteção transitória da API JSON

Data: 2026-11-02. Estado: adotada no protótipo; não substitui ADR-0002 (storage nativo futuro).

## Problema

A API anterior carregava um projeto por request e gravava o agregado inteiro sem coordenação. Duas alterações simultâneas podiam substituir uma à outra. Temporário fixo também permitia colisão. O editor não enviava base de comparação; projetos inválidos eram omitidos da biblioteca. Host não era verificado e exceções internas eram retornadas ao cliente.

## Decisão

1. Exportar fábrica de servidor sem iniciar listener no import, permitindo testes HTTP reais com base temporária e porta efêmera.
2. Serializar load→command→save por projeto dentro de uma instância. Leituras participam da mesma fila.
3. Exigir hash SHA-256 do texto conhecido em edição, criação de snapshot e restauração de snapshot. Rejeitar base desatualizada sem gravar. Expor hashes apenas na representação HTTP.
4. Criar temporários com nome único e abertura exclusiva; fsync antes de rename e limpeza específica após falha.
5. Manter o schema 1, operações de domínio e compatibilidade de arquivos válidos; não migrar projetos existentes.
6. Mostrar entradas inválidas e adotar mensagens públicas sem conteúdo/caminhos privados.
7. Verificar Host/Origin, JSON, tamanho em bytes, rotas e symlinks diretos antes de abrir projetos.

## Limites deliberados

A fila não é lock entre processos. Hash de conteúdo não é revisão monotônica e não protege alterações de metadados/estrutura baseadas em estado antigo. O armazenamento continua sem journal, fsync de diretório e backup verificável. Não criar campos persistentes improvisados para resolver esses problemas; ADR-0002 definirá revisão, lock, migração e recovery como um protocolo coerente.

No frontend, conflito preserva a edição na página e exige cópia manual antes de reabrir. Recuperação persistente e comparação de versões ainda não foram implementadas.

## Contrato e reversão

A API HTTP agora exige `base_hash` em três ações; consumidores antigos precisam reabrir e enviar o hash retornado em `document_hashes`. Atualizar servidor e frontend juntos e recarregar páginas antigas. Core e CLI não exigem esse campo. Nenhum schema foi alterado. Reverter código não exige migração; preservar todos os projetos e backups.

Testes: HTTP real, core, storage e frontend simulado; ver PROGRESS. [Limites da API](../../security/LOCAL_API.md).
