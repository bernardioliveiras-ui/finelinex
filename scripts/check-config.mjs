import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(await readFile(path.join(root,'wrangler.jsonc'),'utf8'));
if(!config.d1_databases?.[0]?.database_id||config.d1_databases[0].database_id==='00000000-0000-0000-0000-000000000000')throw Error('Preencha database_id com o ID real do banco D1.');
async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await scan(file);else if(file.endsWith('.js')){const code=await readFile(file,'utf8');for(const match of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){const target=match[1];if(!target.startsWith('.')&&!target.startsWith('/'))continue;const resolved=target.startsWith('/')?path.join(root,'public',target):path.resolve(path.dirname(file),target);try{await access(resolved);}catch{throw Error(`Arquivo importado ausente: ${path.relative(root,file)} → ${target}`);}}}}}
await scan(path.join(root,'public'));await scan(path.join(root,'src'));
for(const file of ['public/index.html','public/calculadora/index.html','public/admin/index.html','migrations/0003_blog.sql','migrations/0004_blog_feed.sql'])await access(path.join(root,file));
console.log('Configuração, páginas públicas e arquivos JavaScript validados.');
