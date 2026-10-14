import {escapeHTML,renderArticleText} from '/blog-format.js';
const $=s=>document.querySelector(s),form=$('#post-form'),dialog=$('#post-dialog'),fields=$('#post-fields');
const keys=['title','slug','excerpt','content','cover_image','external_url'];
let current=null,baseline='',busy=false,requestInFlight=false;
const values=()=>Object.fromEntries(keys.map(k=>[k,form.elements[k].value]));
const dirty=()=>dialog.open&&JSON.stringify(values())!==baseline;
function message(text,error=false){const el=$('#post-feedback');el.textContent=text;el.className='feedback '+(error?'error':'success');}
async function request(path,method='GET',body){const r=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const result=await r.json();if(!r.ok)throw Error(result.error||'Não foi possível concluir agora.');return result;}
function node(tag,text,cls){const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;}
function describe(post){return post.published?(post.has_unpublished_changes?'Publicado · rascunho com alterações':'Publicado'):'Rascunho · visível somente para administradores';}
async function load(){
 const list=$('#post-list');list.replaceChildren(node('p','Carregando artigos…','panel-title'));
 try{
  const {posts}=await request('/api/admin/posts');list.replaceChildren();
  if(!posts.length){list.append(node('p','Você ainda não criou artigos. Comece por “Novo artigo”.','panel-title'));return;}
  for(const post of posts){const row=node('article',null,'user-row'),info=node('div',null,'user-meta'),actions=node('div',null,'user-actions');info.append(node('strong',post.title),node('small',describe(post)));const edit=node('button','Editar artigo','button outline');edit.type='button';edit.addEventListener('click',()=>open(post.id));actions.append(edit);
   if(post.published){const link=node('a','Abrir no site ↗','text-link');link.href='/blog/'+post.slug;link.target='_blank';link.rel='noopener noreferrer';const copy=node('button','Copiar link','button outline');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.origin+'/blog/'+post.slug);copy.textContent='Link copiado!';}catch{copy.textContent='Abra o artigo e copie o endereço';}});actions.append(link,copy);}
   row.append(info,actions);list.append(row);
  }
 }catch(error){list.replaceChildren(node('p',error.message,'panel-title feedback error'));throw error;}
}
function fill(post){current=post;form.reset();for(const k of keys)form.elements[k].value=post?.[k]||'';form.elements.slug.readOnly=!!post;$('#post-editor-title').textContent=post?'Editar artigo':'Novo artigo';$('#unpublish-post').hidden=!post?.published;const link=$('#post-public-link');link.hidden=!post?.published;if(post?.published)link.href='/blog/'+post.slug;$('#post-state').textContent=post?describe(post):'O rascunho só aparece para administradores.';$('#post-preview').hidden=true;baseline=JSON.stringify(values());message('');}
async function open(id){if(requestInFlight)return;requestInFlight=true;try{fill(id?(await request('/api/admin/posts/'+id)).post:null);dialog.showModal();}catch(error){$('#global-feedback').textContent=error.message;}finally{requestInFlight=false;}}
$('#new-post').addEventListener('click',()=>open());
function close(){if(busy)return;if(dirty()&&!confirm('Descartar as alterações ainda não salvas neste artigo?'))return;dialog.close();}
$('#close-post').addEventListener('click',close);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});window.addEventListener('beforeunload',event=>{if(dirty()||busy){event.preventDefault();event.returnValue='';}});
form.elements.title.addEventListener('input',()=>{if(!current&&!form.elements.slug.dataset.custom)form.elements.slug.value=form.elements.title.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');});
form.elements.slug.addEventListener('input',()=>{form.elements.slug.dataset.custom='1';});
dialog.addEventListener('close',()=>{delete form.elements.slug.dataset.custom;});
$('#post-file').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>700*1024){event.target.value='';message('Escolha uma imagem PNG, JPG ou WebP de até 700 KB.',true);return;}
 busy=true;fields.disabled=true;message('Carregando capa…');try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file);});form.elements.cover_image.value=data;message('Capa carregada. Salve o rascunho ou publique para guardar.');}catch(error){message(error.message,true);}finally{busy=false;fields.disabled=false;}
});
$('#post-preview-toggle').addEventListener('click',()=>{const p=values(),preview=$('#post-preview');preview.innerHTML=`<h2>${escapeHTML(p.title)}</h2><p>${escapeHTML(p.excerpt)}</p><div class="article-content">${renderArticleText(p.content)}</div>`;preview.hidden=false;});
async function save(action){
 if(busy||!form.reportValidity())return;if(action==='unpublish'&&!confirm('Retirar este artigo do site? O conteúdo continuará salvo no admin.'))return;
 const body={...values(),action,...(current?{version:current.version}:{})};busy=true;fields.disabled=true;message('Salvando…');
 try{const {post}=await request('/api/admin/posts'+(current?'/'+current.id:''),current?'PUT':'POST',body);fill(post);message(action==='publish'?'Artigo publicado. Os visitantes já podem ler.':action==='unpublish'?'Artigo retirado do site. O rascunho foi preservado.':'Rascunho salvo. A versão pública continua como estava.');try{await load();}catch{message('Artigo salvo. Reabra a aba Blog para atualizar a lista.');}}
 catch(error){message(error.message,true);}finally{busy=false;fields.disabled=false;}
}
form.addEventListener('submit',event=>{event.preventDefault();save(event.submitter?.value||'draft');});$('#unpublish-post').addEventListener('click',()=>save('unpublish'));
window.finelineBlog={load};
