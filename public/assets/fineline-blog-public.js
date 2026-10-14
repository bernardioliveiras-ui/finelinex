/* FINELINE 3D — blog público; carrega automaticamente os posts publicados. */
(() => {
  const root = document.getElementById('fineline-blog');
  if (!root) return;
  const API = '/api/fineline/blog';
  let lastSnapshot = '';
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className=cls; if (txt !== undefined) n.textContent=txt; return n; };
  function draw(posts) {
    root.replaceChildren();
    root.append(el('h2', 'fineline-blog-title', 'Dicas e novidades da Fine Line 3D'));
    const slug = new URL(location.href).searchParams.get('artigo');
    const active = slug && posts.find(p => p.slug === slug);
    if (active) {
      const article = el('article','fineline-blog-article');
      const back=el('a','fineline-blog-back','← Voltar aos artigos'); back.href=location.pathname;article.append(back);
      article.append(el('h3','',active.title));
      if (active.coverImageUrl) { const img=el('img'); img.src=active.coverImageUrl; img.alt='Capa do artigo'; img.loading='lazy';article.append(img); }
      article.append(el('div','fineline-blog-body',active.body));root.append(article);return;
    }
    if (!posts.length) {root.append(el('p','','Novos conteúdos em breve.'));return;}
    const grid=el('div','fineline-blog-grid');
    for (const post of posts) {
      const card=el('article','fineline-blog-card');
      if(post.coverImageUrl) {const img=el('img');img.src=post.coverImageUrl;img.alt='';img.loading='lazy';card.append(img);}
      card.append(el('h3','',post.title));
      card.append(el('p','',post.excerpt || post.body.slice(0,160) + '…'));
      const link=el('a','fineline-blog-link','Ler artigo →');const u=new URL(location.href);u.searchParams.set('artigo',post.slug);link.href=u.pathname+u.search;card.append(link);
      grid.append(card);
    }
    root.append(grid);
  }
  async function refresh() {
    try {
      const res=await fetch(API,{credentials:'same-origin',cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data=await res.json();
      if(!data.ok || !Array.isArray(data.posts)) throw new Error('Formato de resposta inválido');
      const slug=new URL(location.href).searchParams.get('artigo');
      if(slug && !data.posts.some(p=>p.slug===slug)) {
        const itemResponse=await fetch(API+'/'+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'});
        if(itemResponse.ok) {
          const item=await itemResponse.json();
          if(item.ok && item.post) data.posts.push(item.post);
        }
      }
      const snapshot=JSON.stringify(data.posts);
      if(lastSnapshot!==snapshot) { lastSnapshot=snapshot;draw(data.posts); }
    } catch(e) {
      if(!lastSnapshot) {root.replaceChildren(el('p','fineline-blog-error','Não foi possível carregar os artigos neste momento.'));}
      console.warn('[FINELINE Blog]',e.message);
    }
  }
  refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
