# Prova isolada de armazenamento SQLite

Este pacote é **experimental** e não é usado pelo servidor web/CLI atual. Não coloque manuscritos reais aqui. Veja [ADR-0002](../../docs/architecture/adr/0002-storage-recovery-prototype.md).

Requer Node com `node:sqlite`/`DatabaseSync`; observado em Node 26.13.0 com SQLite 3.54.0. A aplicação legada mantém Node >=20; em runtimes sem SQLite os testes desta prova indicam skip explícito. Nenhuma dependência foi baixada.

```bash
npm run storage:demo
```

A demonstração cria somente dados sintéticos em um diretório temporário e informa onde inspecionar projeto, backup e restauração. Não toca `writingroom-projects`. Não remove seus artefatos automaticamente.

## Contrato implementado

```js
import {
  createRepository, openRepository, verifyBackup, restoreBackup
} from './src/repository.mjs';

const session = await createRepository('/destino/novo', syntheticProject);
const {project, revisions} = session.read();
const result = session.writeText({
  nodeId, baseRevision: revisions[nodeId], operationId: 'unique-command-id', text
}); // {revision, hash}; transação confirmada, sem promessa de durabilidade universal
await session.backup('/backup/novo-fora-do-projeto');
session.close();
await verifyBackup('/backup/novo-fora-do-projeto');
await restoreBackup('/backup/novo-fora-do-projeto', '/restauracao/nova');
const reader = await openRepository('/restauracao/nova', {readOnly: true});
reader.close();
```

O diretório pai dos destinos deve existir. Destino existente é rejeitado, mesmo vazio. Projeto recebido é copiado antes de operações assíncronas. A prova grava apenas texto; árvore/metadados/snapshots recebidos são preservados, sem API de edição estrutural. `close()` é idempotente e libera lock de escritor; sessão fechada rejeita leitura/escrita.

Erros de domínio expõem `code`: `LOCKED`, `READONLY`, `CONFLICT`, `OPERATION_REUSED`, `VALIDATION`, `SCHEMA`, `CHECKSUM`, `MANIFEST`, `INTEGRITY`, `CLOSED`, `UNSUPPORTED`. Erros de filesystem/SQLite também podem ocorrer; este módulo não deve ser exposto diretamente à UI sem redação de mensagens.

## Verificação e limites

- Revisões monotônicas e comandos idempotentes persistidos na mesma transação.
- Um escritor cooperante por pacote, com lock SQLite auxiliar mantido pela conexão; leitor pode abrir o principal em paralelo. Outro cliente SQLite que ignore o contrato pode contornar essa coordenação.
- Backup independente de WAL/SHM via imagem consistente; manifesto fixo com hashes e contagens; rejeição de arquivos extras, symlinks diretos, tamanho acima de 256 MiB e histórico inconsistente.
- Restore valida antes e depois da cópia em staging e nunca substitui um diretório preexistente.
- Fsync explícito de arquivos/diretórios na prova Linux. Crash durante publicação pode deixar destino incompleto que exige inspeção; não há limpeza automática de artefatos de crash.
- Testes com SIGKILL simulam término de processo, não queda de energia. Falta de disco, Windows/macOS, volumes de rede e atacante local com acesso simultâneo aos arquivos não foram validados.
- Não há migração do JSON, integração com UI, esquema final normalizado, assets, retenção ou UI de recuperação. Hash não autentica origem do backup. G1 continua pendente.
