// Declarative scaffolds, not claims of specialized codecs or screenplay/layout engines.
export const projectCatalog=[
 {id:'blank',name:'Página em branco',type:'custom',folder:null,scene:null,research:[]},
 {id:'novel',name:'Romance',type:'novel',folder:'Capítulo 1',scene:'A primeira cena',research:['Personagens','Lugares','Ideias e referências']},
 {id:'short-story',name:'Conto',type:'short-story',folder:'Conto',scene:'Abertura',research:['Personagens','Cenários','Notas de revisão']},
 {id:'novella',name:'Novela',type:'novella',folder:'Capítulo 1',scene:'Abertura',research:['Elenco','Arco narrativo','Referências']},
 {id:'nonfiction',name:'Não ficção / ensaio',type:'nonfiction',folder:'Introdução',scene:'Uma ideia central',research:['Fontes e referências','Perguntas de pesquisa']},
 {id:'article',name:'Artigo / reportagem',type:'article',folder:'Artigo',scene:'Pauta e abertura',research:['Fontes','Entrevistas','Apuração']},
 {id:'scientific',name:'Artigo científico',type:'scientific',folder:'Artigo',scene:'Questão e objetivos',research:['Bibliografia','Método e dados','Anexos']},
 {id:'thesis',name:'Tese / dissertação / monografia',type:'thesis',folder:'Introdução',scene:'Problema e objetivos',research:['Bibliografia','Dados e método','Apêndices']},
 {id:'screenplay',name:'Roteiro audiovisual',type:'screenplay',folder:'Ato I',scene:'Cena 1',research:['Personagens','Locações','Pesquisa de produção']},
 {id:'theatre',name:'Peça teatral',type:'theatre',folder:'Ato I',scene:'Cena 1',research:['Elenco','Cenografia','Rubricas e produção']},
 {id:'comics',name:'Quadrinhos / graphic novel',type:'comics',folder:'Página 1',scene:'Quadro 1',research:['Personagens','Referências visuais','Diálogos e produção']},
 {id:'poetry',name:'Poesia / coletânea',type:'poetry',folder:'Poemas',scene:'Primeiro poema',research:['Temas','Notas e referências']},
 {id:'anthology',name:'Crônicas / antologia',type:'anthology',folder:'Textos',scene:'Primeiro texto',research:['Ordem e créditos','Notas de revisão']},
 {id:'podcast',name:'Podcast / áudio',type:'podcast',folder:'Episódio 1',scene:'Abertura',research:['Pautas e fontes','Indicações sonoras','Produção']},
 {id:'interactive',name:'Jogo / narrativa interativa',type:'interactive',folder:'Cenas',scene:'Entrada',research:['Personagens','Escolhas e regras (planejamento)','Cânone']},
 {id:'technical',name:'Técnico / educacional',type:'technical',folder:'Módulo 1',scene:'Objetivos e introdução',research:['Fontes','Exemplos e exercícios','Glossário']},
 {id:'translation-book',name:'Tradução — livro',type:'translation',folder:null,scene:null,research:['Originais para tradução','Glossário e decisões terminológicas','Briefing e revisão']},
 {id:'translation-article',name:'Tradução — artigo',type:'translation',folder:null,scene:null,research:['Originais para tradução','Glossário e decisões terminológicas','Briefing e revisão']},
 {id:'translation-document',name:'Tradução — documento',type:'translation',folder:null,scene:null,research:['Originais para tradução','Glossário e decisões terminológicas','Briefing e revisão']},
 {id:'translation-other',name:'Tradução — outros textos',type:'translation',folder:null,scene:null,research:['Originais para tradução','Glossário e decisões terminológicas','Briefing e revisão']}
].map(t=>({...t,version:1,support:'Estrutura editável e editor de texto/visual. Exportação geral nos formatos já disponíveis; sem motor especializado, FDX, grafo executável ou diagramação automática.'}));
export const projectTypes=new Set(projectCatalog.map(t=>t.type));
export function templateDefinition(id){const value=projectCatalog.find(t=>t.id===id);if(!value)throw new Error('Modelo inválido');return value;}
