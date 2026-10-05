import defaults from './defaults.js';
import {AppError,validateQuote,validateProduct,validateSettings,validateUser,statuses} from './validation.js';
import {checkPassword,cookie,newSession,requireSession,rateLimit,hash,tokenFrom,passwordHash,verifyPassword} from './auth.js';
const csp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'";
function response(data,status=200,headers={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});}
function requireDb(env){if(!env.DB)throw new AppError('O recebimento de orçamentos ainda não está disponível. Entre em contato pelo WhatsApp.',503);return env.DB;}
async function json(request,max=14000){if(!request.headers.get('Content-Type')?.includes('application/json'))throw new AppError('Formato de envio inválido.',415);const body=await request.text();if(body.length>max)throw new AppError('O conteúdo enviado é muito grande.',413);try{return JSON.parse(body);}catch{throw new AppError('Não foi possível ler o envio. Confira os dados e tente novamente.');}}
function sameOrigin(request){const expected=new URL(request.url).origin;if(request.headers.get('Origin')!==expected)throw new AppError('Envio de outra origem não permitido.',403);}
async function loadSettings(db){const r=await db.prepare('SELECT payload,version FROM settings WHERE id=1').first();if(!r)throw new AppError('Conclua a configuração do banco de dados.',503);return {settings:JSON.parse(r.payload),version:r.version};}
async function products(db,publicOnly=false){const r=await db.prepare('SELECT payload FROM products'+(publicOnly?' WHERE active=1':'')+' ORDER BY position ASC,id ASC').all();return r.results.map(p=>JSON.parse(p.payload));}
async function sendNotification(quote,env){if(!env.WEB3FORMS_ACCESS_KEY)return;try{const r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:env.WEB3FORMS_ACCESS_KEY,subject:'Novo orçamento — Fine Line 3D',from_name:'Site Fine Line 3D',...quote})});if(!r.ok)console.error('Falha na notificação de orçamento');}catch{console.error('Notificação indisponível; orçamento preservado no painel.');}}
async function api(request,env,ctx){const path=new URL(request.url).pathname,method=request.method;
 if(method!=='GET'&&method!=='HEAD')sameOrigin(request);
 if(path==='/api/site'&&method==='GET'){
  if(!env.DB)return response(defaults);
  const {settings}=await loadSettings(env.DB);return response({settings,products:await products(env.DB,true)});
 }
 const db=requireDb(env);
 if(path==='/api/login'&&method==='POST'){
  await rateLimit(request,db,'login',8,900000);const body=await json(request);
  const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
  let user=await db.prepare('SELECT * FROM users WHERE username=?').bind(username).first();
  const count=await db.prepare('SELECT COUNT(*) AS n FROM users').first();
  if(!count.n){
   if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<12)throw new AppError('O acesso administrativo ainda não foi configurado.',503);
   if(username!=='admin'||!await checkPassword(body.password,env.ADMIN_PASSWORD))throw new AppError('Usuário ou senha inválidos.',401);
   const id=crypto.randomUUID();await db.prepare('INSERT OR IGNORE INTO users(id,name,username,password_hash,role,created_at) VALUES(?,?,?,?,?,?)').bind(id,'Administrador','admin',await passwordHash(body.password),'ADMIN',new Date().toISOString()).run();user=await db.prepare('SELECT * FROM users WHERE username=?').bind('admin').first();
  }
  if(!user||!user.active||!await verifyPassword(body.password,user.password_hash))throw new AppError('Usuário ou senha inválidos.',401);
  await db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(Date.now()).run();
  return response({authenticated:true,user:{id:user.id,name:user.name,username:user.username,role:user.role}},200,{'Set-Cookie':cookie(await newSession(db,user.id,user.password_hash),request)});
 }
 if(path==='/api/logout'&&method==='POST'){
  const t=tokenFrom(request);if(t)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(t)).run();return response({ok:true},200,{'Set-Cookie':cookie('',request,true)});
 }
 if(path==='/api/quotes'&&method==='POST'){
  const q=validateQuote(await json(request));
  const previous=await db.prepare('SELECT id FROM quotes WHERE request_id=?').bind(q.request_id).first();if(previous)return response({id:previous.id,received:true},200);
  await rateLimit(request,db,'quotes',10,3600000);
  const id=crypto.randomUUID(),now=new Date().toISOString();
  const result=await db.prepare('INSERT OR IGNORE INTO quotes(id,request_id,nome,email,whatsapp,has_file,produto,quantidade,prazo,descricao,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,q.request_id,q.nome,q.email,q.whatsapp,q.has_file,q.produto,q.quantidade,q.prazo,q.descricao,now,now).run();
  if(!result.meta.changes){const duplicate=await db.prepare('SELECT id FROM quotes WHERE request_id=?').bind(q.request_id).first();return response({id:duplicate.id,received:true},200);}
  if(env.WEB3FORMS_ACCESS_KEY&&ctx?.waitUntil)ctx.waitUntil(sendNotification(q,env));
  return response({id,received:true},201);
 }
 if(!path.startsWith('/api/admin/'))throw new AppError('Endereço não encontrado.',404);
 const user=await requireSession(request,db);
 if(path==='/api/admin/session'&&method==='GET')return response({authenticated:true,user:{id:user.id,name:user.name,username:user.username,role:user.role}});
 if(!path.startsWith('/api/admin/quotes')&&path!=='/api/admin/password'&&user.role!=='ADMIN')throw new AppError('Seu acesso é de atendimento. Esta área é exclusiva do administrador.',403);
 if(path==='/api/admin/quotes'&&method==='GET'){
  const rows=await db.prepare('SELECT * FROM quotes ORDER BY created_at DESC LIMIT 500').all();return response({quotes:rows.results});
 }
 const quoteId=path.match(/^\/api\/admin\/quotes\/([a-f0-9-]{36})$/i)?.[1];
 if(quoteId&&method==='PATCH'){
  const b=await json(request);if(!statuses.includes(b.status)||typeof b.notes!=='string'||b.notes.length>5000||!Number.isInteger(b.version)||b.version<1)throw new AppError('Confira o status e as anotações.');
  const result=await db.prepare('UPDATE quotes SET status=?,notes=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(b.status,b.notes.trim(),new Date().toISOString(),quoteId,b.version).run();if(!result.meta.changes){const exists=await db.prepare('SELECT id FROM quotes WHERE id=?').bind(quoteId).first();if(!exists)throw new AppError('Solicitação não encontrada.',404);throw new AppError('Esse pedido foi atualizado por outra pessoa. Feche a janela, atualize a lista e abra o pedido novamente antes de salvar.',409);}return response({ok:true});
 }
 if(path==='/api/admin/users'&&method==='GET')return response({users:(await db.prepare('SELECT id,name,username,role,active,created_at FROM users ORDER BY created_at').all()).results});
 if(path==='/api/admin/users'&&method==='POST'){
  const u=validateUser(await json(request));if(await db.prepare('SELECT id FROM users WHERE username=?').bind(u.username).first())throw new AppError('Esse usuário já existe.',409);
  const id=crypto.randomUUID();await db.prepare('INSERT INTO users(id,name,username,password_hash,role,created_at) VALUES(?,?,?,?,?,?)').bind(id,u.name,u.username,await passwordHash(u.password),u.role,new Date().toISOString()).run();return response({user:{id,name:u.name,username:u.username,role:u.role,active:true}},201);
 }
 const accessId=path.match(/^\/api\/admin\/users\/([a-f0-9-]{36})$/i)?.[1];
 if(accessId&&method==='PATCH'){
  const b=await json(request);const target=await db.prepare('SELECT id,role FROM users WHERE id=?').bind(accessId).first();if(!target)throw new AppError('Acesso não encontrado.',404);
  if(b.password!==undefined&&(typeof b.password!=='string'||b.password.length<12||b.password.length>128))throw new AppError('Use uma senha de 12 a 128 caracteres.');
  if(typeof b.active==='boolean'){
   if(accessId===user.id&&!b.active)throw new AppError('Você não pode desativar seu próprio acesso.');
   const r=await db.prepare("UPDATE users SET active=? WHERE id=? AND (?=1 OR role!='ADMIN' OR (SELECT COUNT(*) FROM users WHERE role='ADMIN' AND active=1)>1)").bind(b.active?1:0,accessId,b.active?1:0).run();if(!r.meta.changes)throw new AppError('Mantenha pelo menos um administrador ativo.');
  }
  if(b.password!==undefined){await db.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(await passwordHash(b.password),accessId).run();await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(accessId).run();}
  return response({ok:true});
 }
 if(path==='/api/admin/password'&&method==='POST'){
  const b=await json(request);const current=await db.prepare('SELECT password_hash FROM users WHERE id=?').bind(user.id).first();if(!await verifyPassword(b.current_password,current.password_hash))throw new AppError('Senha atual incorreta.');if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)throw new AppError('Use uma senha de 12 a 128 caracteres.');await db.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(await passwordHash(b.password),user.id).run();await db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash!=?').bind(user.id,user.session_hash).run();return response({ok:true});
 }
 if(path==='/api/admin/products'&&method==='GET')return response({products:await products(db)});
 if(path==='/api/admin/products'&&method==='POST'){
  const count=await db.prepare('SELECT COUNT(*) AS n FROM products').first();if(count.n>=60)throw new AppError('O catálogo aceita até 60 produtos.');
  const p=validateProduct(await json(request,1100000),crypto.randomUUID());
  await db.prepare('INSERT INTO products(id,payload,position,active) VALUES(?,?,?,?)').bind(p.id,JSON.stringify(p),p.position,p.active?1:0).run();return response({product:p},201);
 }
 const productId=path.match(/^\/api\/admin\/products\/([a-zA-Z0-9-]{1,70})$/)?.[1];
 if(productId&&method==='PUT'){
  const p=validateProduct(await json(request,1100000),productId);const r=await db.prepare('UPDATE products SET payload=?,position=?,active=? WHERE id=?').bind(JSON.stringify(p),p.position,p.active?1:0,p.id).run();if(!r.meta.changes)throw new AppError('Produto não encontrado.',404);return response({product:p});
 }
 if(path==='/api/admin/settings'&&method==='GET')return response(await loadSettings(db));
 if(path==='/api/admin/settings'&&method==='PUT'){
  const b=await json(request,30000);const s=validateSettings(b.settings);if(!Number.isInteger(b.version))throw new AppError('Atualize a página antes de salvar.');
  const r=await db.prepare('UPDATE settings SET payload=?,version=version+1 WHERE id=1 AND version=?').bind(JSON.stringify(s),b.version).run();if(!r.meta.changes)throw new AppError('O conteúdo foi alterado em outra sessão. Recarregue antes de salvar.',409);return response({settings:s,version:b.version+1});
 }
 throw new AppError('Endereço não encontrado.',404);
}
export default {async fetch(request,env,ctx){
 const u=new URL(request.url);let res;
 if(u.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname)){u.protocol='https:';return Response.redirect(u.href,308);}
 try{res=u.pathname.startsWith('/api/')?await api(request,env,ctx):await env.ASSETS.fetch(request);}
 catch(e){const status=e instanceof AppError?e.status:500;if(status===500)console.error('Falha na API FineLine:',e.message);res=response({error:status===500?'Não foi possível concluir agora. Tente novamente ou fale pelo WhatsApp.':e.message},status);}
 const headers=new Headers(res.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('X-Frame-Options','DENY');headers.set('Content-Security-Policy',csp);if(u.pathname.startsWith('/admin'))headers.set('Cache-Control','no-store');return new Response(res.body,{status:res.status,statusText:res.statusText,headers});
}};
