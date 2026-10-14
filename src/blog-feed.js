import {AppError} from './validation.js';
import {ensureBlogSchema} from './blog-schema.js';
const interval=15*60*1000;
const initial={url:'',enabled:false,version:0,count:0,last_sync:null,last_error:''};
// Blog ID confirmed from this project's Blogger settings. Used only if Blogspot's feed
// is temporarily inaccessible; this second public endpoint needs no API key.
const knownBlogIds=Object.freeze({'fineline3d.blogspot.com':'223024082882083312'});
export function normalizeBlogURL(value){
 let u;try{u=new URL(value);}catch{throw new AppError('Informe o endereço completo do seu Blogger, como https://seublog.blogspot.com.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.blogspot\.com(?:\.br)?$/.test(u.hostname))throw new AppError('Use o endereço HTTPS do seu Blogger em blogspot.com, sem usuário ou senha.');
 return 'https://'+u.hostname.replace(/\.com\.br$/,'.com');
}
function plainHTML(html){
 return String(html||'').slice(0,200000).replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<h[1-6][^>]*>/gi,'\n\n## ').replace(/<\/(?:p|div|h[1-6]|li|blockquote)>/gi,'\n\n').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,v)=>{const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};if(v[0]!=='#')return named[v.toLowerCase()]||'';const n=v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):Number(v.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function parseFeed(data,source){
 if(!data?.feed||data.feed.entry!==undefined&&!Array.isArray(data.feed.entry))throw new AppError('O Blogger não retornou um feed válido. Confira se o blog é público e o feed está ativado.',502);
 const entries=[],seen=new Set();
 for(const item of (data.feed.entry||[]).slice(0,50)){
  const id=String(item.id?.$t||'').match(/\.post-(\d+)$/)?.[1];
  if(!id||seen.has(id))continue;
  let link;try{link=new URL((item.link||[]).find(l=>l.rel==='alternate')?.href);link.protocol='https:';}catch{continue;}
  // Blogger may use a country-specific .com.br permalink for the same blog.
  const hostname=new URL(source).hostname;
  if(![hostname,hostname+'.br'].includes(link.hostname)||link.username||link.password||link.port)continue;
  if(link.hostname!==hostname)link.hostname=hostname;
  const published=new Date(item.published?.$t);if(!Number.isFinite(published.getTime()))continue;
  const content=plainHTML(item.content?.$t||item.summary?.$t).slice(0,20000);
  const title=(plainHTML(item.title?.$t)||content.split('\n')[0].replace(/^#+\s*/, '')||'Artigo do blog').slice(0,180);
  let cover='';try{const u=new URL(item.media$thumbnail?.url);if(u.protocol==='https:'&&u.href.length<2000)cover=u.href;}catch{}
  entries.push({slug:'blogger-'+id,title,content,excerpt:content.replace(/\s+/g,' ').slice(0,280),cover_image:cover,external_url:link.href,published_at:published.toISOString(),updated_at:published.toISOString(),imported:true});seen.add(id);
 }
 // Keep the D1 row below its storage limit even for Unicode-heavy content.
 while(new TextEncoder().encode(JSON.stringify(entries)).length>1500000)entries.pop();
 return entries;
}
// Follow only same-blog/official-feed redirects, never arbitrary URLs supplied in
// Location headers. This protects the Cloudflare Worker against SSRF.
function allowedLocation(url,source,id){
 if(url.protocol!=='https:'||url.username||url.password||url.port)return false;
 const hostname=new URL(source).hostname;
 if([hostname,hostname+'.br'].includes(url.hostname))return url.pathname==='/feeds/posts/default';
 return !!id&&url.hostname==='www.blogger.com'&&url.pathname==='/feeds/'+id+'/posts/default';
}
function shortError(error){
 if(error instanceof AppError)return error.message;
 if(error?.name==='TimeoutError'||error?.name==='AbortError')return 'tempo limite excedido';
 return 'falha de conexão HTTPS';
}
async function getFeed(endpoint,source,id){
 let next=new URL(endpoint);
 for(let step=0;step<4;step++){
  if(!allowedLocation(next,source,id))throw new AppError('Redirecionamento para endereço fora do feed público (possível login, consentimento ou URL inválida).',502);
  let response;
  try{response=await fetch(next.href,{headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(10000)});}
  catch(error){throw new AppError(shortError(error),502);}
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location');
   if(!location)throw new AppError('redirecionamento sem endereço',502);
   try{next=new URL(location,next);}catch{throw new AppError('redirecionamento inválido',502);}
   continue;
  }
  if(!response.ok)throw new AppError('HTTP '+response.status+(response.status===404?' (feed não encontrado)':response.status===403?' (acesso negado)':''),502);
  if(!response.body)throw new AppError('resposta vazia',502);
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000000)throw new AppError('feed maior que 4 MB',502);chunks.push(value);}
  }finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AppError('retorno não é JSON (pode ser página de login ou bloqueio)',502);}
  // Only accept the numeric-ID fallback for the blog whose ID the owner supplied.
  if(id&&next.hostname==='www.blogger.com'){
   const reported=data?.feed?.id?.$t;
   if(reported&&reported!=='tag:blogger.com,1999:blog-'+id)throw new AppError('ID do feed não corresponde ao Blogger configurado',502);
  }
  return parseFeed(data,source);
 }
 throw new AppError('excesso de redirecionamentos',502);
}
async function download(source){
 const id=knownBlogIds[new URL(source).hostname];
 const endpoints=[source+'/feeds/posts/default?alt=json&max-results=50'];
 if(id)endpoints.push('https://www.blogger.com/feeds/'+id+'/posts/default?alt=json&max-results=50');
 const errors=[];
 for(const endpoint of endpoints){
  try{return await getFeed(endpoint,source,id);}catch(error){errors.push((new URL(endpoint).hostname==='www.blogger.com'?'Blogger (ID)':'Blogspot')+': '+shortError(error));}
 }
 throw new AppError('Não foi possível obter o feed. '+errors.join(' | ')+'.',502);
}
export async function testBlogFeed(value){
 const source=normalizeBlogURL(value),posts=await download(source);
 return {url:source,count:posts.length,titles:posts.slice(0,3).map(p=>p.title)};
}
async function row(db){if(!db)return null;await ensureBlogSchema(db);return db.prepare('SELECT * FROM blog_feed WHERE id=1').first();}
function state(r){return r?{url:r.url,enabled:!!r.enabled,version:r.version,count:JSON.parse(r.payload).length,last_sync:r.last_sync,last_error:r.last_error}:initial;}
export async function feedState(db){return state(await row(db));}
export async function cachedFeed(db){const r=await row(db);return r?.enabled?JSON.parse(r.payload):[];}
export async function saveFeed(db,body){
 if(typeof body?.enabled!=='boolean'||!Number.isInteger(body.version)||body.version<0)throw new AppError('Confira a conexão do blog. Recarregue a aba antes de salvar.');
 const source=normalizeBlogURL(body.url),previous=await row(db);
 if((previous?.version||0)!==body.version)throw new AppError('A conexão mudou em outra sessão. Recarregue a aba Blog.',409);
 let entries=[];if(body.enabled)try{entries=await download(source);}catch(error){throw new AppError(error.message+' Confira também se o endereço abre em janela anônima. A conexão anterior foi preservada.',502);}
 const now=Date.now(),payload=JSON.stringify(entries),synced=body.enabled?new Date(now).toISOString():null;
 const result=previous?await db.prepare('UPDATE blog_feed SET url=?,enabled=?,payload=?,version=version+1,last_sync=?,last_error=?,last_checked=? WHERE id=1 AND version=?').bind(source,body.enabled?1:0,payload,synced,'',now,body.version).run():await db.prepare('INSERT OR IGNORE INTO blog_feed(id,url,enabled,payload,last_sync,last_checked) VALUES(1,?,?,?,?,?)').bind(source,body.enabled?1:0,payload,synced,now).run();
 if(!result.meta.changes)throw new AppError('A conexão mudou em outra sessão. Recarregue a aba Blog.',409);
 return feedState(db);
}
const inflight=new WeakMap();
export async function refreshFeed(db,force=false){
 if(!db)return initial;
 if(inflight.has(db))return inflight.get(db);
 const task=(async()=>{
  const r=await row(db);if(!r?.enabled||!force&&Date.now()-r.last_checked<interval)return state(r);
  const now=Date.now();
  try{const entries=await download(r.url);await db.prepare('UPDATE blog_feed SET payload=?,last_sync=?,last_error=?,last_checked=? WHERE id=1 AND version=? AND enabled=1 AND last_checked<=?').bind(JSON.stringify(entries),new Date(now).toISOString(),'',now,r.version,now).run();}
  catch(error){await db.prepare('UPDATE blog_feed SET last_error=?,last_checked=? WHERE id=1 AND version=? AND enabled=1 AND last_checked<=?').bind('Falha na atualização: '+error.message+'. Os últimos artigos foram preservados.',now,r.version,now).run();}
  return feedState(db);
 })();inflight.set(db,task);try{return await task;}finally{inflight.delete(db);}
}
