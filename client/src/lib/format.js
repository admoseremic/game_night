const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function fmtDate(iso) { const d = new Date(iso); return MON[d.getMonth()] + ' ' + d.getDate(); }
export function fmtDateY(iso) { const d = new Date(iso); return MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
export function rel(iso, now) {
  const days = Math.floor((now - new Date(iso)) / 864e5);
  if (days <= 0) return 'today'; if (days === 1) return 'yesterday'; if (days < 7) return days + ' days ago';
  if (days < 30) return Math.floor(days / 7) + 'w ago'; if (days < 365) return Math.floor(days / 30) + 'mo ago'; return Math.floor(days / 365) + 'y ago';
}
export function ordinal(n) { const s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
export function tierBg(t) { return t === 'Heavy' ? 'rgba(255,77,141,0.16)' : t === 'Light' ? 'rgba(52,217,160,0.16)' : 'rgba(255,138,61,0.16)'; }
export function tierTx(t) { return t === 'Heavy' ? '#FF6FA5' : t === 'Light' ? '#34D9A0' : '#FF8A3D'; }
export const MEDALS = [['#FFE08A','#F0A92E','#3A2A08'],['#E6ECF5','#AEB8C9','#222833'],['#F3B27A','#D9824A','#3A1E0C']];
export function medalBg(rank) { const m = MEDALS[rank - 1]; return m ? `linear-gradient(135deg,${m[0]},${m[1]})` : 'rgba(255,255,255,0.08)'; }
export function medalTx(rank) { const m = MEDALS[rank - 1]; return m ? m[2] : '#9D90B5'; }
