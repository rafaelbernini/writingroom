import {themes,appearancePreference,resolveTheme} from './themes.js';
const $=id=>document.getElementById(id),dialog=$('appearanceDialog'),query=window.matchMedia('(prefers-color-scheme: dark)');
function read(key){try{return localStorage.getItem(key);}catch{return null;}}
let committed=appearancePreference(read('writingroom.appearance'),read('writingroom.theme')),preview=committed.theme;
function paint(id){
 const theme=resolveTheme(id,query.matches);for(const [key,value] of Object.entries(theme.tokens))document.body.style.setProperty('--'+key,value);
 document.body.classList.toggle('dark',theme.mode==='dark');document.body.style.colorScheme=theme.mode;document.body.setAttribute('data-appearance',theme.id);document.body.setAttribute('data-theme-family',theme.family);
 $('appearanceCurrent').textContent=(id==='system'?'Sistema → ':'')+theme.name;$('appearanceStatus').textContent=dialog.open?'Prévia ativa. Aplicar guarda a escolha; cancelar restaura o tema anterior.':'Preferência de aparência deste navegador.';
 for(const radio of document.querySelectorAll('input[name="appearance-theme"]'))radio.checked=radio.value===id;
}
const gallery=$('appearanceGallery');
for(const theme of themes){
 const label=document.createElement('label');label.className='theme-choice';const radio=document.createElement('input');radio.type='radio';radio.name='appearance-theme';radio.value=theme.id;radio.onchange=()=>{preview=theme.id;paint(preview);};
 const sample=document.createElement('span');sample.className='theme-sample';sample.setAttribute('aria-hidden','true');const colors=resolveTheme(theme.id,query.matches).tokens;for(const [key,value] of Object.entries(colors))sample.style.setProperty('--'+key,value);
 const top=document.createElement('span');top.className='theme-sample-top';top.textContent='w.  WritingRoom';const content=document.createElement('span');content.className='theme-sample-content';content.innerHTML='<span class="theme-sample-side"></span><span class="theme-sample-paper">Aa<br/><span class="theme-sample-rule"></span><span class="theme-sample-rule short"></span></span>';sample.append(top,content);
 const name=document.createElement('span');name.className='theme-name';name.textContent=theme.name;label.append(radio,sample,name);gallery.append(label);
}
function open(){preview=committed.theme;dialog.showModal();paint(preview);dialog.querySelector('input:checked')?.focus();}
$('themeBtn').onclick=open;$('appearanceSettingsBtn').onclick=open;
$('appearanceApplyBtn').onclick=()=>{const next={version:1,theme:preview};let stored=true;try{localStorage.setItem('writingroom.appearance',JSON.stringify(next));}catch{stored=false;}committed=next;dialog.close();paint(committed.theme);if(!stored)$('saveStatus').textContent='Tema aplicado nesta sessão; o navegador não permitiu guardar a preferência.';};
$('appearanceCancelBtn').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{preview=committed.theme;paint(preview);});
query.addEventListener('change',()=>{const selected=dialog.open?preview:committed.theme;if(selected==='system')paint(selected);const sample=gallery.querySelector('input[value="system"]')?.parentElement.querySelector('.theme-sample');if(sample)for(const [key,value] of Object.entries(resolveTheme('system',query.matches).tokens))sample.style.setProperty('--'+key,value);});
paint(committed.theme);
