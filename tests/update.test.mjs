import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {createDatabase} from './db.mjs';
const origin='https://fine.test';
const fixture=()=>({DB:createDatabase(),ADMIN_PASSWORD:'Senha-de-teste-segura!2026',ASSETS:{fetch:async()=>new Response('<main><!-- BLOG_POSTS --></main>',{headers:{'Content-Type':'text/html'}})}});
async function req(env,path,method='GET',body,cookie=''){return worker.fetch(new Request(origin+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:origin}:{}),Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),env,{});}
async function login(env){const r=await req(env,'/api/login','POST',{username:'admin',password:env.ADMIN_PASSWORD});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
test('upgrading an old database allows admin to publish without manually running the blog migration',async()=>{
 const env=fixture();env.DB.sql.exec('DROP TABLE blog_posts');const cookie=await login(env);
 const r=await req(env,'/api/admin/posts','POST',{title:'Impressão 3D',slug:'impressao-3d',excerpt:'A importância da impressão 3D',content:'O desenvolvimento',cover_image:'',external_url:'https://bernmkt.blogspot.com/2026/10/blog-post.html',action:'publish'},cookie);
 assert.equal(r.status,201);assert.match(await (await req(env,'/')).text(),/Impressão 3D/);
 assert.equal((await req(env,'/blog/impressao-3d')).status,200);
});
test('old database public blog and sitemap remain usable before any admin visits',async()=>{
 const env=fixture();env.DB.sql.exec('DROP TABLE blog_posts');
 assert.equal((await req(env,'/blog')).status,200);
 assert.equal((await req(env,'/sitemap.xml')).status,200);
});
test('public calculator responds without login and is present in sitemap',async()=>{
 const env=fixture();env.ASSETS.fetch=async request=>new Response(new URL(request.url).pathname,{headers:{'Content-Type':'text/html'}});
 const r=await req(env,'/calculadora');assert.equal(r.status,200);assert.match(await r.text(),/\/calculadora\//);
 assert.match(await (await req(env,'/sitemap.xml')).text(),/\/calculadora/);
});
const feed=(title='Artigo do Blogger')=>({feed:{entry:[{id:{$t:'tag:blogger.com,1999:blog-123.post-456'},title:{$t:title},content:{$t:'<p>Primeiro parágrafo.</p><p>Segundo &amp; terceiro.</p><script>alert(1)</script>'},published:{$t:'2026-10-13T12:00:00Z'},link:[{rel:'alternate',href:'https://bernmkt.blogspot.com/2026/10/post.html'}]}]}});
test('connecting Blogger shows articles on the LP and updates through the scheduled handler',async t=>{
 const env=fixture(),cookie=await login(env);let title='Artigo do Blogger';
 t.mock.method(globalThis,'fetch',async url=>{assert.match(String(url),/^https:\/\/bernmkt.blogspot.com\/feeds\/posts\/default/);return Response.json(feed(title));});
 let r=await req(env,'/api/admin/blog-source','PUT',{url:'https://bernmkt.blogspot.com/2026/10/post.html',enabled:true,version:0},cookie);assert.equal(r.status,200);
 const source=(await r.json()).source;assert.equal(source.url,'https://bernmkt.blogspot.com');assert.equal(source.count,1);
 let home=await (await req(env,'/')).text();assert.match(home,/Artigo do Blogger/);
 let html=await (await req(env,'/blog/blogger-456')).text();assert.match(html,/Primeiro parágrafo/);assert.doesNotMatch(html,/<script>alert/);assert.match(html,/Segundo &amp; terceiro/);
 title='Título atualizado';await worker.scheduled({},env,{});home=await (await req(env,'/')).text();assert.match(home,/Título atualizado/);
 assert.equal((home.match(/Título atualizado/g)||[]).length,1);
 t.mock.method(globalThis,'fetch',async()=>{throw Error('offline');});await worker.scheduled({},env,{});
 assert.match(await (await req(env,'/')).text(),/Título atualizado/);
 const state=(await (await req(env,'/api/admin/blog-source','GET',null,cookie)).json()).source;assert.ok(state.last_error);
 r=await req(env,'/api/admin/blog-source','PUT',{url:state.url,enabled:false,version:state.version},cookie);assert.equal(r.status,200);assert.doesNotMatch(await (await req(env,'/')).text(),/Título atualizado/);
});
test('feed connection rejects unsafe sources and is admin-only',async()=>{
 const env=fixture(),cookie=await login(env);
 assert.equal((await req(env,'/api/admin/blog-source')).status,401);
 for(const url of ['http://127.0.0.1','https://bernmkt.blogspot.com.evil.test','https://evil.test','https://admin:password@bernmkt.blogspot.com'])assert.equal((await req(env,'/api/admin/blog-source','PUT',{url,enabled:true,version:0},cookie)).status,400);
 await req(env,'/api/admin/users','POST',{name:'Equipe',username:'equipe',password:'Senha-equipe-segura!2026',role:'ATENDIMENTO'},cookie);
 const team=await req(env,'/api/login','POST',{username:'equipe',password:'Senha-equipe-segura!2026'});const tc=team.headers.get('set-cookie').split(';')[0];
 assert.equal((await req(env,'/api/admin/blog-source','GET',null,tc)).status,403);
});
test('Blogger posts without a title still appear, using the opening text as title',async()=>{
 const {parseFeed}=await import('../src/blog-feed.js');const data=feed('');
 const posts=parseFeed(data,'https://bernmkt.blogspot.com');assert.equal(posts.length,1);assert.match(posts[0].title,/Primeiro parágrafo/);
});
test('quotation rejects a WhatsApp made only of punctuation while preserving valid Brazilian numbers',async()=>{
 const env=fixture(),base={request_id:crypto.randomUUID(),nome:'Cliente',email:'cliente@example.com',descricao:'Peça personalizada',has_file:'NAO'};
 assert.equal((await req(env,'/api/quotes','POST',{...base,whatsapp:'--------'})).status,400);
 assert.equal((await req(env,'/api/quotes','POST',{...base,whatsapp:'(11) 99999-8888'})).status,201);
});
