export const NEWPAL = [
  ['#22D3EE','#0EA5E9'],['#A78BFA','#7C3AED'],['#F472B6','#DB2777'],['#FBBF24','#F59E0B'],
  ['#4ADE80','#16A34A'],['#FB923C','#EA580C'],['#38BDF8','#6366F1'],['#F87171','#DC2626'],
];
export function nextColor(playerCount) { return NEWPAL[playerCount % NEWPAL.length]; }

// AVATAR_PALETTE — 18 two-color gradient pairs for the player color picker (3 rows of 6).
// Rows 1–2 ported from design handoff (color sheet, lines 994–1010).
// Row 3 (added 2026-11) = darker / neutral picks: black, slate, midnight, forest, wine, bronze.
// Black deliberately starts at a charcoal (#4B4656) rather than pure black so the tile still
// reads against the app's near-black background (#130E1B). No white/silver swatch — the avatar
// initial is always white text, so a pale tile would need dark-text logic.
export const AVATAR_PALETTE = [
  ['#FF8A3D','#FF5E62'],['#FFC24B','#FF8A3D'],['#F87171','#DC2626'],['#FB7185','#F472B6'],
  ['#FF4D8D','#B14DFF'],['#E879F9','#A21CAF'],['#9B6CFF','#6C8BFF'],['#60A5FA','#818CF8'],
  ['#22D3EE','#0EA5E9'],['#34D9A0','#1FA8E0'],['#2DD4BF','#34D399'],['#A3E635','#65A30D'],
  ['#4B4656','#0E0C14'],['#94A3B8','#475569'],['#4C6EF5','#1B2559'],['#2F9E60','#14532D'],
  ['#B4294F','#5C0F2E'],['#C98A4B','#6B3F1D'],
];
