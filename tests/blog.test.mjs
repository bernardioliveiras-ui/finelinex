import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {createDatabase} from './db.mjs';
const origin='https://fine.test';
const draft={title:'Como escolher uma peça 3D',slug:'como-escolher-peca-3d',excerpt:'Orientações para o seu projeto.',content:'## Material certo\n\nConheça as opções de impressão 3D.',cover_image:'/assets/produto-1.jpg',external_url:'https://example.com/referencia',action:'draft'};
const fixture=()=>({DB:createDatabase(),ADMIN_PASSWORD:'Senha-de-teste-segura!2026',ASSETS:{fetch:async()=>new Response('asset')}});
async function req(env,path,method='GET',body,cookie='',originHeader=origin){return worker.fetch(new Request(origin+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:originHeader}:{}),Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env,{});}
async function login(env,username='admin',password=env.ADMIN_PASSWORD){const r=await req(env,'/api/login','POST',{username,password});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
test('leads only read published articles; admin drafts stay private until published',async()=>{
 const env=fixture(),cookie=await login(env);
 const created=await req(env,'/api/admin/posts','POST',draft,cookie);assert.equal(created.status,201);let {post}=await created.json();
 assert.equal((await req(env,'/blog/'+post.slug)).status,404);assert.doesNotMatch(await (await req(env,'/blog')).text(),/Como escolher uma peça 3D/);
 let r=await req(env,'/api/admin/posts/'+post.id,'PUT',{...post,action:'publish'},cookie);assert.equal(r.status,200);post=(await r.json()).post;
 let html=await (await req(env,'/blog/'+post.slug)).text();assert.match(html,/Como escolher uma peça 3D/);assert.match(html,/<h2>Material certo<\/h2>/);assert.match(html,/rel="canonical"/);
 assert.match(await (await req(env,'/sitemap.xml')).text(),/como-escolher-peca-3d/);
 r=await req(env,'/api/admin/posts/'+post.id,'PUT',{...post,title:'RASCUNHO PRIVADO',action:'draft'},cookie);assert.equal(r.status,200);post=(await r.json()).post;
 html=await (await req(env,'/blog/'+post.slug)).text();assert.match(html,/Como escolher uma peça 3D/);assert.doesNotMatch(html,/RASCUNHO PRIVADO/);
 await req(env,'/api/admin/posts/'+post.id,'PUT',{...post,action:'unpublish'},cookie);
 assert.equal((await req(env,'/blog/'+post.slug)).status,404);assert.doesNotMatch(await (await req(env,'/sitemap.xml')).text(),/como-escolher-peca-3d/);
});
test('visitors and attendance cannot create or edit posts',async()=>{
 const env=fixture(),admin=await login(env);
 await req(env,'/api/admin/users','POST',{name:'Atendimento',username:'equipe',password:'Equipe-segura!2026',role:'ATENDIMENTO'},admin);
 const team=await login(env,'equipe','Equipe-segura!2026');
 for(const [cookie,status] of [['',401],[team,403]])for(const method of ['GET','POST'])assert.equal((await req(env,'/api/admin/posts',method,method==='POST'?draft:null,cookie)).status,status);
 assert.equal((await req(env,'/api/admin/posts','POST',draft,admin,'https://other.test')).status,403);
 assert.equal((await req(env,'/blog','POST',draft)).status,405);
});
test('article versions and unique permanent links prevent accidental overwrites',async()=>{
 const env=fixture(),cookie=await login(env);const {post}=await (await req(env,'/api/admin/posts','POST',draft,cookie)).json();
 assert.equal((await req(env,'/api/admin/posts','POST',draft,cookie)).status,409);
 assert.equal((await req(env,'/api/admin/posts/'+post.id,'PUT',{...post,action:'publish'},cookie)).status,200);
 assert.equal((await req(env,'/api/admin/posts/'+post.id,'PUT',{...post,action:'draft'},cookie)).status,409);
 const latest=(await (await req(env,'/api/admin/posts/'+post.id,'GET',null,cookie)).json()).post;
 assert.equal((await req(env,'/api/admin/posts/'+post.id,'PUT',{...latest,slug:'troca-link',action:'draft'},cookie)).status,400);
});
test('post HTML is escaped and unsafe URLs are rejected',async()=>{
 const env=fixture(),cookie=await login(env);
 assert.equal((await req(env,'/api/admin/posts','POST',{...draft,external_url:'javascript:alert(1)'},cookie)).status,400);
 const {post}=await (await req(env,'/api/admin/posts','POST',{...draft,title:'<script>alert(1)</script>',content:'<img src=x onerror=alert(1)>',action:'publish'},cookie)).json();
 const html=await (await req(env,'/blog/'+post.slug)).text();assert.doesNotMatch(html,/<script>alert|<img src=x/);assert.match(html,/&lt;img src=x/);
 assert.equal((await req(env,'/blog/'+post.slug,'HEAD')).status,200);
});
test('homepage and paginated listing only expose published snapshots',async()=>{
 const env=fixture(),cookie=await login(env);
 env.ASSETS.fetch=async()=>new Response('<main><!-- BLOG_POSTS --></main>',{headers:{'Content-Type':'text/html','ETag':'old-asset'}});
 for(let i=0;i<13;i++)await req(env,'/api/admin/posts','POST',{...draft,title:'Artigo '+i,slug:'artigo-'+i,action:'publish'},cookie);
 await req(env,'/api/admin/posts','POST',{...draft,title:'Segredo do rascunho',slug:'segredo'},cookie);
 const home=await req(env,'/');const html=await home.text();assert.equal((html.match(/class="blog-card"/g)||[]).length,3);assert.doesNotMatch(html,/Segredo/);assert.equal(home.headers.get('cache-control'),'no-store');assert.equal(home.headers.get('etag'),null);
 const first=await (await req(env,'/blog')).text(),second=await (await req(env,'/blog?pagina=2')).text();
 assert.equal((first.match(/class="blog-card"/g)||[]).length,12);assert.match(first,/Próxima/);assert.equal((second.match(/class="blog-card"/g)||[]).length,1);assert.doesNotMatch(first+second,/Segredo/);
 const articles=html.matchAll(/href="(\/blog\/artigo-\d+)"/g);for(const [,path] of articles)assert.equal((await req(env,path)).status,200);
});
test('oversized combined snapshots fail clearly before exceeding D1 row limits',async()=>{
 const env=fixture(),cookie=await login(env);
 const large={...draft,cover_image:'data:image/png;base64,'+'A'.repeat(950000),content:'界'.repeat(40000)};
 let r=await req(env,'/api/admin/posts','POST',{...large,action:'publish'},cookie);assert.equal(r.status,400);assert.match((await r.json()).error,/capa|tamanho/);
 r=await req(env,'/api/admin/posts','POST',large,cookie);assert.equal(r.status,201);let {post}=await r.json();
 r=await req(env,'/api/admin/posts/'+post.id,'PUT',{...post,action:'publish'},cookie);assert.equal(r.status,400);
 assert.equal((await req(env,'/blog/'+post.slug)).status,404);
 r=await req(env,'/api/admin/posts/'+post.id,'PUT',{...post,cover_image:'',action:'publish'},cookie);assert.equal(r.status,200);post=(await r.json()).post;
 r=await req(env,'/api/admin/posts/'+post.id,'PUT',{...post,action:'unpublish'},cookie);assert.equal(r.status,200);
});
