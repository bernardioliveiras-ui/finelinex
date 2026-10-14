import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {calcularCusto} from '../public/assets/fineline-calculadora-core.js';
const input={grams:100,kgPrice:100,hours:5,powerWatts:150,kwhPrice:.9,packaging:2,extras:1,laborHours:.5,laborPrice:20,wastePct:5,marginPct:35,quantity:2};
test('calculadora: insumos, energia, lote, unidade e margem sobre venda',()=>{
 const o=calcularCusto(input);
 assert.equal(o.material,10.5);
 assert.equal(o.energy,.675);
 assert.equal(o.labor,10);
 assert.equal(o.lotTotal,24.175);
 assert.equal(o.unitCost,12.0875);
 assert.equal(o.suggestedPrice,o.unitCost/.65);
});
test('calculadora: margem zero gera preço de custo e permite valores zero',()=>{
 const x=Object.fromEntries(Object.keys(input).map(k=>[k,0]));x.quantity=1;
 const result=calcularCusto(x);
 assert.equal(result.lotTotal,0);assert.equal(result.suggestedPrice,0);
});
test('calculadora: rejeita quantidades inválidas, custos negativos e margens impossíveis',()=>{
 assert.throws(()=>calcularCusto({...input,quantity:0}),/Quantidade/);
 assert.throws(()=>calcularCusto({...input,grams:-3}),/Valor inválido/);
 assert.throws(()=>calcularCusto({...input,marginPct:100}),/Margem/);
 assert.throws(()=>calcularCusto({...input,wastePct:101}),/Perdas/);
 assert.throws(()=>calcularCusto({...input,hours:NaN}),/Valor inválido/);
});
test('painel tem calculadora somente na navegação de administrador, sem alterar rotas públicas',()=>{
 const root=new URL('../',import.meta.url);
 const html=readFileSync(new URL('public/admin/index.html',root),'utf8');
 const script=readFileSync(new URL('public/admin/admin.js',root),'utf8');
 assert.match(html,/data-view="calculator" data-admin/);
 assert.match(html,/id="view-calculator"/);
 assert.match(html,/id="fineline-calculadora-form"/);
 assert.match(script,/\['products','content','users','blog','calculator'\]\.includes\(next\)/);
 assert.ok(existsSync(new URL('public/admin/calculadora.js',root)));
 const config=JSON.parse(readFileSync(new URL('wrangler.jsonc',root),'utf8'));
 assert.equal(config.name,'finelinex');
 assert.equal(config.assets.directory,'./public');
 assert.equal(config.d1_databases[0].binding,'DB');
 assert.ok(existsSync(new URL('migrations/0003_blog.sql',root)));
});
