# WritingRoom

**Um estúdio de escrita para organizar ideias, desenvolver manuscritos e preparar publicações — com seus projetos no seu computador.**

WritingRoom é um projeto open source para escrita longa: romances, contos, não ficção, pesquisa e tradução. Reúne biblioteca, editor, planejamento, referências e revisão em uma aplicação local acessada pelo navegador.

**Versão atual: 0.1.0-alpha.20.** Alpha funcional em desenvolvimento, com interface em português brasileiro. O aplicativo roda em um servidor local e pode ser usado offline após a instalação das dependências, sem conta obrigatória ou CDN.

## O que você pode fazer

- **Escrever e organizar:** criar projetos a partir de modelos, estruturar pastas e cenas, usar editor textual ou visual, modo foco, temas e metas de escrita.
- **Planejar:** trabalhar com cartões, outline, sinopses, etiquetas e fichas de personagens, lugares e outros elementos da obra.
- **Pesquisar:** reunir fontes, referências e anexos, extrair texto de formatos suportados e vincular material às cenas.
- **Revisar:** comentar trechos, guardar versões, comparar alterações e avaliar propostas no modo Editor local.
- **Traduzir:** trabalhar com original e tradução lado a lado, glossário por obra e acompanhamento do estado dos trechos.
- **Ler e publicar:** acompanhar o manuscrito contínuo e exportar TXT, Markdown, HTML, DOCX básico e EPUB experimental. A impressão do navegador permite salvar PDF.
- **Preservar o trabalho:** criar backups verificáveis, restaurar em um novo projeto e usar a central de backup local.
- **Trocar revisões offline:** experimentar pacotes editoriais cifrados, assinaturas e rodadas de devolutivas conforme os limites documentados.

A interface também tem ajustes para telas pequenas. A validação em aparelhos físicos e teclados virtuais ainda está pendente.

## Executar localmente

Requer **Node.js 20 ou superior** e npm para a aplicação. Para executar toda a suíte, use uma versão com `node:sqlite`; a validação mais recente foi feita no Node.js 26. As verificações HTTPS também utilizam o executável OpenSSL.

```bash
git clone https://github.com/rafaelbernini/writingroom.git
cd writingroom
npm ci --ignore-scripts
npm start
```

Abra **http://127.0.0.1:4173**. O servidor escuta apenas na interface local. Para desenvolver com reinício automático do servidor:

```bash
npm run dev
```

Os comandos de inicialização geram o bundle local do editor. Para gerar apenas esse bundle, execute `npm run build:editor`.

## Seus dados

Os projetos ficam em `writingroom-projects/` e os backups locais, por padrão, em `writingroom-backups/`. É possível configurar outros destinos; consulte o [guia do estúdio](docs/development/USING_STUDIO.md) e a [documentação da central de backup](docs/architecture/adr/0014-local-backup-center.md).

Mantenha uma cópia independente de trabalhos importantes antes de experimentar a alpha. Use uma única instância do servidor ou CLI para editar cada projeto. Os projetos, backups e arquivos privados são excluídos do versionamento.

## Estado e limites

O armazenamento da interface atual usa arquivos JSON. A prova SQLite em `packages/storage-spike/` é separada do aplicativo. A persistência atual ainda não oferece garantias de produção contra falhas de energia ou edição concorrente entre processos.

A importação de manuscritos aceita TXT e Markdown. A extração de texto de anexos PDF/DOCX/ODT não equivale à importação completa de uma obra com sua formatação. DOCX tem exportação básica, EPUB é experimental e o PDF depende da impressão do navegador.

Sincronização, colaboração online, login de produção, instaladores desktop e IA integrada ainda não estão disponíveis. Os estudos de autenticação, dispositivos e recuperação em `packages/sharing-spike/` usam dados sintéticos e permanecem isolados da interface. Eles não representam um serviço online ou E2EE de produção.

## Desenvolvimento e validação

```bash
npm test
```

A suíte usa dados sintéticos e diretórios temporários. Os testes de transporte abrem servidores HTTP/HTTPS locais; o ambiente precisa permitir sockets de loopback. A execução mais recente em 4 de novembro de 2026 aprovou **390 testes**, sem falhas ou testes ignorados. Scripts adicionais em `scripts/` verificam fluxos no Firefox e arquivos exportados, com ferramentas específicas descritas na documentação.

| Caminho | Conteúdo |
| --- | --- |
| `apps/web/` | Interface e servidor local |
| `packages/core/` | Modelo, operações e testes |
| `packages/editor/` | Editor visual baseado em ProseMirror |
| `packages/storage-spike/` | Prova de armazenamento SQLite |
| `packages/sharing-spike/` | Estudos isolados de compartilhamento e confiança |
| `scripts/` | Build e verificações complementares |
| `docs/` | Especificações, decisões e evolução |

## Documentação e participação

- [Como usar o estúdio](docs/development/USING_STUDIO.md)
- [Progresso e evidências](docs/development/PROGRESS.md)
- [Histórico de mudanças](docs/development/CHANGELOG.md)
- [Especificação do projeto](docs/specifications/writingroom_SPEC_v1.0.md)
- [Decisões de arquitetura](docs/architecture/adr/)
- [Retomar o desenvolvimento](RETOMAR_PROXIMA_SESSAO.md)
- [Histórico detalhado do README anterior](docs/development/HISTORICO_README.md)
- [Como contribuir](CONTRIBUTING.md) e [política de segurança](SECURITY.md)

Contribuições são bem-vindas. Abra uma issue com o problema ou a proposta e os critérios de aceite. Use exemplos sintéticos ao relatar erros e preserve a privacidade dos manuscritos.

## Licença

Código sob [Apache License 2.0](LICENSE). Consulte também o [inventário de dependências e avisos de terceiros](docs/architecture/EDITOR_DEPENDENCIES.md).
