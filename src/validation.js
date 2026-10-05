export class AppError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export const statuses=['NOVO','EM_ATENDIMENTO','ORCAMENTO_ENVIADO','APROVADO','FATURADO','ENTREGUE','CANCELADO'];
function str(value,max,required=false,label='Campo'){
 if(typeof value!=='string')value='';value=value.trim();
 if(value.length>max||required&&!value)throw new AppError(`${label}: confira o preenchimento.`);
 return value;
}
export function url(value,image=false){
 value=str(value,image?1000000:2000);
 if(!value)return '';
 if(image&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return value;
 if(image&&/^\/assets\/[A-Za-z0-9._/-]+$/.test(value)&&!value.includes('..'))return value;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw 0;return u.href;}catch{throw new AppError('Use um link HTTPS válido'+(image?' ou uma imagem PNG, JPG ou WEBP.':'.'));}
}
export function validateQuote(v){
 if(!v||typeof v!=='object'||Array.isArray(v))throw new AppError('Pedido inválido.');
 if(v.website)throw new AppError('Não foi possível enviar o pedido.');
 const id=str(v.request_id,70,true,'Identificador');if(!/^[a-f0-9-]{36}$/i.test(id))throw new AppError('Recarregue a página e tente novamente.');
 if(v.has_file&&!['SIM','NAO'].includes(v.has_file))throw new AppError('Confira se possui o arquivo 3D.');
 const q={has_file:v.has_file||'NAO',request_id:id,nome:str(v.nome,120,true,'Nome'),email:str(v.email,180,true,'E-mail'),whatsapp:str(v.whatsapp,30),produto:str(v.produto,160),quantidade:v.quantidade===''||v.quantidade==null?1:Number(v.quantidade),prazo:str(v.prazo,120),descricao:str(v.descricao,5000,true,'Descrição')};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email))throw new AppError('Informe um e-mail válido.');
 if(q.whatsapp&&!/^[+()\d\s.-]{8,30}$/.test(q.whatsapp))throw new AppError('Confira o WhatsApp.');
 if(!Number.isInteger(q.quantidade)||q.quantidade<1||q.quantidade>100000)throw new AppError('Informe uma quantidade de 1 a 100.000.');
 return q;
}
export function validateProduct(v,id){
 if(!v||typeof v!=='object'||Array.isArray(v))throw new AppError('Produto inválido.');
 const p={id,nome:str(v.nome,120,true,'Nome do produto'),tag:str(v.tag,80),desc:str(v.desc,2000,true,'Descrição'),img:url(v.img,true),links:[],active:v.active!==false,position:Number(v.position)||0};
 if(!Number.isInteger(p.position)||Math.abs(p.position)>10000)throw new AppError('Ordem inválida.');
 if(!Array.isArray(v.links)||v.links.length>5)throw new AppError('Use até cinco links de compra.');
 p.links=v.links.map(l=>({l:str(l.l,70,true,'Texto do link'),u:url(l.u)}));
 if(p.links.some(l=>!l.u))throw new AppError('Preencha o link de compra.');
 return p;
}
export function validateSettings(v){
 if(!v||typeof v!=='object'||Array.isArray(v))throw new AppError('Conteúdo inválido.');
 const s={hero_title:str(v.hero_title,240,true,'Título'),hero_description:str(v.hero_description,900,true,'Descrição'),quote_description:str(v.quote_description,300,true,'Texto de orçamento'),projects:Number(v.projects),years:Number(v.years),google_rating:Number(v.google_rating),google_count:Number(v.google_count),google_url:url(v.google_url),whatsapp:str(v.whatsapp,20,true,'WhatsApp'),reviews:[]};
 for(const k of ['projects','years','google_count'])if(!Number.isInteger(s[k])||s[k]<0||s[k]>1000000)throw new AppError('Confira os números informados.');
 if(!Number.isFinite(s.google_rating)||s.google_rating<0||s.google_rating>5)throw new AppError('A nota deve estar entre 0 e 5.');
 if(!/^\d{10,15}$/.test(s.whatsapp))throw new AppError('Use o WhatsApp com código do país e DDD, só números.');
 if(!Array.isArray(v.reviews)||v.reviews.length>8)throw new AppError('Use até oito avaliações.');
 s.reviews=v.reviews.map(r=>{const stars=Number(r.stars);if(!Number.isInteger(stars)||stars<1||stars>5)throw new AppError('Confira as estrelas.');return {author:str(r.author,120,true,'Nome da avaliação'),text:str(r.text,1500,true,'Depoimento'),stars,source:str(r.source,60)||'Google'};});
 return s;
}

export function validateUser(v){
 if(!v||typeof v!=='object')throw new AppError('Acesso inválido.');
 const u={name:str(v.name,100,true,'Nome'),username:str(v.username,40,true,'Usuário').toLowerCase(),password:v.password,role:v.role};
 if(!/^[a-z0-9._-]{3,40}$/.test(u.username))throw new AppError('Usuário: use de 3 a 40 letras minúsculas, números, ponto ou hífen.');
 if(typeof u.password!=='string'||u.password.length<12||u.password.length>128)throw new AppError('Use uma senha de 12 a 128 caracteres.');
 if(!['ADMIN','ATENDIMENTO'].includes(u.role))throw new AppError('Perfil inválido.');
 return u;
}
