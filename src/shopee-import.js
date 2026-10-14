import {AppError,validateProduct} from './validation.js';
import {SHOPEE_STORE,SHOPEE_SHOP_ID,SHOPEE_VERIFIED_AT,shopeeProducts} from './shopee-catalog.js';

const exampleIds=new Set(['produto-1','produto-2','produto-3','produto-4','produto-5','produto-6']);
const placeholderUrls=new Set(['https://shopee.com.br','https://mercadolivre.com.br','https://amazon.com.br']);
const MAX_PRODUCTS=250;

// Não remove nem desativa produtos que receberam links próprios.
function isDemo(row){
 if(!exampleIds.has(row.id))return false;
 let p;try{p=JSON.parse(row.payload);}catch{return false;}
 if(p.img!==`/assets/${row.id}.jpg`)return false;
 return Array.isArray(p.links)&&p.links.length>0&&p.links.every(link=>placeholderUrls.has(String(link.u).replace(/\/$/,'')));
}
function itemIdFromUrl(raw){
 let u;try{u=new URL(raw);}catch{throw new AppError('Cole um link completo de anúncio da Shopee (https://...).');}
 if(u.protocol!=='https:'||!['shopee.com.br','www.shopee.com.br'].includes(u.hostname)||u.username||u.password)throw new AppError('A importação aceita apenas anúncios Shopee com HTTPS.');
 // Os links de anúncios contêm o ID da loja e do produto; um link só da loja não importa um item.
 const m=u.pathname.match(/-i\.(\d+)\.(\d+)$/i)||u.pathname.match(/^\/product\/(\d+)\/(\d+)\/?$/i);
 if(!m)throw new AppError('Use o link de um anúncio individual da Shopee, não o link da loja.');
 if(m[1]!==SHOPEE_SHOP_ID)throw new AppError('O anúncio não pertence à loja Fine Line 3D cadastrada.');
 return m[2];
}
function bodyDate(value){const day=String(value||new Date().toISOString().slice(0,10)).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(day)?day:new Date().toISOString().slice(0,10);}
function normalizedItem(v,index){
 if(!v||typeof v!=='object'||Array.isArray(v))throw new AppError(`Produto ${index+1}: dados inválidos.`);
 const shopUrl=String(v.product_url||v.url||v.links?.[0]?.u||'').trim();
 const itemId=itemIdFromUrl(shopUrl);
 const price=String(v.price||v.preco||'').trim().slice(0,70);
 const displayPrice=price&&!/^R\$/i.test(price)?'R$ '+price:price;
 const product={
  id:'shopee-'+itemId,
  nome:String(v.title||v.nome||'').trim(),
  desc:String(v.description||v.desc||v.title||v.nome||'').trim(),
  tag:String(v.category||v.tag||'Shopee').trim(),
  img:String(v.image_url||v.image||v.img||'').trim(),
  links:[{l:'Comprar na Shopee',u:shopUrl}],
  position:index,
  active:true,
  source:'shopee',shopId:SHOPEE_SHOP_ID,preco:displayPrice,precoEm:bodyDate(v.precoEm||v.price_checked_at)
 };
 // Previne URL maliciosa no campo de imagem e limita texto/imagem como nos produtos manuais.
 return validateProduct(product,product.id);
}
export function shopeePreview(){return {store:SHOPEE_STORE,shopId:SHOPEE_SHOP_ID,verifiedAt:SHOPEE_VERIFIED_AT,products:shopeeProducts};}
export async function importShopee(db,body){
 if(!body||!['verified','csv'].includes(body.mode))throw new AppError('Escolha uma importação válida.');
 const supplied=body.mode==='verified'?shopeeProducts:body.products;
 if(!Array.isArray(supplied)||!supplied.length||supplied.length>100)throw new AppError('Importe de 1 a 100 anúncios por vez.');
 // Verifica toda a lista ANTES de qualquer gravação para evitar importação parcial.
 const proposed=supplied.map(normalizedItem);
 const ids=new Set(proposed.map(p=>p.id));if(ids.size!==proposed.length)throw new AppError('Há anúncios repetidos no arquivo. Remova as duplicatas.');
 const rows=(await db.prepare('SELECT id,payload,position,active FROM products').all()).results;
 const byId=new Map(rows.map(r=>[r.id,r]));
 const newCount=proposed.filter(p=>!byId.has(p.id)).length;
 if(rows.length+newCount>MAX_PRODUCTS)throw new AppError('O catálogo aceita até 250 produtos. Reduza o lote de importação.');
 const replaceDemo=body.replaceDemo!==false;
 const examples=replaceDemo?rows.filter(row=>row.active&&isDemo(row)):[];
 const statements=[];
 for(const row of examples){const product={...JSON.parse(row.payload),active:false};statements.push(db.prepare('UPDATE products SET payload=?,active=0 WHERE id=?').bind(JSON.stringify(product),row.id));}
 for(const p of proposed){
  // Mantém a ordem anterior quando o produto já existia e o gestor organizou o catálogo.
  const existing=byId.get(p.id);if(existing)p.position=existing.position;
  statements.push(db.prepare('INSERT INTO products(id,payload,position,active) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,position=excluded.position,active=1').bind(p.id,JSON.stringify(p),p.position,1));
 }
 await db.batch(statements);
 return {imported:proposed.length,created:newCount,updated:proposed.length-newCount,demonstrationHidden:examples.length,store:SHOPEE_STORE};
}
