import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {createDatabase} from './db.mjs';
import {shopeeProducts,SHOPEE_STORE} from '../src/shopee-catalog.js';
const origin='https://finelinex.test';
const fixture=()=>({DB:createDatabase(),ADMIN_PASSWORD:'Senha-de-teste-segura!2026',ASSETS:{fetch:async()=>new Response('<main><!-- BLOG_POSTS --></main>',{headers:{'Content-Type':'text/html'}})}});
async function req(env,path,method='GET',body,cookie='',where=origin){return worker.fetch(new Request(origin+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:where}:{}),Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env,{});}
async function login(env,user='admin',password=env.ADMIN_PASSWORD){const r=await req(env,'/api/login','POST',{username:user,password});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}

test('migration installs verified Shopee products and no fake marketplace links',async()=>{
 const env=fixture(),publicData=(await (await req(env,'/api/site')).json());
 assert.equal(publicData.products.length,10); // 9 anúncios + serviço de projeto personalizado
 assert.equal(new Set(publicData.products.map(x=>x.id)).size,10);
 assert.equal(publicData.products.find(p=>p.id==='produto-6').links.length,0);
 for(const p of publicData.products.filter(p=>p.source==='shopee')){
  assert.equal(p.source,'shopee');assert.match(p.img,/^https:\/\/down-br\.img\.susercontent\.com\/file\//);
  assert.equal(p.links.length,1);assert.match(p.links[0].u,/\-i\.456103442\.\d+$/);
  assert.match(p.preco,/^R\$ /);assert.equal(p.precoEm,'2026-10-14');
 }
});

test('only admins can preview or import catalog, including CSRF guard',async()=>{
 const env=fixture(),admin=await login(env);
 assert.equal((await req(env,'/api/admin/shopee/preview')).status,401);
 assert.equal((await req(env,'/api/admin/shopee/import','POST',{mode:'verified'})).status,401);
 const preview=await (await req(env,'/api/admin/shopee/preview','GET',null,admin)).json();
 assert.equal(preview.products.length,9);assert.equal(preview.store,SHOPEE_STORE);
 assert.equal((await req(env,'/api/admin/shopee/import','POST',{mode:'verified'},admin,'https://forged.test')).status,403);
 await req(env,'/api/admin/users','POST',{name:'Atendimento',username:'atendimento',password:'Senha-equipe-segura!2026',role:'ATENDIMENTO'},admin);
 const team=await login(env,'atendimento','Senha-equipe-segura!2026');
 assert.equal((await req(env,'/api/admin/shopee/preview','GET',null,team)).status,403);
 assert.equal((await req(env,'/api/admin/shopee/import','POST',{mode:'verified'},team)).status,403);
});

test('import updates product catalog without deleting or deactivating customized products',async()=>{
 const env=fixture(),admin=await login(env);
 const demo=p=>({id:p,nome:'Produto de demonstração',tag:'Decoração',desc:'Antigo',img:'/assets/'+p+'.jpg',links:[{l:'Shopee',u:'https://shopee.com.br'},{l:'Mercado Livre',u:'https://mercadolivre.com.br'}],position:35,active:true});
 const untouched=demo('produto-1');const custom={...demo('produto-2'),links:[{l:'Comprar',u:'https://shopee.com.br/product/456103442/22794537308'}]};
 for(const p of [untouched,custom])await env.DB.prepare('UPDATE products SET payload=?,position=?,active=1 WHERE id=?').bind(JSON.stringify(p),p.position,p.id).run();
 const result=await req(env,'/api/admin/shopee/import','POST',{mode:'verified',replaceDemo:true},admin);
 assert.equal(result.status,200,await result.clone().text());
 const r=await result.json();assert.equal(r.imported,9);assert.equal(r.demonstrationHidden,1);assert.equal(r.created,0);
 const rows=(await env.DB.prepare('SELECT id,payload,active FROM products').all()).results;
 assert.equal(rows.find(x=>x.id==='produto-1').active,0);
 assert.equal(rows.find(x=>x.id==='produto-2').active,1);
 assert.equal(JSON.parse(rows.find(x=>x.id==='produto-2').payload).links[0].u,custom.links[0].u);
 assert.equal((await req(env,'/api/admin/shopee/import','POST',{mode:'verified'},admin)).status,200);
 assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM products').first()).n,15);
});

test('CSV import accepts real shop items and preserves order on re-import',async()=>{
 const env=fixture(),admin=await login(env);
 const product={title:'Item da minha Shopee',description:'Peça nova',category:'Utilidades',product_url:'https://shopee.com.br/product/456103442/999111222',image_url:'https://down-br.img.susercontent.com/file/loja-exemplo',price:'12,50'};
 let response=await req(env,'/api/admin/shopee/import','POST',{mode:'csv',products:[product],replaceDemo:false},admin);
 assert.equal(response.status,200,await response.clone().text());
 let p=JSON.parse((await env.DB.prepare("SELECT payload FROM products WHERE id='shopee-999111222'").first()).payload);
 assert.equal(p.preco,'R$ 12,50');assert.equal(p.position,0);
 await env.DB.prepare("UPDATE products SET position=45 WHERE id='shopee-999111222'").run();
 response=await req(env,'/api/admin/shopee/import','POST',{mode:'csv',products:[{...product,title:'Nome atualizado'}]},admin);
 assert.equal(response.status,200);
 p=JSON.parse((await env.DB.prepare("SELECT payload FROM products WHERE id='shopee-999111222'").first()).payload);
 assert.equal(p.nome,'Nome atualizado');assert.equal(p.position,45);
});

test('external seller, URL without item ID and malicious image reject entire CSV batch',async()=>{
 const env=fixture(),admin=await login(env),first=shopeeProducts[0];
 const valid={nome:'Novo',desc:'Descrição',tag:'3D',img:first.img,links:[{l:'Comprar',u:'https://shopee.com.br/product/456103442/999888777'}]};
 for(const invalid of [
  {...valid,links:[{l:'Comprar',u:'https://shopee.com.br/product/11111111/22222222'}]},
  {...valid,links:[{l:'Comprar',u:'https://shopee.com.br/vini.store_'}]},
  {...valid,img:'javascript:alert(1)'},
  {...valid,links:[{l:'Comprar',u:'https://shopee.com.br.evil.tld/product/456103442/999888777'}]}
 ]){
  const response=await req(env,'/api/admin/shopee/import','POST',{mode:'csv',products:[valid,invalid]},admin);
  assert.equal(response.status,400,await response.clone().text());
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS n FROM products WHERE id='shopee-999888777'").first()).n,0);
 }
});

test('manual editing preserves the Shopee price and source fields',async()=>{
 const env=fixture(),admin=await login(env),p=shopeeProducts[0];
 const response=await req(env,'/api/admin/products/'+p.id,'PUT',{...p,nome:'Editado',preco:'R$ 13,90'},admin);
 assert.equal(response.status,200,await response.clone().text());
 const updated=(await (await req(env,'/api/site')).json()).products.find(x=>x.id===p.id);
 assert.equal(updated.preco,'R$ 13,90');assert.equal(updated.precoEm,'2026-10-14');
});
