/* Decorative book names only. These never enter the game deck.
   Greek: SBLGNT; Syriac: Peshitta gospel names (Syriaca.org);
   Hebrew: Tanakh titles; Latin: Nova Vulgata titles. See README for sources. */
(function(root){
  'use strict';
  const LANGUAGES=[
    {code:'grc',name:'Griego koiné',dir:'ltr',books:[['mateo','Κατὰ Μαθθαῖον'],['marcos','Κατὰ Μᾶρκον'],['lucas','Κατὰ Λουκᾶν'],['juan','Κατὰ Ἰωάννην'],['romanos','Πρὸς Ῥωμαίους'],['hebreos','Πρὸς Ἑβραίους']]},
    {code:'syc',name:'Arameo',dir:'rtl',books:[['mateo','ܡܬܝ'],['marcos','ܡܪܩܘܣ'],['lucas','ܠܘܩܐ'],['juan','ܝܘܚܢܢ']]},
    {code:'he',name:'Hebreo',dir:'rtl',books:[['genesis','בראשית'],['exodo','שמות'],['salmos','תהילים'],['proverbios','משלי'],['isaias','ישעיהו'],['jeremias','ירמיהו'],['ezequiel','יחזקאל'],['daniel','דניאל']]},
    {code:'la',name:'Latín',dir:'ltr',books:[['genesis','Genesis'],['exodo','Exodus'],['levitico','Leviticus'],['numeros','Numeri'],['josue','Iosue'],['daniel','Danielis'],['mateo','Secundum Matthaeum'],['marcos','Secundum Marcum'],['lucas','Secundum Lucam'],['juan','Secundum Ioannem'],['romanos','Ad Romanos'],['hebreos','Ad Hebraeos']]},
    {code:'es',name:'Español',dir:'ltr',books:[['genesis','Génesis'],['exodo','Éxodo'],['salmos','Salmos'],['proverbios','Proverbios'],['isaias','Isaías'],['daniel','Daniel'],['mateo','Mateo'],['marcos','Marcos'],['lucas','Lucas'],['juan','Juan'],['romanos','Romanos'],['hebreos','Hebreos']]}
  ];
  function normalize(text){return text.normalize('NFD').replace(/[\u0300-\u036f.\s]/g,'').toLowerCase();}
  function frame(tick,excludedBook='',offset=0,random=Math.random){
    const language=LANGUAGES[(tick+offset)%LANGUAGES.length],excluded=normalize(excludedBook);
    const books=language.books.filter(([key])=>normalize(key)!==excluded),book=books[Math.floor(random()*books.length)];
    return {language:language.code,languageName:language.name,dir:language.dir,bookKey:book[0],book:book[1],text:book[1]};
  }
  root.EsgrimaDecoys={LANGUAGES,frame};
  if(typeof module!=='undefined')module.exports=root.EsgrimaDecoys;
})(typeof globalThis!=='undefined'?globalThis:window);
