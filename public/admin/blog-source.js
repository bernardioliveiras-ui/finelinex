const form=document.querySelector('#blog-source-form'),feedback=document.querySelector('#source-feedback');
let version=0;
async function request(method='GET',body,sync=false){const r=await fetch('/api/admin/blog-source'+(sync?'/sync':''),{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});let data;try{data=await r.json();}catch{throw Error('O servidor não respondeu. Tente novamente.');}if(!r.ok)throw Error(data.error||'Não foi possível acessar a conexão.');return data.source;}
function show(source){version=source.version;form.elements.url.value=source.url;form.elements.enabled.checked=source.version===0?true:source.enabled;document.querySelector('#source-state').textContent=source.enabled?`${source.count} artigo(s) sincronizado(s). Última atualização: ${source.last_sync?new Date(source.last_sync).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'aguardando'}.`:'Conexão desativada. Seus artigos escritos no admin continuam no site.';document.querySelector('#source-sync').disabled=!source.enabled;feedback.textContent=source.last_error||'';feedback.className='feedback '+(source.last_error?'error':'success');}
export async function loadSource(){try{show(await request());}catch(e){feedback.textContent=e.message;feedback.className='feedback error';}}
async function action(task){const fieldset=form.querySelector('fieldset');fieldset.disabled=true;feedback.textContent='Conectando ao Blogger…';feedback.className='feedback';try{const source=await task();show(source);if(!source.last_error)feedback.textContent=source.enabled?(source.count?'Conexão atualizada. Os artigos aparecem no site.':'Conexão ativada, mas não foram encontradas postagens publicadas no feed.'):'Conexão desativada.';}catch(e){feedback.textContent=e.message;feedback.className='feedback error';}finally{fieldset.disabled=false;}}
form.addEventListener('submit',e=>{e.preventDefault();const body={url:form.elements.url.value,enabled:form.elements.enabled.checked,version};action(()=>request('PUT',body));});
document.querySelector('#source-sync').addEventListener('click',()=>action(()=>request('POST',{},true)));

document.querySelector('#source-test').addEventListener('click',async()=>{
 const fieldset=form.querySelector('fieldset');fieldset.disabled=true;
 feedback.textContent='Testando a leitura pública do feed…';feedback.className='feedback';
 try{
  const response=await fetch('/api/admin/blog-source/test',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:form.elements.url.value})});
  let data;try{data=await response.json();}catch{throw Error('O servidor não retornou um diagnóstico válido.');}
  if(!response.ok)throw Error(data.error||'O teste de conexão falhou.');
  const result=data.result;
  feedback.textContent=result.count?`Feed acessível! ${result.count} artigo(s) encontrado(s). Exemplos: ${result.titles.join('; ')}. Marque a opção e clique em Salvar conexão para publicar no site.`:'Feed acessível, mas ainda não há postagens publicadas. Publique um artigo no Blogger antes de sincronizar.';
  feedback.className='feedback success';
 }catch(e){feedback.textContent=e.message;feedback.className='feedback error';}
 finally{fieldset.disabled=false;}
});
