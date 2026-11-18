const assert=require('node:assert/strict');
const E=require('../engine.js');
const {parseReferences,createDeck,createTournament,tournamentSize,getCurrentMatch,getMatchPlayers,recordPoint,getMatchResolution,recordWinner,getPodium}=E;
const refs=parseReferences('Juan 3:16\n juan 3 : 16 \n1Pedro 5:7\n1 Pedro 5:7\nSalmos 23:1');assert.equal(refs.unique.length,3);assert.equal(refs.duplicates,2);assert.equal(new Set(createDeck(refs.unique,3)).size,3);
function simulate(count,scenario){
  const t=createTournament(Array.from({length:count},(_,i)=>'Persona '+i)),size=tournamentSize(count),eliminated=new Set();let total=0;
  assert.equal(t.matches.length,size.matches);assert.equal(t.matches.filter(m=>m.sources.length===3).length,size.suddenDeathReserve);
  for(const match of t.matches){
    const players=getMatchPlayers(t,match),medal=['bronze','silver'].includes(match.kind);assert.ok(players.every(p=>p&&(medal?eliminated.has(p.id):!eliminated.has(p.id))));assert.equal(new Set(players.map(p=>p.id)).size,players.length);assert.deepEqual(getPodium(t),[]);assert.equal(getCurrentMatch(t).id,match.id);assert.throws(()=>recordWinner(t,match.id,players[0].id));
    const pattern=scenario==='fast'?[0,0]:players.length===3?[0,1,2,1]:[0,1,0];
    for(const [i,index] of pattern.entries()){
      const reference='Referencia '+match.id+'-'+i;assert.throws(()=>recordPoint(t,match.id,'intruso',reference));recordPoint(t,match.id,players[index].id,reference);total++;
      if(i===0)assert.throws(()=>recordPoint(t,match.id,players[index].id,reference));
      if(i<pattern.length-1)assert.notEqual(getMatchResolution(t,match).type,'winner');
    }
    const result=getMatchResolution(t,match);assert.equal(result.type,'winner');assert.throws(()=>recordPoint(t,match.id,players[0].id,'Cita de más'));
    assert.throws(()=>recordWinner(t,match.id,players.find(p=>p.id!==result.winnerId).id));recordWinner(t,match.id,result.winnerId);
    if(!medal)for(const player of players)if(player.id!==match.winner)eliminated.add(player.id);
    assert.throws(()=>recordWinner(t,match.id,match.winner));
    if(scenario==='fast'){assert.equal(match.results.length,2);assert.equal(match.reason,'streak');}
    else if(players.length===3){assert.equal(match.results.length,4);assert.equal(match.reason,'sudden-death');assert.equal(match.results[3].suddenDeath,true);}
    else{assert.equal(match.results.length,3);assert.equal(match.reason,'points');}
  }
  assert.equal(eliminated.size,count-1);assert.equal(getCurrentMatch(t),null);
  const podium=getPodium(t),final=t.matches.find(m=>m.id===t.finalMatchId),medal=t.matches.find(m=>m.id===t.placementMatchId);
  assert.equal(podium.length,Math.min(3,count));assert.equal(new Set(podium.map(p=>p.player.id)).size,podium.length);assert.deepEqual(podium.map(p=>p.place),count===2?[1,2]:[1,2,3]);assert.equal(podium[0].player.id,final.winner);
  if(final.sources.length===2){assert.equal(podium[1].player.id,getMatchPlayers(t,final).find(p=>p.id!==final.winner).id);if(medal){assert.equal(medal.kind,'bronze');assert.ok(medal.sequence<final.sequence);assert.equal(podium[2].player.id,medal.winner);const semifinalLosers=t.rounds.at(-2).flatMap(m=>getMatchPlayers(t,m).filter(p=>p.id!==m.winner).map(p=>p.id)).sort();assert.deepEqual(getMatchPlayers(t,medal).map(p=>p.id).sort(),semifinalLosers);}}
  else {assert.equal(medal.kind,'silver');assert.ok(medal.sequence>final.sequence);assert.equal(podium[1].player.id,medal.winner);assert.equal(podium[2].player.id,getMatchPlayers(t,medal).find(p=>p.id!==medal.winner).id);assert.deepEqual(getMatchPlayers(t,medal).map(p=>p.id).sort(),getMatchPlayers(t,final).filter(p=>p.id!==final.winner).map(p=>p.id).sort());}
  const references=t.matches.flatMap(m=>m.results.map(r=>r.reference));assert.equal(new Set(references).size,references.length);assert.equal(total,scenario==='fast'?size.minimumVerses:size.verses);
}
for(let n=2;n<=128;n++){simulate(n,'fast');simulate(n,'maximum');}
// Exhaust every legal point sequence: no arbitrary winner or fifth verse is possible.
function explore(count,indices=[]){const t=createTournament(Array.from({length:count},(_,i)=>'P'+i)),m=t.matches[0],ps=getMatchPlayers(t,m);
  indices.forEach((index,i)=>recordPoint(t,m.id,ps[index].id,'Juan 1:'+(i+1)));
  const result=getMatchResolution(t,m);
  if(result.type==='winner'){assert.ok(indices.length>=2&&indices.length<=4);if(indices.length===2)assert.equal(indices[0],indices[1]);if(indices.length===4){assert.equal(new Set(indices.slice(0,3)).size,3);assert.equal(result.winnerId,ps[indices[3]].id);}return;}
  if(result.type==='sudden-death'){assert.equal(count,3);assert.equal(indices.length,3);assert.equal(new Set(indices).size,3);assert.throws(()=>recordWinner(t,m.id,ps[0].id));}
  assert.ok(indices.length<4);for(let i=0;i<count;i++)explore(count,[...indices,i]);
}
explore(2);explore(3);
assert.equal(tournamentSize(8).verses,24);assert.equal(tournamentSize(6).verses,16);assert.equal(tournamentSize(3).verses,7);assert.equal(tournamentSize(7).verses,17);assert.throws(()=>createTournament(['Ana','ana']));assert.throws(()=>tournamentSize(1));
const {themes,getTheme}=require('../themes.js');for(const theme of Object.values(themes)){const parsed=parseReferences(theme.references.join('\n'));assert.equal(parsed.invalid.length,0);assert.equal(parsed.duplicates,0);assert.equal(parsed.unique.length,30);}const all=getTheme('todos');assert.equal(new Set(all.references).size,all.references.length);assert.equal(getTheme('__proto__'),null);
const {sanitize}=require('../avatars.js');assert.equal(sanitize({photo:'javascript:alert(1)'}).photo,null);assert.equal(sanitize({photo:'data:image/svg+xml;base64,PHN2Zz4='}).photo,null);
console.log('PASS: exact podium, bronze/silver qualification and reserves; fast and maximum-length tournaments for 2–128 people; every legal point sequence for pairs/triples; early two-in-a-row wins; fresh sudden-death reference; no arbitrary tie winner; no repeat; topic lists valid and deduplicated ('+all.references.length+' combined).');
// Simultaneous draw frames must be permutations of the phase, never mutate the bracket.
const {buildRoundDraw}=E;
for(const count of [4,5,7,8,16,33,128]){
 const t=createTournament(Array.from({length:count},(_,i)=>'D'+i)),snapshot=JSON.stringify(t),actual=buildRoundDraw(t,0),ids=actual.flatMap(group=>group.players.map(p=>p.id)).sort();
 for(let n=0;n<20;n++){const mixed=buildRoundDraw(t,0,true);assert.deepEqual(mixed.map(g=>g.players.length),actual.map(g=>g.players.length));const frameIds=mixed.flatMap(g=>g.players.map(p=>p.id));assert.equal(new Set(frameIds).size,count);assert.deepEqual(frameIds.sort(),ids);}
 assert.equal(JSON.stringify(t),snapshot);assert.deepEqual(buildRoundDraw(t,0),actual);assert.throws(()=>buildRoundDraw(t,1));
}
const {LANGUAGES,frame}=require('../decoys.js');
for(let offset=0;offset<5;offset++){
 const frames=Array.from({length:7},(_,tick)=>frame(tick,'Juan',offset));assert.equal(new Set(frames.map(f=>f.language)).size,5);
 for(const item of frames){assert.notEqual(item.bookKey,'juan');assert.equal(item.text,item.book);assert.ok(!/[0-9:]/.test(item.text));assert.equal(item.numbers,undefined);assert.equal(item.dir,['syc','he'].includes(item.language)?'rtl':'ltr');}
}
assert.equal(LANGUAGES.length,5);assert.ok(frame(0,'Mateo').bookKey!=='mateo');
console.log('PASS: simultaneous draw permutations keep all participants unique and preserve the true bracket; every short animation cycles through five languages and excludes the final book.');
