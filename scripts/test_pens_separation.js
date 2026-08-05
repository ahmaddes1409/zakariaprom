function isPlastikPen(catTr, catAr, nameTr) {
  const c = (catTr + ' ' + catAr + ' ' + nameTr).toLowerCase();
  if (c.includes('metal') || c.includes('roller') || c.includes('lüks') || c.includes('luks') || c.includes('kurşun') || c.includes('kursun') || c.includes('bambu') || c.includes('dokunmatik')) return false;
  return c.includes('plastik') || c.includes('بلاستيك') || c.includes('kalem');
}

function isMetalPen(catTr, catAr, nameTr) {
  const c = (catTr + ' ' + catAr + ' ' + nameTr).toLowerCase();
  if (c.includes('plastik') || c.includes('بلاستيك') || c.includes('kurşun') || c.includes('bambu') || c.includes('dokunmatik')) return false;
  return c.includes('metal') || c.includes('roller') || c.includes('lüks') || c.includes('luks') || c.includes('معدن');
}

console.log('Plastik Pen Test (Plastik Kalem):', isPlastikPen('Kalemler', '', 'Plastik Tükenmez Kalem'), isMetalPen('Kalemler', '', 'Plastik Tükenmez Kalem'));
console.log('Metal Pen Test (Metal Kalem):', isPlastikPen('Kalemler', '', 'Metal Roller Kalem'), isMetalPen('Kalemler', '', 'Metal Roller Kalem'));
