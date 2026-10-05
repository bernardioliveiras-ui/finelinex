import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const wrangler=path.join(root,'node_modules/wrangler/bin/wrangler.js');
function run(args,{capture=false,input}={}){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[wrangler,...args],{cwd:root,stdio:input?['pipe','inherit','inherit']:capture?['inherit','pipe','inherit']:'inherit'});let output='';if(capture)child.stdout.on('data',c=>output+=c);if(input)child.stdin.end(input+'\n');child.on('error',reject);child.on('exit',code=>code===0?resolve(output):reject(new Error('A configuração parou. Corrija a mensagem acima e execute npm run setup novamente.')));});}
function secret(){return new Promise((resolve,reject)=>{if(!process.stdin.isTTY){reject(new Error('Execute a configuração em um terminal interativo para definir sua senha com segurança.'));return;}process.stdout.write('Defina a senha inicial do admin (12 a 128 caracteres): ');process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');let value='';function done(){process.stdin.setRawMode(false);process.stdin.pause();process.stdin.off('data',onData);process.stdout.write('\n');}function onData(chunk){for(const c of chunk){if(c==='\u0003'){done();reject(new Error('Configuração interrompida.'));return;}if(c==='\r'||c==='\n'){done();if(value.length<12||value.length>128){reject(new Error('A senha precisa ter de 12 a 128 caracteres. Execute npm run setup novamente.'));return;}resolve(value);return;}if(c==='\u007f'||c==='\b'){if(value){value=value.slice(0,-1);process.stdout.write('\b \b');}}else if(c>=' '){value+=c;process.stdout.write('*');}}}process.stdin.on('data',onData);});}
try{
 console.log('Fine Line 3D — primeira publicação na sua conta Cloudflare.');
 await run(['login']);
 let databases=JSON.parse(await run(['d1','list','--json'],{capture:true}));
 let db=databases.find(d=>d.name==='fineline-db');
 if(!db){await run(['d1','create','fineline-db','--update-config=false']);databases=JSON.parse(await run(['d1','list','--json'],{capture:true}));db=databases.find(d=>d.name==='fineline-db');}
 if(!db?.uuid)throw new Error('Não foi possível localizar o ID do banco. Veja a configuração manual no README.');
 const file=path.join(root,'wrangler.jsonc'),config=JSON.parse(await readFile(file,'utf8'));config.d1_databases[0].database_id=db.uuid;await writeFile(file,JSON.stringify(config,null,2)+'\n');
 await run(['d1','migrations','apply','DB','--remote']);
 await run(['deploy']);
 const password=await secret();await run(['secret','put','ADMIN_PASSWORD'],{input:password});
 console.log('\nPublicado. Acesse /admin/ usando o usuário admin e a senha escolhida.');
 console.log('Envie o wrangler.jsonc atualizado ao GitHub. Para vincular fineline3d.com.br, siga a etapa Domínio no README.');
 console.log('Em uma instalação já usada, alterar ADMIN_PASSWORD não troca a senha existente. Use Minha senha no painel.');
}catch(e){console.error(e.message);process.exitCode=1;}
