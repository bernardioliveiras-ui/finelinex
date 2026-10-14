/* Blog 3D: somente painel autenticado. CRUD protegido e autorizado NO WORKER. */
export function iniciarBlogAdmin(root=document) {
 const form=root.querySelector('#fineline-blog-form');if(!form)return;
 const list=root.querySelector('#fineline-blog-admin-list');const message=root.querySelector('#fineline-blog-admin-message');
 const newBtn=root.querySelector('#fineline-blog-new');const BASE='/api/fineline/admin/blog';
 let currentId=null, posts=[];
 const create=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const feedback=(msg,bad=false)=>{message.textContent=msg;message.style.color=bad?'#b52828':'#187348'};
 async function api(url,options={}) {
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
  let result;try{result=await response.json();}catch{throw Error('A API não retornou JSON. Verifique as rotas do Worker.');}
  if(!response.ok||!result.ok)throw Error(result.error||('Falha HTTP '+response.status));return result;
 }
 function reset(){currentId=null;form.reset();feedback('Pronto para criar um artigo.');form.querySelector('[name=title]').focus()}
 function edit(post) {
  currentId=post.id;
  for(const key of ['title','slug','excerpt','body','coverImageUrl'])form.elements[key].value=post[key]||'';
  feedback('Editando: '+post.title);form.scrollIntoView({behavior:'smooth',block:'start'});
 }
 async function save(status) {
  const values=Object.fromEntries(new FormData(form).entries());values.status=status;
  const id=currentId;
  const url=id?BASE+'/'+encodeURIComponent(id):BASE;
  const result=await api(url,{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});
  currentId=result.post.id;feedback(status==='published'?'Artigo publicado. Já disponível na landing page.':'Rascunho salvo.');await load();
 }
 async function changeStatus(post,status) {
  try{const body=JSON.stringify({status});await api(BASE+'/'+encodeURIComponent(post.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body});feedback(status==='published'?'Artigo publicado.':'Artigo retirado do ar.');await load()}
  catch(e){feedback(e.message,true)}
 }
 async function remove(post) {
  if(!confirm('Excluir definitivamente o artigo "'+post.title+'"?'))return;
  try{await api(BASE+'/'+encodeURIComponent(post.id),{method:'DELETE'});if(currentId===post.id)reset();feedback('Artigo excluído.');await load()}
  catch(e){feedback(e.message,true)}
 }
 function render() {
  list.replaceChildren();list.append(create('h3','Artigos salvos ('+posts.length+')'));
  if(!posts.length){list.append(create('p','Nenhum artigo cadastrado.'));return;}
  for (const post of posts) {
   const row=create('article');row.append(create('strong',post.title+' — '+(post.status==='published'?'Publicado':'Rascunho')));
   const p=create('p',post.excerpt||post.slug);row.append(p);
   const actions=create('div');actions.className='fineline-blog-buttons';
   const editBtn=create('button','Editar');editBtn.type='button';editBtn.onclick=()=>edit(post);actions.append(editBtn);
   const stateBtn=create('button',post.status==='published'?'Retirar do ar':'Publicar');stateBtn.type='button';stateBtn.onclick=()=>changeStatus(post,post.status==='published'?'draft':'published');actions.append(stateBtn);
   const delBtn=create('button','Excluir');delBtn.type='button';delBtn.onclick=()=>remove(post);actions.append(delBtn);
   row.append(actions);list.append(row);
  }
 }
 async function load(){try{const data=await api(BASE);posts=data.posts;render()}catch(e){feedback(e.message,true)}}
 form.addEventListener('submit',async e=>{e.preventDefault();const status=e.submitter?.dataset.status||'draft';try{await save(status)}catch(err){feedback(err.message,true)}});
 newBtn.addEventListener('click',reset);load();
}
if(typeof document!=='undefined')iniciarBlogAdmin();
