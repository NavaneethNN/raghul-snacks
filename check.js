const b = document.querySelector('.hero-banner');
const h = document.querySelector('.hero');
if (b && h) {
  const bs = getComputedStyle(b);
  const hs = getComputedStyle(h);
  const br = b.getBoundingClientRect();
  const hr = h.getBoundingClientRect();
  console.log('BANNER:', JSON.stringify({w:br.width,h:br.height,top:br.top,bottom:br.bottom,pos:bs.position,overflow:bs.overflow,display:bs.display,zIndex:bs.zIndex}));
  console.log('HERO:', JSON.stringify({w:hr.width,h:hr.height,top:hr.top,bottom:hr.bottom,overflow:hs.overflow,paddingBottom:hs.paddingBottom}));
} else {
  console.log('NOT_FOUND', !!b, !!h);
}
