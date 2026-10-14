'use strict';
const share=document.getElementById('share-article');
share?.addEventListener('click',async()=>{
 const status=document.getElementById('share-feedback');
 try{await navigator.clipboard.writeText(location.origin+location.pathname);status.textContent='Link copiado!';}
 catch{status.textContent='Copie o endereço da barra do navegador para compartilhar.';}
});
