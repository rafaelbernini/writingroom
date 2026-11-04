const sans='"Segoe UI", system-ui, sans-serif',serif='Georgia, "Times New Roman", serif',mono='"Cascadia Mono", "Consolas", "Liberation Mono", monospace';
function theme(id,name,family,mode,colors,style={}){
 const [bg,surface,panel,ink,muted,line,accent,soft,primary,primaryInk]=colors;
 return {id,name,family,mode,tokens:{'bg':bg,'surface':surface,'panel':panel,'ink':ink,'muted':muted,'line':line,'accent':accent,'accent-soft':soft,'primary-bg':primary||accent,'primary-ink':primaryInk||'#ffffff','header-bg':style.header||bg,'header-ink':style.headerInk||ink,'ui-font':style.font||sans,'heading-font':style.heading||sans,'theme-editor-font':style.editor||serif,'control-radius':style.radius||'7px','theme-shadow':style.shadow||'0 6px 22px #00000014'}};
}
export const themes=[
 {id:'system',name:'Adaptar ao sistema',family:'Automático',mode:'system',description:'Acompanha a preferência claro/escuro do sistema; usa as cores do WritingRoom.'},
 theme('classic-light','WritingRoom claro','WritingRoom','light',['#f5f3ed','#fffefa','#eeeee6','#282f29','#56604f','#c8cdbf','#47644a','#e3eadb'],{heading:serif}),
 theme('classic-dark','WritingRoom escuro','WritingRoom','dark',['#202720','#252e27','#1d241e','#e2e6da','#b2bcaa','#52634f','#b8d7a3','#354633','#48603c'],{heading:serif}),
 theme('win10-light','Windows 10 claro','Windows 10','light',['#f3f3f3','#ffffff','#e7e7e7','#1b1b1b','#525252','#b5b5b5','#005a9e','#e0edf9'],{radius:'1px'}),
 theme('win10-dark','Windows 10 escuro','Windows 10','dark',['#202020','#292929','#171717','#f5f5f5','#bdbdbd','#626262','#85c9ff','#17354e','#005a9e'],{radius:'1px'}),
 theme('win11-light','Windows 11 claro','Windows 11','light',['#f3f5fa','#ffffff','#e9edf5','#1c2433','#515d70','#bec8d8','#005fb8','#e4eefc'],{radius:'10px',shadow:'0 8px 28px #173a6420'}),
 theme('win11-dark','Windows 11 escuro','Windows 11','dark',['#1c2029','#252a35','#171b23','#f1f5fd','#b6c2d5','#546174','#8ac7ff','#243e5b','#005a9e'],{radius:'10px'}),
 theme('office365-light','Office 365 claro','Office 365','light',['#f5f5f5','#ffffff','#eeeeee','#242424','#595959','#c1c1c1','#a4262c','#fbe8e9','#a4262c'],{header:'#9b242a',headerInk:'#ffffff',radius:'5px'}),
 theme('office365-dark','Office 365 escuro','Office 365','dark',['#202020','#292929','#181818','#f5f5f5','#bfbfbf','#626262','#ffb4ac','#512c2a','#a4262c'],{header:'#6c2025',headerInk:'#ffffff',radius:'5px'}),
 theme('office2010-light','Office 2010 claro','Office 2010','light',['#eef3fa','#ffffff','#dce7f5','#1d2c44','#4b5e79','#aabdd6','#254f8e','#dde9fa','#254f8e'],{header:'#dce7f5',radius:'3px'}),
 theme('retro','Retrô de escritório','Retrô','light',['#c7c7c7','#f7f5e8','#b8b8b8','#151515','#393939','#686868','#000080','#e0e0f2','#000080'],{radius:'0px',editor:mono,heading:mono,font:mono,header:'#000080',headerInk:'#ffffff',shadow:'3px 3px 0 #555555'}),
 theme('gnome50-light','GNOME 50 claro','GNOME 50','light',['#f6f5f4','#ffffff','#eae8e5','#242424','#55504b','#c2beb8','#1a5fb4','#e4edfa'],{radius:'12px',font:'"Cantarell", system-ui, sans-serif'}),
 theme('gnome50-dark','GNOME 50 escuro','GNOME 50','dark',['#222226','#303034','#1c1c20','#f4f3f1','#c0bdb8','#65636a','#9dc6ff','#243d5a','#1a5fb4'],{radius:'12px',font:'"Cantarell", system-ui, sans-serif'}),
 theme('macos-light','macOS claro','macOS','light',['#f2f2f5','#ffffff','#e7e7ec','#22232a','#565762','#babac6','#005bb5','#e1edff'],{radius:'9px',font:'-apple-system, BlinkMacSystemFont, system-ui, sans-serif',header:'#e7e7ec'}),
 theme('macos-dark','macOS escuro','macOS','dark',['#202024','#2b2b30','#18181c','#f4f4f8','#bebecb','#60606e','#91bfff','#293d5c','#005bb5'],{radius:'9px',font:'-apple-system, BlinkMacSystemFont, system-ui, sans-serif'}),
 theme('plasma6-light','KDE Plasma 6 claro','KDE Plasma 6','light',['#eff0f1','#ffffff','#e3e5e7','#232629','#50575c','#b4bac0','#005d96','#dcecf8'],{radius:'5px',font:'"Noto Sans", system-ui, sans-serif'}),
 theme('plasma6-dark','KDE Plasma 6 escuro','KDE Plasma 6','dark',['#232629','#2a2e32','#1b1e20','#eff0f1','#b8c1c7','#59656d','#83cbff','#233d50','#005d96'],{radius:'5px',font:'"Noto Sans", system-ui, sans-serif'}),
 theme('wordstar4','WordStar 4 — terminal azul','Terminal','dark',['#000080','#000066','#00004d','#ffffff','#ccccff','#aaaaff','#ffff66','#17175f','#ffff66','#00004d'],{radius:'0px',font:mono,heading:mono,editor:mono,shadow:'none'}),
 theme('dos-colors','DOS colorido','Terminal','dark',['#101030','#171742','#080824','#ffffcc','#c8c8ee','#8888bb','#66ffff','#18384d','#ffff66','#101030'],{radius:'0px',font:mono,heading:mono,editor:mono,header:'#4d165e',headerInk:'#ffffcc',shadow:'3px 3px 0 #713c86'}),
 theme('playful','Cores divertidas','Colorido','light',['#fff3e5','#fffdf8','#f1e5ff','#34234f','#64506e','#b8a4c8','#613595','#eee0ff','#613595'],{radius:'15px',header:'#613595',headerInk:'#ffffff',shadow:'0 7px 24px #6734a12a'})
];
export function appearancePreference(raw,legacy){
 try{const value=JSON.parse(raw);if(value?.version===1&&themes.some(t=>t.id===value.theme))return {version:1,theme:value.theme};}catch{}
 return {version:1,theme:legacy==='dark'?'classic-dark':legacy==='light'?'classic-light':'system'};
}
export function resolveTheme(id,dark=false){return themes.find(t=>t.id===(id==='system'?(dark?'classic-dark':'classic-light'):id))||themes.find(t=>t.id==='classic-light');}
