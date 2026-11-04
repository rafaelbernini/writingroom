# ADR-0008 — revisão em lote, caderno e publicação; desktop por último

Data: 2026-11-02. Estado: implementado no protótipo 0.1.0-alpha.3, protocolo studio-2.

## Prioridade expressa pelo usuário

“então implementetudo, deixa o desktop por ultim”. Desktop/instaladores/Tauri ficam após os recursos e a validação da aplicação atual. Essa instrução substitui a ordem desktop-first do planejamento anterior; não dispensa preservação de dados, backup ou testes. Não declarar que o catálogo inteiro do manual foi implementado.

## Decisões e funcionalidades

Busca/substituição literal no texto com escopo cena/manuscrito/projeto, case-sensitive opcional, palavra inteira Unicode e seleção por ocorrência. Prévia não grava. Fingerprint liga query, IDs do escopo, hashes de texto e offsets: mudanças de texto, consulta ou escopo invalidam aplicação com 409. Aplicação em clone validado, snapshot por documento realmente alterado e uma única gravação do agregado. Notas/títulos/metadados/capturas não são substituídos. `$&` e outros caracteres são literais, não linguagem de substituição regex.

Caderno: fichas são documentos textuais de Pesquisa, com tipo opcional e templates originais para personagem/lugar/objeto/organização/evento/conceito. Não são um grafo de relações ou banco de campos tipados. Coleções manuais guardam IDs; consultas salvas usam texto e estado. Remover referência/coleção não apaga documento; lixeira oculta membros sem apagar referências. Alterar coleções usa hash de base da lista, evitando sobrescrita cega de outra sessão na mesma instância.

Capturas: texto por projeto, hash de base, autossalvamento/cópia local e criação de cena independente, mantendo origem. Recuperar captura local sobre caderno existente guarda primeiro uma cópia em Pesquisa. Backup inclui capturas/coleções e remapeia IDs conhecidos na restauração. Campos opcionais do schema 1; sem migração de projetos na abertura.

## DOCX e EPUB básicos

Exportadores próprios sem dependências, ZIP store-only com CRC32, nomes fixos e XML escapado; limite de 100 MB e 5000 cenas. Apenas texto/títulos/autor e estrutura básica, sem interpretar todo Markdown ou inventar fidelidade de estilos/anexos/comentários. XML incompatível é rejeitado, não removido silenciosamente. Ambos usam a mesma seleção e ordem da compilação.

DOCX: partes OpenXML, estilos básicos, parágrafos e metadados. Verificado com ZIP/XML e abertura real no LibreOffice Linux, conversão para PDF e extração de texto. Isso não comprova todos os editores/versões do Word ou layout editorial complexo.

EPUB: mimetype primeiro sem compressão, container, pacote/metadados, navegação e spine. Verificado estruturalmente com Python ZIP/XML e vínculos do manifesto/spine. **Experimental**, pois EPUBCheck e leitor EPUB real não foram executados. Não declarar conformidade EPUB 3.3 certificada nem acessibilidade completa.

## Limites e testes

Busca: 300 caracteres, substituição 10 mil, 5000 ocorrências e resultado até 1,5 MB por cena. Sem regex e sem busca por formatação. Coleções: 100 por projeto, até 2000 referências cada; consultas até 300 caracteres. Capturas até 1,5 MB. Fichas/coleções não têm undo estrutural; backups e snapshots continuam necessários.

85 testes Node e 26 verificações de fluxo em Firefox real; DOCX validado no LibreOffice. UI/servidor atualizados juntos; páginas antigas devem recarregar. Não houve migração dos projetos existentes. Persistência JSON ainda tem os limites das ADRs 0001/0006/0007; SQLite continua separado.

## Referências técnicas consultadas

- [Microsoft OpenXML: documento WordprocessingML](https://learn.microsoft.com/en-us/office/open-xml/word/how-to-create-a-word-processing-document-by-providing-a-file-name).
- [W3C EPUB 3.3](https://www.w3.org/TR/epub-33/), referência de organização do contêiner/pacote, sem alegação de validação completa.
