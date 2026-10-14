import {calcularCusto} from './fineline-calculadora-core.js';
export function iniciarCalculadora(root=document) {
 const form=root.querySelector('#fineline-calculadora-form');if(!form)return;
 const result=root.querySelector('#fineline-calculadora-resultado');
 const error=root.querySelector('#fineline-calculadora-erro');
 const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
 function calculate(ev){ev?.preventDefault();try{
  const input=Object.fromEntries(new FormData(form).entries());const data=calcularCusto(input);
  const rows=[['Filamento (com perdas)',data.material],['Energia',data.energy],['Mão de obra',data.labor],['Embalagem',data.packaging],['Extras',data.extras],['Custo total do lote',data.lotTotal],['Custo por peça',data.unitCost],['Preço sugerido por peça',data.suggestedPrice]];
  const dl=document.createElement('dl');dl.className='fineline-calculadora-breakdown';
  for(const [label,value] of rows){const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=money(value);dl.append(dt,dd)}
  result.replaceChildren(dl);error.textContent='';
 }catch(e){result.replaceChildren();error.textContent=e.message}}
 form.addEventListener('submit',calculate);form.addEventListener('input',()=>calculate());calculate();
}
if(typeof document!=='undefined')iniciarCalculadora();
