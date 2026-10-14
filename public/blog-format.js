export function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// Only paragraphs and headings are interpreted. Author-provided HTML stays text.
export function renderArticleText(value=''){
 return String(value).replace(/\r\n?/g,'\n').split(/\n\s*\n/).filter(s=>s.trim()).map(block=>{
  const heading=block.match(/^(#{2,3})\s+([^\n]+)$/);
  return heading?`<h${heading[1].length}>${escapeHTML(heading[2])}</h${heading[1].length}>`:`<p>${escapeHTML(block).replace(/\n/g,'<br>')}</p>`;
 }).join('');
}
