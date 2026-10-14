'use strict';
// Catálogo CSV: sem scraping / sem credenciais / sem acesso a lojas de terceiros.
(() => {
 const $=s=>document.querySelector(s);
 const STORE='https://shopee.com.br/vini.store_';
 const state={verified:[],csv:[]};
 const uiFeedback=(msg,error=false)=>{const el=$('#shopee-catalog-feedback');el.textContent=msg;el.className='feedback '+(error?'error':'success');};
 const setBusy=(busy)=>{for(const id of ['shopee-preview','shopee-import-verified','shopee-csv-preview','shopee-csv-import'])$('#'+id).disabled=busy;$('#shopee-csv-import').disabled=busy||!state.csv.length;};
 const fetchAPI=async (url,method='GET',payload)=>{
  const resp=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined});
  let data;try{data=await resp.json();}catch{throw new Error('O servidor não devolveu JSON. Confirme seu login.');}
  if(!resp.ok)throw new Error(data.error||'Falha de comunicação.');
  return data;
 };
 const tile=(p)=>{
  const card=document.createElement('article');card.className='shopee-import-item';
  const photo=document.createElement('img');photo.src=p.image_url||p.img||'/assets/logo.png';photo.loading='lazy';photo.alt='';
  photo.addEventListener('error',()=>{if(!photo.src.endsWith('/assets/logo.png'))photo.src='/assets/logo.png';},{once:true});
  const title=document.createElement('strong');title.textContent=p.title||p.nome;
  const price=document.createElement('small');price.textContent=p.price||p.preco||'Preço na Shopee';
  card.append(photo,title,price);return card;
 };
 const render=(arr)=>{$('#shopee-import-preview').replaceChildren(...arr.slice(0,100).map(tile));};
 async function previewVerified(){setBusy(true);uiFeedback('Consultando anúncios previamente verificados...');try{const r=await fetchAPI('/api/admin/shopee/preview');state.verified=r.products;render(state.verified);uiFeedback(`${r.products.length} anúncios reais da loja Fine Line 3D (verificados em ${r.verifiedAt}). Confira as fotos e depois clique em Publicar.`);}catch(e){uiFeedback(e.message,true);}finally{setBusy(false);}}
 async function importItems(mode,arr){
  if(!confirm(`Importar ${arr.length} anúncio(s) reais para a landing page? ${$('#shopee-hide-demo').checked?'Produtos de demonstração ainda inalterados ficarão ocultos.':'Produtos de demonstração permanecerão como estão.'} Nenhum registro será excluído.`))return;
  setBusy(true);uiFeedback('Atualizando catálogo...');try{
   const result=await fetchAPI('/api/admin/shopee/import','POST',{mode,...(mode==='csv'?{products:arr}:{}),replaceDemo:$('#shopee-hide-demo').checked});
   uiFeedback(`Concluído: ${result.imported} anúncio(s); ${result.created} novo(s), ${result.updated} atualizado(s); ${result.demonstrationHidden} produto(s) de demonstração ocultado(s). A landing page usa esses dados imediatamente.`);
   window.dispatchEvent(new CustomEvent('finelinex-catalog-synced'));
  }catch(e){uiFeedback(e.message,true);}finally{setBusy(false);}
 }
 // Parser CSV com aspas, escape de aspas e linhas multilinha.
 function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0];const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  let rows=[],row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
   const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
   else if(ch===delimiter&&!quoted){row.push(field);field='';}
   else if((ch==='\r'||ch==='\n')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}
   else field+=ch;
  }
  if(quoted)throw new Error('O CSV contém aspas sem fechamento.');
  row.push(field);if(row.some(x=>x.trim()))rows.push(row);
  if(rows.length<2)throw new Error('Preencha o modelo CSV com ao menos um anúncio.');
  const key=k=>k.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[\s-]+/g,'_');
  const header=rows.shift().map(key);
  const pick=(o,...keys)=>keys.map(k=>o[k]).find(v=>v!==undefined)||'';
  const parsed=rows.map((line,i)=>{
   const record=Object.fromEntries(header.map((key,j)=>[key,(line[j]||'').trim()]));
   const r={title:pick(record,'nome','titulo','title','nome_do_produto'),product_url:pick(record,'link','url','product_url','link_do_anuncio','link_shopee'),image_url:pick(record,'foto','imagem','image_url','url_da_imagem'),price:pick(record,'preco','price','valor'),category:pick(record,'categoria','category','tag'),description:pick(record,'descricao','description','desc')};
   if(!r.title||!r.product_url||!r.image_url)throw new Error(`Linha ${i+2}: informe nome, link do anúncio e URL da foto.`);
   return r;
  });
  if(parsed.length>100)throw new Error('Importe até 100 produtos por lote.');
  return parsed;
 }
 $('#shopee-preview').addEventListener('click',previewVerified);
 $('#shopee-import-verified').addEventListener('click',async()=>{if(!state.verified.length)await previewVerified();if(state.verified.length)await importItems('verified',state.verified);});
 $('#shopee-csv-preview').addEventListener('click',async()=>{
  const f=$('#shopee-csv-file').files?.[0];if(!f){uiFeedback('Selecione um arquivo CSV primeiro.',true);return;}
  if(f.size>400000){uiFeedback('O CSV deve ter até 400 KB.',true);return;}
  setBusy(true);try{state.csv=parseCSV(await f.text());render(state.csv);uiFeedback(`Prévia pronta: ${state.csv.length} anúncios. Confirme se os links pertencem à sua loja ${STORE}.`);}catch(e){state.csv=[];uiFeedback(e.message,true);}finally{setBusy(false);}
 });
 $('#shopee-csv-import').addEventListener('click',()=>importItems('csv',state.csv));

})();
