import { it, expect } from 'vitest';
import { buildHall } from './hall.js';

const data = {
  players: [{ id:'p1', name:'Ann', c1:'#1', c2:'#2', regular:true }, { id:'p2', name:'Bob', c1:'#3', c2:'#4', regular:true }],
  games: [{ id:'g1', name:'G', tier:'Medium', dir:'high', icon:'🎲' }],
  plays: [
    { id:'a', g:'g1', d:'2026-01-05T20:00', parts:[['p1',1,50],['p2',2,40]] },
    { id:'b', g:'g1', d:'2026-02-05T20:00', parts:[['p1',1,55],['p2',2,30]] },
    { id:'c', g:'g1', d:'2026-03-05T20:00', parts:[['p2',1,60],['p1',2,20]] },
    { id:'d', g:'g1', d:'2026-04-05T20:00', parts:[['p1',1,45],['p2',2,35]] },
    { id:'e', g:'g1', d:'2026-05-05T20:00', parts:[['p1',1,48],['p2',2,33]] },
  ],
};
const now = new Date('2026-06-24T20:00:00');

it('hall: most-wins champ, best win%, blowout, rivalry, trophy', () => {
  const vm = buildHall(data, 'all', now, false);
  expect(vm.hasData).toBe(true);
  expect(vm.champ).toMatchObject({ name:'Ann', wins:4 });        // p1 won 4 of 5
  expect(vm.hasWinPct).toBe(true);
  expect(vm.winPct).toMatchObject({ name:'Ann' });               // 80% win
  expect(vm.milestones.length).toBe(4);
  expect(vm.milestones[0]).toMatchObject({ label:'Biggest blowout' });
  expect(vm.milestones[0].value).toMatch(/won by 40/);           // play c: 60 vs 20
  expect(vm.rivalries.length).toBe(1);                            // p1/p2 met 5
  expect(vm.records.length).toBe(1);
  expect(vm.recordsTotal).toBe(1);
});

it('hall: empty window', () => {
  expect(buildHall({ ...data, plays: [] }, 'all', now, false).hasData).toBe(false);
});
