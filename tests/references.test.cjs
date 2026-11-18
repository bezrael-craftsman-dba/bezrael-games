const assert=require('node:assert/strict');
const Bible=require('../bible-catalog.js');
const R=require('../references.js');
assert.equal(Bible.books.length,66);assert.equal(Bible.books.reduce((n,b)=>n+b.chapters.length,0),1189);
let total=0;
for(const book of Bible.books){
 for(const [index,max] of book.chapters.entries()){
  const chapter=index+1;
  assert.equal(R.validateReference(book.name+' '+chapter+':1').valid,true);
  assert.equal(R.validateReference(book.name+' '+chapter+':'+max).valid,true);
  assert.equal(R.validateReference(book.name+' '+chapter+':'+(max+1)).valid,false);
  total+=max;
 }
 assert.equal(R.validateReference(book.name+' '+(book.chapters.length+1)+':1').valid,false);
 for(const alias of book.aliases)assert.equal(R.validateReference(alias+' 1:1').reference,book.name+' 1:1');
}
assert.equal(total,31102);
for(const bad of ['Libroinventado 1:1','Juan 99:1','Juan 0:1','Juan 1:0','Juan 3:37','Juan 3:18-16','Juan 3:16-999999999','Juan 3:16,','Juan 3:16,,18','Juan 3:1-0','Juan 3:16<script>','Juan3:16=1+1'])assert.equal(R.validateReference(bad).valid,false,bad);
assert.equal(R.validateReference('1Pedro5:7').reference,'1 Pedro 5:7');assert.equal(R.validateReference('II Timoteo 1:7').reference,'2 Timoteo 1:7');
assert.equal(R.validateReference('San Juan 3:16').reference,'Juan 3:16');assert.equal(R.validateReference('Juan 3:18,16,17,20').reference,'Juan 3:16-18,20');
const dedup=R.parseList('Juan 3:16\nJn. 3:16\nJuan 3:16-18\nJuan 3:18');assert.equal(dedup.duplicates,2);assert.deepEqual(dedup.unique,['Juan 3:16','Juan 3:18']);
const simple=R.parseImport('\uFEFFcita\r\nJuan 3:16,Salmos 23:1\r\n"Juan 3:17,19"\r\nJn 3:16\r\nJuan 99:1\r\nInventado 1:1');
assert.deepEqual(simple.unique,['Juan 3:16','Salmos 23:1','Juan 3:17,19']);assert.equal(simple.duplicates,1);assert.equal(simple.invalid.length,2);assert.match(simple.issues[0].reason,/21 capítulos/);
const columns=R.parseImport('libro,capítulo,versículo\nJuan,3,16\nSalmos,23,1\n1 Pedro,5,7\nJuan,3,"17,19"\n');assert.equal(columns.unique.length,4);
const txt=R.parseImport('Juan 3:16,18\r\nSalmos 23:1,Filipenses 4:13\r\nJn 3:16','txt');assert.equal(txt.unique.length,3);assert.equal(txt.duplicates,1);
assert.throws(()=>R.parseImport('"Juan 3:16'),/sin cerrar/);assert.throws(()=>R.parseImport('"Juan 3:16"x'),/fuera/);assert.throws(()=>R.parseImport('cita\n'),/no contiene/);
const merged=R.mergeImport('Juan 3:16\nSalmos 23:1',simple);assert.equal(merged.added,1);assert.equal(merged.duplicates,3);assert.equal(merged.unique.length,3);assert.equal(merged.invalid.length,2);
const replace=R.mergeImport('Mateo 5:14',simple,true);assert.equal(replace.added,3);assert.ok(!replace.text.includes('Mateo'));
const preserved=R.mergeImport('Juan 99:1',columns);assert.ok(preserved.text.includes('Juan 99:1'));
(async()=>{
 const utf8=Buffer.from('Génesis 1:1\nJn 3:16\nJuan 3:16');const file={name:'citas.txt',size:utf8.length,arrayBuffer:async()=>utf8};const imported=await R.readFile(file);assert.equal(imported.unique.length,2);assert.equal(imported.duplicates,1);
 const ansi=Uint8Array.from([71,233,110,101,115,105,115,32,49,58,49]);const legacy=await R.readFile({name:'citas.txt',size:ansi.length,arrayBuffer:async()=>ansi});assert.equal(legacy.unique[0],'Génesis 1:1');assert.equal(legacy.encoding,'Windows-1252');
 await assert.rejects(()=>R.readFile({name:'mal.xlsx',size:1}),/csv/);await assert.rejects(()=>R.readFile({name:'grande.csv',size:2*1024*1024+1}),/2 MB/);
 const A=require('../avatars.js');assert.equal(A.SYMBOLS.length,49);assert.equal(A.COLORS.length,16);assert.equal(new Set(A.SYMBOLS.map(s=>s.value)).size,49);for(const symbol of A.SYMBOLS)assert.equal(A.sanitize({symbol:symbol.value}).symbol,symbol.value);
 console.log('PASS: 66 books / 1189 chapters / 31102 verse bounds; aliases, overlapping verses, CSV/TXT/BOM/encodings, quoted cells, file failures, merging and 49 avatar options.');
})().catch(error=>{console.error(error);process.exitCode=1;});
