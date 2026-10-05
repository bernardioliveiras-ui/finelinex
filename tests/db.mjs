import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function createDatabase(){
 const sql=new DatabaseSync(':memory:');
 const directory=new URL('../migrations/',import.meta.url);
 for(const file of readdirSync(directory).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL(file,directory),'utf8'));
 const prepare=(query,params=[])=>({
  bind(...values){return prepare(query,values);},
  async first(){return sql.prepare(query).get(...params)||null;},
  async all(){return {results:sql.prepare(query).all(...params)};},
  async run(){const result=sql.prepare(query).run(...params);return {success:true,meta:{changes:Number(result.changes)}};}
 });
 return {prepare,async batch(statements){sql.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}},sql};
}
