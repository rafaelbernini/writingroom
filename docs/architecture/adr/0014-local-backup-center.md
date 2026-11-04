# ADR-0014 — central de backup local verificável

2026-11-02. Estado: implementado na alpha.9/studio-8, nos limites abaixo.

Plano: serviço de backups gerenciados, configuração persistente, rotina opt-in no servidor e central visual com criar/verificar/baixar/restaurar. Testar checksums/referências, falhas, limites, symlinks, retenção e agenda; Firefox sintético e cópia privada do livro. Não modificar fonte ou backup-base. Cloud e desktop permanecem nas etapas já definidas.

Destino é configurado pelo servidor e escolhido por ID na UI, nunca um path arbitrário enviado pela API. Padrão: subpasta managed no diretório de backups, separada de backups de migração. Perfil/contatos e credenciais não entram no backup de obra. Arquivos locais não são cifrados nem necessariamente estão em outro dispositivo.

Cada geração usa diretório temporário próprio, backup JSON restaurável + manifesto de bytes/hash, releitura/validação e publicação por rename. História diferencia verificado na criação de verificação atual. Restaurar sempre cria outro projeto e remapeia referências.

Rotina é desligada por padrão, executa somente enquanto o servidor está ativo, processa projetos ativos em fila e evita cópias automáticas sem alteração. Intervalo/retenção/destino persistidos, sem prometer agendador do sistema com app fechado. Retenção só remove automáticas verificadas após nova cópia válida, nunca manuais, migrações, fonte ou cópias corrompidas. Operações de backup seguem ordem central→fila de projeto para evitar deadlock com autosave.

Não é aprovação G1 completa: lock/durabilidade entre processos/crash em todas plataformas continuam pendentes. Falha de cópia não aciona retenção nem confirma sucesso. UI deve informar limite de tamanho, última execução/erro e independência entre snapshot, backup local e backup externo.

## Contrato implementado

Configuração em .settings/backup-settings.json, resumo de execução separado e hash/CAS para edição. Destinos por ID configurados no servidor, recusando pastas internas de projeto .wroom; padrão `<WRITINGROOM_BACKUP_HOME>/managed` (o root de migração padrão continua irmão da biblioteca). Variável opcional WRITINGROOM_BACKUP_DESTINATIONS aceita objeto de IDs para paths absolutos, até oito destinos. UI mostra paths como informação e seleciona ID; não há explorador remoto de filesystem. Remover destino da configuração não apaga suas cópias, mas deixa seu histórico fora da lista até reconfigurá-lo.

Cópias gerenciadas: root/projectUUID/backupUUID/{backup.json,manifest.json}, arquivo exclusivo 0600, diretório 0700, releitura/validação, fsync e publicação por rename. Temporários .pending não aparecem como cópia concluída. Manifesto possui tipo manual/automatic, tamanho/hash externo e checksum do projeto no envelope. Até 32 MB por cópia; nenhuma promessa de volumes ilimitados. Histórico mostra até 200 gerações por filtro, sem apagar as anteriores.

Timer verifica rotina no servidor a cada minuto, inclusive sem navegador aberto. Configuração: desligado por padrão, 15/30/60/180/1440 minutos, retenção 2–50 automáticas verificadas por obra. Só projetos ativos disponíveis. Cada cópia lê o projeto confirmado sob a fila do ID; não inclui rascunhos ainda só no navegador. Obra inalterada exige conferir a cópia anterior antes de reaproveitar. Cópia corrompida dispara nova geração; corruptas/incompletas/manuais/migrações e gerações com arquivos inesperados não são removidas pela retenção.

Fila central antes da fila do projeto evita deadlock e sobreposição da rotina na mesma instância; servidor close desarma timer. Estado de execução é auxiliar: se falhar a gravação do resumo, cópia válida permanece listável com aviso. Falha de retenção também é aviso, sem remover a nova geração. Erro da cópia não entra na etapa de retenção. Falha global de configuração/estado interrompe rotina e exige conferir a central; não sobrescrever arquivos inválidos com defaults.

Restore verifica de novo e usa remapeamento existente para novo projeto, sem trocar original. Download é o envelope JSON verificável, compatível com Restaurar backup da biblioteca. Arquivados podem receber cópia manual pela central, mas não entram na rotina. Perfil/contatos não acompanham as obras.

## Evidências

Baseline 151 → 162 testes Node, zero falhas/skips: sete de store/política/retencão/limites/corrupção/symlink e quatro HTTP de fluxo, opt-in/deduplicação, falha e temporizador real sem browser. 69 verificações Firefox Linux, incluindo histórico por filtro, criar/verificar/baixar, configuração persistida, rotina, alteração posterior e restore de geração anterior. DOCX LibreOffice e EPUB estrutural mantidos; EPUBCheck ausente. Caso privado longo: 23 verificações numa cópia isolada, com backup gerenciado/restore e rotina sem mudanças; pacote-base e fonte intactos. PROGRESS registra artefatos.

Não equivale a agendador do OS, backup externo, criptografia, lock entre processos ou certificação de crash/energia em todas plataformas. Não há exclusão manual de cópias pela UI, inclusão automática do perfil, retenção de manuais ou cópias de migração no histórico gerenciado. G1 continua parcial. Próximo: comparação lado a lado/revisão local e sessão de publicação; recursos remotos seguem gates próprios.
