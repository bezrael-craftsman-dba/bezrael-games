/* Offline reference validation and CSV/TXT imports. Shared with Node verification. */
(function(root){
  'use strict';
  const bible=root.EsgrimaBible||(typeof require==='function'?require('./bible-catalog.js'):null);
  function key(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
  const aliases=new Map();
  for(const book of bible.books)for(const alias of [book.name,...book.aliases])aliases.set(key(alias),book);
  function resolveBook(value){return aliases.get(key(value.trim().replace(/^III\s+/i,'3 ').replace(/^II\s+/i,'2 ').replace(/^I\s+/i,'1 ').replace(/^san\s+/i,'')))||null;}
  function formatVerses(verses){const chunks=[];let start=verses[0],last=start;for(let i=1;i<=verses.length;i++){if(verses[i]===last+1){last=verses[i];continue;}chunks.push(start===last?String(start):start+'-'+last);start=last=verses[i];}return chunks.join(',');}
  function validateReference(value){
    const input=String(value).replace(/^\uFEFF/,'').trim().replace(/^[-•]\s*/,'').replace(/[–—]/g,'-').replace(/\s+/g,' ');
    const match=input.match(/^(.+?)\s*(\d+)\s*:\s*([\d,\s-]+)$/);
    if(!match)return {input,valid:false,reason:'Usa Libro capítulo:versículo, por ejemplo Juan 3:16.'};
    const book=resolveBook(match[1]);if(!book)return {input,valid:false,reason:'El libro «'+match[1].trim()+'» no está en el catálogo de 66 libros.'};
    const chapter=Number(match[2]);if(!Number.isInteger(chapter)||chapter<1||chapter>book.chapters.length)return {input,valid:false,reason:book.name+' tiene '+book.chapters.length+' capítulos.'};
    const max=book.chapters[chapter-1],selected=new Set();
    for(const part of match[3].split(',')){
      const range=part.trim().match(/^(\d+)\s*(?:-\s*(\d+))?$/);
      if(!range)return {input,valid:false,reason:'La lista de versículos está incompleta o mal escrita.'};
      const first=Number(range[1]),last=Number(range[2]||first);
      if(first<1||last<first||last>max)return {input,valid:false,reason:book.name+' '+chapter+' contiene los versículos 1 al '+max+'. Revisa también el orden del rango.'};
      for(let verse=first;verse<=last;verse++)selected.add(verse);
    }
    const verses=[...selected].sort((a,b)=>a-b),reference=book.name+' '+chapter+':'+formatVerses(verses);
    return {input,valid:true,reference,book:book.name,chapter,verses,keys:verses.map(verse=>book.code+'.'+chapter+'.'+verse)};
  }
  function collect(entries){
    const unique=[],invalid=[],issues=[],duplicateEntries=[],seen=new Set();
    for(const value of entries){if(!String(value).trim())continue;const result=validateReference(value);
      if(!result.valid){invalid.push(result.input);issues.push({reference:result.input,reason:result.reason});continue;}
      if(result.keys.some(k=>seen.has(k))){duplicateEntries.push(result.reference);continue;}
      result.keys.forEach(k=>seen.add(k));unique.push(result.reference);
    }
    return {unique,invalid,issues,duplicates:duplicateEntries.length,duplicateEntries};
  }
  function parseList(text){return collect(String(text).split(/[\n;]+/));}
  function csvRows(text){
    const rows=[];let row=[],cell='',quoted=false,closed=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
      if(c===','||c==='\n'||c==='\r'){row.push(cell.trim());cell='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[];}continue;}
      if(closed){if(!/\s/.test(c))throw new Error('Hay texto fuera de las comillas de una celda CSV.');continue;}
      if(c==='"'){if(cell.trim())throw new Error('Las comillas de una celda CSV no están bien colocadas.');cell='';quoted=true;}
      else cell+=c;
    }
    if(quoted)throw new Error('El archivo tiene una celda con comillas sin cerrar.');
    row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
  }
  function parseImport(text,format='csv'){
    text=String(text).replace(/^\uFEFF/,'');let rows;
    if(format==='txt')rows=text.split(/\r?\n|\r/).flatMap(line=>validateReference(line).valid?[[line]]:csvRows(line));else rows=csvRows(text);
    const entries=[];let first=true;
    for(const row of rows){if(!row.some(Boolean))continue;
      if(first){first=false;const normalized=row.map(key);if((row.length===1&&['cita','citas','referencia','referencias'].includes(normalized[0]))||(normalized.length===3&&normalized[0]==='libro'&&normalized[1]==='capitulo'&&['versiculo','versiculos'].includes(normalized[2])))continue;}
      if(row.length===3&&!row[0].includes(':')&&/^\d+$/.test(row[1])&&/^[\d,\s-]+$/.test(row[2]))entries.push(row[0]+' '+row[1]+':'+row[2]);
      else entries.push(...row.filter(Boolean));
      if(entries.length>10000)throw new Error('Carga como máximo 10 000 citas por archivo.');
    }
    if(!entries.length)throw new Error('El archivo no contiene citas. Revisa el formato o descarga el ejemplo.');
    return collect(entries);
  }
  function mergeImport(currentText,incoming,replace=false){
    const base=replace?{unique:[],invalid:[]}:parseList(currentText),merged=collect([...base.unique,...incoming.unique]);
    return {added:merged.unique.length-base.unique.length,accepted:merged.unique.slice(base.unique.length),unique:merged.unique,duplicates:incoming.duplicates+merged.duplicates,duplicateEntries:[...incoming.duplicateEntries,...merged.duplicateEntries],invalid:incoming.invalid,issues:incoming.issues,text:[...merged.unique,...base.invalid].join('\n')};
  }
  async function readFile(file){
    if(!/\.(csv|txt)$/i.test(file.name))throw new Error('Selecciona un archivo .csv o .txt.');
    if(file.size>2*1024*1024)throw new Error('El archivo debe pesar como máximo 2 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());let text,encoding='UTF-8';
    if(bytes[0]===0xff&&bytes[1]===0xfe){text=new TextDecoder('utf-16le').decode(bytes);encoding='UTF-16';}
    else if(bytes[0]===0xfe&&bytes[1]===0xff){text=new TextDecoder('utf-16be').decode(bytes);encoding='UTF-16';}
    else try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('windows-1252').decode(bytes);encoding='Windows-1252';}
    return {...parseImport(text,/\.txt$/i.test(file.name)?'txt':'csv'),filename:file.name,encoding};
  }
  root.EsgrimaReferences={validateReference,parseList,parseImport,mergeImport,readFile,resolveBook};
  if(typeof module!=='undefined')module.exports=root.EsgrimaReferences;
})(typeof globalThis!=='undefined'?globalThis:window);
