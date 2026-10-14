/** Calculadora Fine Line 3D. Valores monetários em BRL, custos do LOTE. */
const nonnegative=(v,k)=>{const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error('Valor inválido: '+k);return n};
export function calcularCusto(input) {
 const grams=nonnegative(input.grams,'filamento (g)');
 const kgPrice=nonnegative(input.kgPrice,'preço do kg');
 const hours=nonnegative(input.hours,'tempo (h)');
 const powerWatts=nonnegative(input.powerWatts,'potência (W)');
 const kwhPrice=nonnegative(input.kwhPrice,'tarifa de energia');
 const packaging=nonnegative(input.packaging,'embalagem');
 const extras=nonnegative(input.extras,'extras');
 const laborHours=nonnegative(input.laborHours,'mão de obra (h)');
 const laborPrice=nonnegative(input.laborPrice,'valor da mão de obra');
 const wastePct=nonnegative(input.wastePct,'perdas (%)');
 const marginPct=nonnegative(input.marginPct,'margem (%)');
 const quantity=Number(input.quantity);
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000000)throw new Error('Quantidade deve ser um inteiro positivo.');
 if(wastePct>100)throw new Error('Perdas devem estar entre 0 e 100%.');
 if(marginPct>=100)throw new Error('Margem deve ser menor que 100%.');
 const material=(grams/1000)*kgPrice*(1+wastePct/100);
 const energy=(powerWatts/1000)*hours*kwhPrice;
 const labor=laborHours*laborPrice;
 const lotTotal=material+energy+labor+packaging+extras;
 const unitCost=lotTotal/quantity;
 const suggestedPrice=unitCost/(1-marginPct/100);
 return {material,energy,labor,packaging,extras,lotTotal,unitCost,suggestedPrice,quantity,marginPct};
}
