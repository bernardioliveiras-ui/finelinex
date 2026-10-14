import {calcularCusto} from '/assets/fineline-calculadora-core.js';
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
  result.replaceChildren(dl);error.textContent='';const price=root.querySelector('#calc-featured-price');if(price)price.textContent=money(data.unitCost);const summary=root.querySelector('#calc-summary');if(summary)summary.value=`Estimativa Fine Line 3D: ${data.quantity} peça(s), custo total ${money(data.lotTotal)}, custo por peça ${money(data.unitCost)}. Filamento: ${input.grams} g; impressão: ${input.hours} h.`;
 }catch(e){result.replaceChildren();error.textContent=e.message;const summary=root.querySelector('#calc-summary');if(summary)summary.value='';const price=root.querySelector('#calc-featured-price');if(price)price.textContent='—'}}
 form.addEventListener('reset',()=>queueMicrotask(()=>calculate()));form.addEventListener('submit',calculate);form.addEventListener('input',()=>calculate());calculate();
}
if(typeof document!=='undefined')iniciarCalculadora();
const share=document.querySelector('#calc-share');if(share)share.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.origin+'/calculadora');share.textContent='Link copiado!';}catch{share.textContent='Copie o endereço desta página';}});
const quote=document.querySelector('#calc-quote');if(quote)quote.addEventListener('click',()=>{const summary=document.querySelector('#calc-summary');try{if(summary?.value)sessionStorage.setItem('fineline-calculator-summary',summary.value);else sessionStorage.removeItem('fineline-calculator-summary');}catch{}});
