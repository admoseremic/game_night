export const NEWPAL = [
  ['#22D3EE','#0EA5E9'],['#A78BFA','#7C3AED'],['#F472B6','#DB2777'],['#FBBF24','#F59E0B'],
  ['#4ADE80','#16A34A'],['#FB923C','#EA580C'],['#38BDF8','#6366F1'],['#F87171','#DC2626'],
];
export function nextColor(playerCount) { return NEWPAL[playerCount % NEWPAL.length]; }
