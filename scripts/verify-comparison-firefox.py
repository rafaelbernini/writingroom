"""Version comparison against two saved snapshots in a fresh isolated Firefox profile."""
from pathlib import Path
filename=str(Path(__file__).with_name('verify-studio-firefox.py'));source=Path(filename).read_text();prefix=source.split(" screenshot('01-library.png')")[0];cleanup=source[source.index('\nexcept Exception:\n try:\n  screenshot')+1:]
body=''' js('document.getElementById("newProjectBtn").click();return true;');wait('document.getElementById("newProjectDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("newProjectName").value="Comparação editorial";document.getElementById("projectTemplate").value="novel";document.getElementById("newProjectForm").requestSubmit();return true;');wait('document.getElementById("documentTitle").value==="A primeira cena" && !document.getElementById("workspace").inert')
 a='Primeira linha.\\nTexto antigo 🌱.\\nFim.';b='Primeira linha.\\nTexto novo 🌱.\\nFim.';c=b+'\\n<script>literal</script>'
 for text,label in [(a,'Marco A'),(b,'Marco B')]:
  js('document.getElementById("editor").value='+json.dumps(text)+';document.getElementById("editor").dispatchEvent(new Event("input"));document.getElementById("snapshotBtn").click();return true;');accept_alert(label);wait('document.getElementById("saveStatus").textContent.includes("Versão guardada") && !document.getElementById("workspace").inert')
 js('document.getElementById("editor").value='+json.dumps(c)+';document.getElementById("editor").dispatchEvent(new Event("input"));document.getElementById("versionsBtn").click();return true;');wait('document.getElementById("versionsDialog").open && !document.getElementById("workspace").inert')
 js('document.getElementById("openComparisonBtn").click();return true;');wait('document.getElementById("comparisonDialog").open && document.querySelectorAll(".version-diff-row").length>0 && !document.getElementById("workspace").inert')
 js('for(const [id,label] of [["comparisonLeft","Marco A"],["comparisonRight","Marco B"]]){const s=document.getElementById(id);s.value=Array.from(s.options).find(o=>o.textContent.startsWith(label)).value;}document.getElementById("comparisonRunBtn").click();return true;');wait('document.getElementById("comparisonLeftLabel").textContent.includes("Marco A") && !document.getElementById("workspace").inert')
 assert 'Texto antigo' in js('return document.querySelector("#comparisonRows .version-diff-row[data-kind=change] .version-diff-cell:first-child").textContent')
 assert 'Texto novo' in js('return document.querySelector("#comparisonRows .version-diff-row[data-kind=change] .version-diff-cell:last-child").textContent')
 screenshot('01-two-saved-versions.png')
 js('document.getElementById("comparisonSwapBtn").click();return true;');wait('document.getElementById("comparisonLeftLabel").textContent.includes("Marco B") && !document.getElementById("workspace").inert')
 js('document.getElementById("comparisonOnlyChanges").checked=true;document.getElementById("comparisonOnlyChanges").dispatchEvent(new Event("change"));document.getElementById("comparisonNextBtn").click();return true;')
 assert js('return document.querySelectorAll("#comparisonRows .version-diff-row").length')==1
 assert js('return document.activeElement.classList.contains("version-diff-row")')
 js('document.getElementById("comparisonRight").value="current";document.getElementById("comparisonRunBtn").click();return true;');wait('document.getElementById("comparisonRightLabel").textContent.includes("Texto atual") && !document.getElementById("workspace").inert')
 assert '<script>literal</script>' in js('return document.getElementById("comparisonRows").textContent')
 assert js('return document.querySelectorAll("#comparisonRows script").length')==0
 command('WebDriver:SetWindowRect',{'width':500,'height':900});wait('window.innerWidth<=500')
 assert js('return document.getElementById("comparisonDialog").getBoundingClientRect().width<=window.innerWidth')
 assert js('return document.getElementById("comparisonDialog").scrollWidth<=document.getElementById("comparisonDialog").clientWidth')
 screenshot('02-comparison-mobile.png')
 js('document.querySelector("#comparisonDialog [data-close]").click();document.getElementById("closeVersionsBtn").click();return true;');wait('!document.getElementById("versionsDialog").open')
 assert js('return document.getElementById("editor").value')==c
 with urllib.request.urlopen(url+'/api/projects') as response:project_id=json.load(response)[0]['id']
 with urllib.request.urlopen(url+'/api/projects/'+project_id) as response:p=json.load(response)
 assert len(p['snapshots'])==2 and c in p['documents'].values()
 print(json.dumps({'ok':True,'checks':['compare-two-saved-versions','compare-swap-filter-navigation','compare-current-literal-readonly','compare-mobile'],'artifacts':str(artifacts)}),flush=True)
'''
exec(compile(prefix+body+cleanup,filename,'exec'),{'__file__':filename,'__name__':'__main__'})
