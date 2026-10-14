import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { calcularCusto } from '../src/calculadora-core.js';
import { handleFinelineBlogApi, slugify } from '../src/fineline-blog-api.js';

function mockD1() {
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0099_fineline_blog_patch.sql', import.meta.url),'utf8'));
 return {prepare(sql){let args=[];return {
  bind(...values){args=values;return this},
  first(){return db.prepare(sql).get(...args)||null},
  all(){return {results:db.prepare(sql).all(...args)}},
  run(){return {meta:db.prepare(sql).run(...args)}}
 }}};
}
function fixture(){const env={DB:mockD1()};const admin={isAdmin:async()=>true};
 const api=(path,method='GET',body=undefined,options=admin)=>handleFinelineBlogApi(new Request('https://fineline.local'+path,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})}),env,{},options);
 return {env,api};}
const prefix='/api/fineline';const article={title:'Nova Impressão 3D',excerpt:'Dicas para imprimir',body:'Conteúdo do artigo completo',status:'published'};

test('slug estável com diacríticos e sem caracteres perigosos',()=>assert.equal(slugify('  Peças / Impressão 3D!  '),'pecas-impressao-3d'));
test('API ignora rotas alheias',async()=>assert.equal(await fixture().api('/api/nao-existe'),null));
test('admin exige callback válida para ler e para criar',async()=>{
 const {api}=fixture();assert.equal((await api(prefix+'/admin/blog','GET',undefined,{})).status,403);
 assert.equal((await api(prefix+'/admin/blog','POST',article,{})).status,403);
});
test('criar, ler público, tirar do ar, republicar e apagar',async()=>{
 const {api}=fixture();let res=await api(prefix+'/admin/blog','POST',article);assert.equal(res.status,201);
 const {post}=await res.json();assert.equal(post.slug,'nova-impressao-3d');assert.ok(post.publishedAt);
 let pub=await (await api(prefix+'/blog')).json();assert.equal(pub.posts.length,1);
 assert.equal((await api(prefix+'/blog/'+post.slug)).status,200);
 let changed=await (await api(prefix+'/admin/blog/'+post.id,'PATCH',{status:'draft'})).json();assert.equal(changed.post.publishedAt,null);
 pub=await (await api(prefix+'/blog')).json();assert.equal(pub.posts.length,0);
 assert.equal((await api(prefix+'/blog/'+post.slug)).status,404);
 changed=await (await api(prefix+'/admin/blog/'+post.id,'PATCH',{status:'published'})).json();assert.ok(changed.post.publishedAt);
 assert.equal((await api(prefix+'/admin/blog/'+post.id,'DELETE')).status,200);
 assert.equal((await api(prefix+'/blog')).status,200);
 assert.equal((await (await api(prefix+'/blog')).json()).posts.length,0);
});
test('slug duplicado falha com HTTP 409, sem perder artigo original',async()=>{
 const {api}=fixture();assert.equal((await api(prefix+'/admin/blog','POST',article)).status,201);
 assert.equal((await api(prefix+'/admin/blog','POST',article)).status,409);
 assert.equal((await (await api(prefix+'/blog')).json()).posts.length,1);
});
test('dados inválidos são rejeitados',async()=>{
 const {api}=fixture();assert.equal((await api(prefix+'/admin/blog','POST',{title:'',body:'x'})).status,400);
 assert.equal((await api(prefix+'/admin/blog','POST',{...article,coverImageUrl:'javascript:alert(1)'})).status,400);
 assert.equal((await api(prefix+'/admin/blog','POST',{...article,status:'admin'})).status,400);
});
test('ausência de banco tem erro apropriado',async()=>{
 const r=await handleFinelineBlogApi(new Request('https://site.test/api/fineline/blog'),{},{});assert.equal(r.status,503);
});
test('calculadora: material, energia, mão de obra e margem sobre venda',()=>{
 const result=calcularCusto({grams:100,kgPrice:100,hours:5,powerWatts:200,kwhPrice:1,packaging:2,extras:0,laborHours:0.5,laborPrice:20,wastePct:0,marginPct:50,quantity:2});
 assert.equal(result.material,10);assert.equal(result.energy,1);assert.equal(result.labor,10);
 assert.equal(result.lotTotal,23);assert.equal(result.unitCost,11.5);assert.equal(result.suggestedPrice,23);
});
test('calculadora: valida quantidade, margem e negativos',()=>{
 const base={grams:100,kgPrice:100,hours:5,powerWatts:200,kwhPrice:1,packaging:2,extras:0,laborHours:0,laborPrice:0,wastePct:0,marginPct:50,quantity:2};
 assert.throws(()=>calcularCusto({...base,quantity:0}));assert.throws(()=>calcularCusto({...base,marginPct:100}));assert.throws(()=>calcularCusto({...base,grams:-1}));
});
