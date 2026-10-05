import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
if(!config.d1_databases?.[0]?.database_id||config.d1_databases[0].database_id==='00000000-0000-0000-0000-000000000000'){
 console.error('Configure o banco D1 primeiro: execute npm run setup ou preencha database_id em wrangler.jsonc com o ID real do banco fineline-db.');process.exit(1);
}
console.log('Configuração de publicação pronta.');
