# ADR-0002 — contrato de storage e prova isolada de recuperação

Data: 2026-11-02. Estado: contrato adotado para prova; **não aprovado para substituir o storage de produção**. ADR-0001/0006 continuam governando a aplicação atual.

## Objetivo e ambiente

Provar revisão monotônica, idempotência, exclusividade de escritor, backup verificável e restauração sem sobrescrita antes do cutover desktop. Ambiente observado: Node 26.13.0, SQLite nativo 3.54.0, sem Rust/Cargo no PATH. Usar `node:sqlite` em adapter separado, sem pacote externo, instalação ou mudança do Node >=20 exigido pelo protótipo. A prova requer um Node com `DatabaseSync`; testes devem indicar skip explícito quando indisponível. A escolha da biblioteca Rust permanece pendente.

Plano do incremento: adapter em `packages/storage-spike`, DDL e contratos no mesmo pacote, testes em fixtures temporárias na suíte Node. A API web/CLI e os projetos JSON reais não usarão esse adapter. Riscos principais: WAL, lock e publicação de backups; testar rollback, corrupção, segundo processo e destinos existentes. Rollback de código: retirar a prova, sem converter ou tocar projetos existentes.

## Pacote e responsabilidades

- Pacote experimental é diretório com `project.sqlite` e `.writer.sqlite`. Não é um ZIP aberto nem formato de distribuição aprovado.
- Banco principal em WAL, `synchronous=FULL`, `foreign_keys=ON`, busy timeout limitado. Verificar schema antes de configurar escrita. Futuro/incompatível é rejeitado sem migração; a prova não oferece edição read-only de versões desconhecidas.
- Banco auxiliar de lock em modo rollback, com `BEGIN EXCLUSIVE` mantido durante a sessão escritora. Só coordena clientes que respeitam este contrato; não apagar arquivo de lock para “liberar” escritor. O SO/SQLite libera lock ao fechar ou terminar processo. Não usar PID/timeout como permissão para roubar lock.
- Leitura do banco principal pode coexistir com escritor, sempre em transação de leitura para obter aggregate consistente.
- Conteúdo de texto e histórico vivem no banco, sem blobs externos nesta prova; elimina commit cruzado DB/filesystem. Assets futuros exigirão protocolo próprio por hash e migração antes de serem suportados.
- Projeto: identidade e metadados/árvore JSON; documentos: texto + revisão monotônica; revisão: conteúdo imutável, hash, data e operação; comandos: operationId + fingerprint + resultado persistido. Esta é uma modelagem de prova, não o DDL normalizado final de nós/assets/references/compile_profile/migration_log.

## Comando de texto

`writeText({nodeId, baseRevision, operationId, text})` valida entrada, inicia `BEGIN IMMEDIATE`, verifica comando repetido e base, atualiza texto/revisão e insere histórico/comando na mesma transação. Retorna revisão e SHA-256 após COMMIT. Idempotência: mesmo ID e mesmo comando retorna resultado anterior; ID reutilizado com payload diferente é erro. Base velha não altera texto/histórico. A→B→A produz revisões distintas. Uma falha executa ROLLBACK.

O contrato de UI permanece separado; a prova não expõe SQL nem substitui o hash transitório da API atual. Comandos estruturais e snapshots versionados ainda precisam ser modelados no storage final.

## Backup e restauração

Backup materializa imagem consistente com `VACUUM INTO` em staging privado, normaliza a imagem para journal DELETE, fecha, verifica e faz fsync do arquivo. Manifesto versionado contém ID, contagens, revisões e lista fixa de arquivo/tamanho/hash SHA-256. Não copiar `project.sqlite` vivo sem considerar WAL. Lock, WAL e SHM não fazem parte do backup.

Verificação: formato/schema aceitos, entradas fixas (sem paths arbitrários), tamanho/hash, `quick_check`, `foreign_key_check`, agregado válido, integridade do histórico e equivalência das contagens declaradas. Verifica sem depender da origem. Hash detecta corrupção, **não autentica** um atacante capaz de substituir banco e manifesto.

Restore: validar backup, copiar para staging, verificar novamente a cópia (evita confiar em fonte alterada entre verify/copy), reservar destino novo com mkdir exclusivo e publicar o arquivo. Destino preexistente nunca é substituído, mesmo vazio. Backup publica manifesto por último. Falha normal limpa somente staging/destino criados pela operação; nunca apaga fonte ou destino preexistente. Crash entre reserva e publicação pode deixar destino incompleto, que deve permanecer para inspeção e não ser reusado automaticamente.

Fsync de arquivos e diretórios é explícito nesta prova Linux. Erro de fsync é reportado. Isso não prova durabilidade em qualquer hardware/volume. Não há retenção automática nem exclusão de backups.

## Compatibilidade, migração e gates

Schema SQLite próprio, independente de `project.json schema_version: 1`. A prova aceita um agregado sintético em memória e cria apenas destino novo; não importa arquivos reais nem migra in-place. Migrador futuro: backup verificado do legado → staging → equivalência de IDs/árvore/textos/snapshots → relatório → ativação explícita, preservando fonte.

G1 permanece pendente até storage desktop final, migração, falta de espaço/permissão, crash em fases diversas, recuperação assistida, desempenho e validação em todos os sistemas anunciados. Não alegar Tauri/Rust nem compatibilidade desktop completa com esta prova.

## Fontes técnicas

- [Node SQLite](https://nodejs.org/api/sqlite.html): API nativa observada no ambiente.
- [SQLite VACUUM INTO](https://www.sqlite.org/lang_vacuum.html): imagem consistente em novo arquivo; sincronização explícita pela aplicação.
- [SQLite locking](https://www.sqlite.org/lockingv3.html): lock do banco auxiliar em modo rollback. Principal usa WAL, protocolo distinto.
