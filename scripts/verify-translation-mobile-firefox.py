"""Focused mobile Firefox checks in a fresh isolated profile.
Reuses only the shared smoke setup/cleanup; no user projects or external requests.
Firefox headless can enforce a 500 px minimum window width.
"""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'))
s=Path(filename).read_text()
prefix=s.split(" screenshot('01-library.png')")[0]
cleanup=s[s.index('\nexcept Exception:\n try:\n  screenshot')+1:]
body=''' js('document.getElementById("newProjectBtn").click();return true;');wait('document.getElementById("newProjectDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("newProjectName").value="Tradução responsiva";document.getElementById("projectTemplate").value="translation-book";document.getElementById("newProjectForm").requestSubmit();return true;');wait('!document.getElementById("translationView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 js('document.getElementById("newTranslationBtn").click();return true;');wait('document.getElementById("translationDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("translationTitle").value="Trecho móvel";document.getElementById("translationOriginal").value="The house.";document.getElementById("translationInitial").value="A casa.";document.getElementById("translationForm").requestSubmit();return true;');wait('!document.getElementById("translationDialog").open && document.querySelectorAll("#translationCards .scene-card").length===1 && !document.getElementById("workspace").inert')
 command('WebDriver:SetWindowRect',{'width':500,'height':900})
 wait('window.innerWidth<=500')
 assert js('return document.documentElement.scrollWidth<=window.innerWidth')
 screenshot('translation-mobile.png')
 js('document.querySelector("#translationCards .translation-actions>button").click();return true;');wait('!document.getElementById("writeView").classList.contains("hidden") && !document.getElementById("workspace").inert')
 wait('document.getElementById("referencePanel").getBoundingClientRect().top>=document.getElementById("editor").getBoundingClientRect().bottom')
 assert js('return document.documentElement.scrollWidth<=window.innerWidth')
 assert js('return document.getElementById("referenceText").textContent')=='The house.'
 screenshot('translation-editor-mobile.png')
 js('document.getElementById("languageToolsBtn").click();return true;');wait('document.getElementById("languageDialog").open && !document.getElementById("workspace").inert')
 assert js('return document.getElementById("languageDialog").getBoundingClientRect().width<=window.innerWidth')
 screenshot('dictionary-mobile.png')
 print(json.dumps({'ok':True,'checks':['translation-mobile-dashboard','translation-mobile-stacked-editor','language-tools-mobile-dialog'],'viewport':js('return window.innerWidth'),'artifacts':str(artifacts)}),flush=True)
'''
exec(compile(prefix+body+cleanup,filename,'exec'),{'__file__':filename,'__name__':'__main__'})
