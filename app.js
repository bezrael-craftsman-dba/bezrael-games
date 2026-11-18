'use strict';
const $ = id => document.getElementById(id);
const {parseReferences,createDeck,parsePlayers,tournamentSize,createTournament,getCurrentMatch,getMatchPlayers,recordWinner,recordPoint,getMatchScore,getMatchLeaders,getMatchResolution,buildRoundDraw,getPodium,VERSES_PER_MATCH} = EsgrimaEngine;
const EXAMPLE=['Juan 3:16','Salmos 23:1','Filipenses 4:13','Proverbios 3:5','Josué 1:9','Romanos 8:28','Jeremías 29:11','Mateo 6:33','Isaías 41:10','Hebreos 11:1','1 Pedro 5:7','Daniel 6:10','Salmos 119:105','Salmos 46:1','Salmos 27:1','Proverbios 4:23','Mateo 5:14','Mateo 11:28','Mateo 28:19','Marcos 12:30','Lucas 6:31','Juan 8:12','Juan 14:6','Hechos 1:8','Romanos 12:2','1 Corintios 13:4','2 Corintios 5:17','Gálatas 5:22','Efesios 6:11','Santiago 1:5'].join('\n');
const STORE='bezrael-esgrima-config-v2';
const LEGACY_STORE='peniel-esgrima-config-v1';
let introTimer=null,introTick=null,introDone=null;
let visitedPlayers=false,importedReferences=null,referenceReadVersion=0;
let setupStep='references',avatarRecords=[],editingAvatarIndex=null,avatarDraft=null,photoVersion=0,storageWarning=false;
let mode='classic',state='setup',deck=[],history=[],tournament=null,activeMatch=null,selectedWinner=null;
let pendingTimer=null,animationTimer=null,animationVersion=0,sound=false,audio=null,toastTimer=null,previousUniqueCount=12;
let saved=null;
try {saved=JSON.parse(localStorage.getItem(STORE)||localStorage.getItem(LEGACY_STORE));} catch {}
$('references').value=typeof saved?.references==='string'?saved.references:EXAMPLE;
$('roundCount').value=Number.isInteger(saved?.count)?saved.count:12;
$('duration').value=['1200','2200','3500'].includes(saved?.duration)?saved.duration:'2200';
$('participants').value=typeof saved?.participants==='string'?saved.participants:Array.from({length:8},(_,i)=>'Participante '+(i+1)).join('\n');
$('participantCount').value=parsePlayers($('participants').value).names.length;
mode=saved?.mode==='tournament'?'tournament':'classic';sound=saved?.sound===true;
$('themeSelect').value=EsgrimaThemes.getTheme(saved?.theme)?saved.theme:'amor';
previousUniqueCount=parseReferences($('references').value).unique.length;
avatarRecords=Array.isArray(saved?.avatarRecords)?saved.avatarRecords.slice(0,128).filter(item=>typeof item?.name==='string').map((item,i)=>({name:item.name,avatar:EsgrimaAvatars.sanitize(item.avatar,i)})):[];
reconcileAvatars();
function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;}
function save(){try{localStorage.setItem(STORE,JSON.stringify({references:$('references').value,count:Number($('roundCount').value),duration:$('duration').value,participants:$('participants').value,mode,sound,avatarRecords,theme:$('themeSelect').value}));}catch{if(!storageWarning){storageWarning=true;toast('Puedes jugar, pero no se pudo guardar la configuración en este navegador.');}}}
function pad(n){return String(n).padStart(2,'0');}
function announce(text){$('announcement').textContent=text;}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3400);}
function setKeyHint(text){$('keyHint').replaceChildren(document.createTextNode('Presiona '),node('kbd','','Enter ↵'),document.createTextNode(' '+text));}
function displayTitle(text){const title=$('displayTitle');title.textContent=text;title.lang='es';title.dir='ltr';delete title.dataset.script;$('decoyLanguage').hidden=true;}
function displayDecoy(frame){const title=$('displayTitle'),book=node('bdi','decoy-book',frame.book);book.dir=frame.dir;book.lang=frame.language;title.replaceChildren(book);title.lang=frame.language;title.dir=frame.dir;title.dataset.script=frame.language;$('decoyLanguage').textContent=frame.languageName;$('decoyLanguage').hidden=false;}
function reconcileAvatars(){
  const names=parsePlayers($('participants').value).names.slice(0,128),old=avatarRecords,used=new Set();
  const key=name=>name.trim().toLocaleLowerCase();
  avatarRecords=names.map((name,i)=>{let index=old.findIndex((record,j)=>!used.has(j)&&key(record.name)===key(name));
    if(index<0&&old[i]&&!used.has(i)&&!names.some(other=>key(other)===key(old[i].name)))index=i;
    if(index>=0)used.add(index);return {name,avatar:EsgrimaAvatars.sanitize(index>=0?old[index].avatar:null,i)};
  });
}
function renderAvatarRoster(){
  $('avatarRoster').replaceChildren();avatarRecords.forEach((record,i)=>{const button=node('button','avatar-card');button.type='button';button.setAttribute('aria-label','Personalizar avatar de '+record.name);button.append(EsgrimaAvatars.make(record.name,record.avatar),node('strong','',record.name),node('small','','Editar avatar'));button.addEventListener('click',()=>openAvatarEditor(i));$('avatarRoster').append(button);});
}
function openAvatarEditor(index){
  editingAvatarIndex=index;avatarDraft={...avatarRecords[index].avatar};photoVersion++;$('avatarError').textContent='';$('saveAvatarBtn').disabled=false;$('uploadAvatarBtn').disabled=false;$('avatarUpload').value='';
  $('avatarDialogTitle').textContent='Avatar de '+avatarRecords[index].name;$('avatarCategory').value='all';renderAvatarEditor();$('avatarDialog').showModal();
}
function renderAvatarEditor(){
  if(editingAvatarIndex===null||!avatarDraft)return;
  $('avatarPreview').replaceChildren(EsgrimaAvatars.make(avatarRecords[editingAvatarIndex].name,avatarDraft,'avatar-large'));
  if(!$('avatarSymbols').children.length){
    for(const symbol of EsgrimaAvatars.SYMBOLS){const button=node('button','avatar-symbol',symbol.value==='initials'?'Ab':symbol.value);button.type='button';button.dataset.symbol=symbol.value;button.dataset.group=symbol.group;button.title=symbol.label;button.setAttribute('aria-label',symbol.label);button.addEventListener('click',()=>{avatarDraft.symbol=symbol.value;avatarDraft.photo=null;renderAvatarEditor();});$('avatarSymbols').append(button);}
    const colorNames=EsgrimaAvatars.COLOR_NAMES;
    EsgrimaAvatars.COLORS.forEach((color,i)=>{const button=node('button','avatar-color');button.type='button';button.style.backgroundColor=color;button.dataset.color=color;button.setAttribute('aria-label','Color '+colorNames[i]);button.addEventListener('click',()=>{avatarDraft.color=color;renderAvatarEditor();});$('avatarColors').append(button);});
  }
  for(const button of $('avatarSymbols').children){button.setAttribute('aria-pressed',String(!avatarDraft.photo&&button.dataset.symbol===avatarDraft.symbol));button.hidden=$('avatarCategory').value!=='all'&&button.dataset.group!==$('avatarCategory').value&&button.dataset.symbol!=='initials';}
  for(const button of $('avatarColors').children)button.setAttribute('aria-pressed',String(button.dataset.color===avatarDraft.color));
  $('removeAvatarPhotoBtn').hidden=!avatarDraft.photo;
}
function selectMode(next){if(state!=='setup')return;mode=next;visitedPlayers=false;syncMode();setSetupStep('references');validate();}
function syncMode(){
  const isTournament=mode==='tournament';
  for(const [id,active] of [['classicMode',!isTournament],['tournamentMode',isTournament]]){$(id).classList.toggle('selected',active);$(id).setAttribute('aria-pressed',String(active));}
  $('classicCountField').hidden=isTournament;$('stepPlayers').hidden=!isTournament;
  $('stepArena').querySelector('span').textContent=isTournament?'03':'02';
  $('referencesNextLabel').textContent=isTournament?'Continuar: participantes':'Entrar a la arena';
  $('referencesSummaryTitle').textContent=isTournament?'Cada acierto cuenta.':'Todos contra la cita.';
  $('referencesSummaryCopy').textContent=isTournament?'Primero prepara la lista. En el siguiente paso registrarás a las personas y sus avatares.':'Las referencias salen al azar. Tú das tiempo para leer y avanzas con Enter.';
  $('referencesNote').textContent=isTournament?'Calcularemos las citas necesarias cuando registres a los participantes.':'Tu lista se ocultará durante el juego.';
}
function setSetupStep(step){
  setupStep=step==='players'&&mode==='tournament'?'players':'references';
  const players=setupStep==='players';if(players)visitedPlayers=true;$('referencesStep').hidden=players;$('playersStep').hidden=!players;
  $('stepCites').toggleAttribute('aria-current',!players);if(!players)$('stepCites').setAttribute('aria-current','step');
  $('stepPlayers').toggleAttribute('aria-current',players);if(players)$('stepPlayers').setAttribute('aria-current','step');
  $('stepCites').classList.toggle('done',players);$('setupSubtitle').textContent=players?'Ahora dale nombre y rostro a cada participante.':'Primero elige el modo y agrega tus citas bíblicas.';
  $('navStage').textContent=players?'Participantes':'Citas bíblicas';
  if(players)renderAvatarRoster();window.scrollTo({top:0,behavior:'instant'});
}
function continueSetup(){const config=validate();if(!config.referencesValid)return;if(mode==='classic')beginSession();else{setSetupStep('players');validate();$('participantCount').focus({preventScroll:true});}}
function validate(adjustCount=false){
  const parsed=parseReferences($('references').value),n=parsed.unique.length,players=parsePlayers($('participants').value);
  let count=Number($('roundCount').value),size=null;
  if(adjustCount){if(count===previousUniqueCount||count>n||!count)$('roundCount').value=n||'';count=Number($('roundCount').value);}
  previousUniqueCount=n;$('roundCount').max=String(n);$('uniqueBadge').textContent=n+(n===1?' única':' únicas');
  $('playersBadge').textContent=players.names.length+' personas';
  const messages=[],playerErrors=[];
  if(parsed.duplicates)messages.push(parsed.duplicates+(parsed.duplicates===1?' duplicado excluido.':' duplicados excluidos.'));
  if(parsed.invalid.length)messages.push('Revisa '+parsed.invalid.length+' cita(s): '+parsed.issues.slice(0,2).map(issue=>'«'+issue.reference.slice(0,45)+'»: '+issue.reason).join(' '));
  if(!n)messages.push('Agrega al menos una cita válida.');if(mode==='tournament'&&n>0&&n<3)messages.push('Agrega al menos 3 citas para preparar un duelo.');
  let valid=n>0&&!parsed.invalid.length;
  if(mode==='tournament'){
    if(players.names.length<2||players.names.length>128)playerErrors.push('Registra entre 2 y 128 personas.');
    if(players.duplicates.length)playerErrors.push('Distingue los nombres repetidos: '+players.duplicates.slice(0,3).join(', ')+'. Puedes agregar un apellido.');
    if(Number($('participantCount').value)!==players.names.length)playerErrors.push('Pulsa Generar lista o ajusta los nombres para que coincidan con la cantidad.');
    if(!playerErrors.length){size=tournamentSize(players.names.length);count=size.verses;}
    valid=valid&&!playerErrors.length&&!!size&&n>=count;
    $('tournamentRequirement').textContent=size?'Reserva '+count+' citas únicas para '+size.matches+(size.matches===1?' enfrentamiento. ':' enfrentamientos. ')+(size.medalMatches?'Incluye el duelo '+(size.medalPlayers===2&&players.names.length%2===1&&size.matches===2?'por segundo y tercer lugar. ':'de clasificación del podio. '):'')+(size.suddenDeathReserve?'Incluye '+size.suddenDeathReserve+(size.suddenDeathReserve===1?' posible muerte súbita. ':' posibles muertes súbitas. '):'')+(n>=count?'Tienes suficientes.':'Faltan '+(count-n)+'.'):'Registra los participantes para calcular las citas necesarias.';
    $('tournamentRequirement').classList.toggle('error',!!size&&n<count);
    if(visitedPlayers&&setupStep==='references'&&size)$('referencesNote').textContent='Este torneo necesita '+count+' citas únicas. Tienes '+n+'.';
  }else{
    const validCount=Number.isInteger(count)&&count>=1&&count<=n;
    if(n&&!validCount)messages.push('Elige entre 1 y '+n+' citas.');valid=valid&&validCount;
  }
  $('validation').textContent=messages.join(' ');$('validation').classList.toggle('error',!n||!!parsed.invalid.length||(mode==='tournament'?n<3:!valid));
  $('playersValidation').textContent=playerErrors.join(' ');$('playersValidation').classList.toggle('error',!!playerErrors.length);
  const referencesValid=n>0&&!parsed.invalid.length&&(mode==='tournament'?n>=VERSES_PER_MATCH:valid);
  $('referencesNextBtn').disabled=!referencesValid;$('prepareBtn').disabled=!valid;
  $('fixReferencesBtn').hidden=mode!=='tournament'||!size||n>=count;
  $('referencesNumbers').replaceChildren();
  for(const [value,label] of (mode==='tournament'?[[n,'citas disponibles'],['2–3','citas por duelo']]:[[count||'—','citas'],[0,'repeticiones']])){const item=node('div');item.append(node('strong','',value),node('span','',label));$('referencesNumbers').append(item);}
  $('summaryNumbers').replaceChildren();
  const numbers=mode==='tournament'?[[players.names.length,'personas'],[size?.rounds??'—','fases'],[size?.verses??'—','citas máx.']]:[[Number.isInteger(count)&&count>0?count:'—','citas'],['0','repeticiones']];
  for(const [value,label] of numbers){const item=node('div');item.append(node('strong','',value),node('span','',label));$('summaryNumbers').append(item);}
  save();return {...parsed,valid,referencesValid,count,players:players.names,size};
}
function updateState(next){
  state=next;$('arenaCenter').dataset.state=next;
  const busy=['spinning','match-intro','sudden-intro','podium'].includes(next);$('nextBtn').disabled=busy;$('backSetupBtn').disabled=busy;$('resetBtn').disabled=busy;
  $('winnerPanel').hidden=!(mode==='tournament'&&next==='revealed');
  $('nextBtn').hidden=mode==='tournament'&&next==='revealed';
}
function updateStats(){
  $('remainingLabel').textContent=state==='finished'&&mode==='tournament'?'SIN USAR':'POR DESCUBRIR';$('shownStat').textContent=pad(history.length);$('remainingStat').textContent=pad(Math.max(0,deck.length-history.length));$('totalStat').textContent=pad(deck.length);
  const completed=mode==='tournament'?tournament.matches.filter(match=>match.winner).length:history.length;
  const units=mode==='tournament'?tournament.matches.length:deck.length;const progress=units?Math.round(completed/units*100):0;
  $('gameProgress').style.width=progress+'%';$('completionStat').textContent=progress+' %'+(mode==='tournament'?' · enfrentamientos resueltos':'');
}
function phaseName(roundIndex){const round=tournament.rounds[roundIndex];if(round.length===1)return 'Final';if(round.length===2)return 'Semifinales';if(round.length===4)return 'Cuartos de final';return 'Ronda '+(roundIndex+1);}
function matchTitle(match){return match.kind==='bronze'?'Duelo por el tercer lugar':match.kind==='silver'?'Duelo por el segundo y tercer lugar':phaseName(match.round);}
function renderMatch(){
  const playing=mode==='tournament'&&!!activeMatch&&!['finished','podium'].includes(state);$('matchBanner').hidden=!playing;if(!playing)return;
  const scores=getMatchScore(tournament,activeMatch);
  $('matchPhase').textContent=matchTitle(activeMatch)+' · Duelo '+(activeMatch.sequence+1)+' de '+tournament.matches.length;
  $('tripleBadge').hidden=scores.length!==3;$('matchPlayers').replaceChildren();
  scores.forEach(({player,points},i)=>{if(i)$('matchPlayers').append(node('span','versus','VS'));const chip=node('div','player-chip'),info=node('div','player-info');info.append(node('strong','',player.name),node('small','player-score',points+(points===1?' punto':' puntos')));chip.append(EsgrimaAvatars.make(player.name,player.avatar),info);$('matchPlayers').append(chip);});
  $('duelProgress').replaceChildren();
  for(let i=0;i<VERSES_PER_MATCH;i++){const complete=i<activeMatch.results.length,unused=!!activeMatch.winner&&!complete;const marker=node('span','duel-verse'+(complete?' complete':unused?' skipped':i===activeMatch.results.length?' current':''),'Versículo '+(i+1)+(complete?' ✓':unused?' · sin usar':''));$('duelProgress').append(marker);}
  const sudden=activeMatch.results.length>=3&&(getMatchResolution(tournament,activeMatch).type==='sudden-death'||activeMatch.reason==='sudden-death');
  $('matchBanner').classList.toggle('sudden-match',sudden);
  if(sudden)$('duelProgress').append(node('span','duel-verse sudden'+(activeMatch.winner?' complete':' current'),'Muerte súbita'+(activeMatch.winner?' ✓':'')));

}
function renderBracket(){
  $('bracket').replaceChildren();if(!tournament)return;
  const completed=tournament.matches.filter(match=>match.winner).length;
  $('tournamentProgress').textContent=completed+' / '+tournament.matches.length+' resueltos';
  const groups=tournament.rounds.map((matches,r)=>({title:phaseName(r),matches}));
  const placement=tournament.matches.find(match=>match.id===tournament.placementMatchId);
  if(placement)groups.push({title:placement.kind==='bronze'?'Tercer lugar':'Segundo y tercer lugar',matches:[placement]});
  for(const group of groups){
    const column=node('div','bracket-column');column.append(node('h3','',group.title));
    for(const match of group.matches){
      const current=activeMatch?.id===match.id&&!match.winner;
      const card=node('article','bracket-match'+(current?' current':'')+(match.winner?' completed':''));
      if(current)card.setAttribute('aria-current','step');
      const label=node('div','bracket-match-label');label.append(node('span','','Duelo '+(match.sequence+1)),node('span','',match.sources.length===3?'TRIPLE':'DUELO'));card.append(label);
      getMatchPlayers(tournament,match).forEach((player,i)=>{
        const source=match.sources[i],previous=tournament.matches.find(item=>item.id===source.match);const text=player?.name||(source.loser?'Aspirante al podio '+(previous.sources.length===3?(source.loserIndex+1)+' ':'')+'del duelo ':'Ganador del duelo ')+(previous.sequence+1);
        const row=node('div','bracket-player'+(match.winner===player?.id?' winner':match.winner?' eliminated':''));if(player)row.append(EsgrimaAvatars.make(player.name,player.avatar,'avatar-small'));row.append(node('span','',text));if(player&&match.results.length)row.append(node('small','bracket-score',String(match.results.filter(result=>result.playerId===player.id).length)));if(match.winner===player?.id)row.append(node('b','','✓'));card.append(row);
      });
      if(current)card.append(node('span','current-label',getMatchResolution(tournament,match).type==='sudden-death'?'MUERTE SÚBITA':'EN JUEGO'));if(match.winner)card.append(node('span','match-reason',match.reason==='streak'?'Ganó con dos seguidas':match.reason==='sudden-death'?'Ganó la muerte súbita':'Ganó por puntos'));column.append(card);
    }
    $('bracket').append(column);
  }
}
function renderHistory(){
  $('historyList').replaceChildren();
  for(const entry of history){const item=node('li'),text=node('div','history-entry');text.append(node('strong','',entry.ref));
    if(entry.matchId){const match=tournament.matches.find(m=>m.id===entry.matchId),names=getMatchPlayers(tournament,match).map(p=>p.name).join(' vs '),point=match.results.find(result=>result.reference===entry.ref),winner=tournament.players.find(p=>p.id===point?.playerId);text.append(node('small','',names+' · '+(entry.suddenDeath?'Muerte súbita':'Versículo '+entry.verse+'/3')+' · '+(winner?'Punto para '+winner.name:'Punto pendiente')));}
    item.append(text);$('historyList').append(item);
  }
  $('historyEmpty').hidden=history.length>0;
}
function showReady(){
  selectedWinner=null;$('confirmWinnerBtn').disabled=true;$('podiumSummary').hidden=true;$('championAvatar').hidden=true;$('championAvatar').replaceChildren();updateState('ready');$('revealProgress').hidden=true;
  $('stateLabel').textContent=mode==='tournament'?'ENFRENTAMIENTO LISTO':'ESPERANDO JUGADORES';
  $('roundBadge').textContent=mode==='tournament'?'DUELO '+(activeMatch.sequence+1)+' / '+tournament.matches.length:'CITAS · '+deck.length;
  $('displayEyebrow').textContent=mode==='tournament'?(activeMatch.kind==='bronze'?'LA MEDALLA DE BRONCE SE DECIDE AQUÍ':activeMatch.kind==='silver'?'PLATA Y BRONCE EN JUEGO':'SOLO UNA PERSONA AVANZA'):'EL PRÓXIMO PUNTO PUEDE SER TUYO';
  displayTitle(mode==='tournament'?'La arena está lista.':'Biblias listas.\n¿Comenzamos?');
  $('displayCopy').textContent=mode==='tournament'?'Dos aciertos seguidos dan la victoria. Si no hay racha, se juega la tercera cita.':'Ponte de pie, encuentra la cita y léela en voz alta.';
  $('nextLabel').textContent=mode==='tournament'?'Revelar versículo 1 de 3':history.length?'Siguiente cita':'Revelar primera cita';setKeyHint('para revelar la cita');
  if(mode==='tournament'&&getMatchResolution(tournament,activeMatch).type==='sudden-death'){$('stateLabel').textContent='MUERTE SÚBITA';$('roundBadge').textContent='UNA CITA DECISIVA';$('displayEyebrow').textContent='EL SIGUIENTE PUNTO LO DECIDE TODO';displayTitle('Todo o nada.');$('displayCopy').textContent='Quien gane esta cita avanza.';$('nextLabel').textContent='Revelar cita decisiva';}
  renderMatch();renderBracket();updateStats();
}
function beginSession(){
  const config=validate();if(!config.valid)return;
  cancelAnimation();tournament=mode==='tournament'?createTournament(config.players):null;activeMatch=tournament?getCurrentMatch(tournament):null;
  if(tournament)tournament.players.forEach((player,i)=>{player.avatar=EsgrimaAvatars.sanitize(avatarRecords[i]?.avatar,i);});
  deck=createDeck(config.unique,config.count);history=[];
  $('setupView').hidden=true;$('playView').hidden=false;document.body.dataset.view='play';document.body.dataset.mode=mode;
  $('navStage').textContent='La arena';$('backSetupBtn').hidden=false;$('fullscreenBtn').hidden=false;
  $('playModeLabel').textContent=mode==='tournament'?'MODO TORNEO':'MODO CLÁSICO';
  $('bracketSection').hidden=mode!=='tournament';$('bracketJumpBtn').hidden=mode!=='tournament';
  showReady();renderHistory();window.scrollTo({top:0,behavior:'instant'});if(mode==='tournament')runPresentation('draw',()=>{showReady();$('nextBtn').focus({preventScroll:true});});else $('nextBtn').focus({preventScroll:true});
  announce(mode==='tournament'?'Torneo sorteado. '+config.players.length+' personas, '+tournament.matches.length+(tournament.matches.length===1?' enfrentamiento':' enfrentamientos')+', victoria por racha y muerte súbita.':'Partida clásica lista. '+deck.length+(deck.length===1?' cita.':' citas.'));
}
function revealNext(){
  if(state==='spinning')return;if(history.length>=deck.length){if(mode==='classic')finishGame();return;}
  prepareAudio();updateState('spinning');const duration=Number($('duration').value),version=++animationVersion;
  $('stateLabel').textContent='BUSCANDO TU PRÓXIMA CITA';$('roundBadge').textContent=mode==='tournament'?(getMatchResolution(tournament,activeMatch).type==='sudden-death'?'MUERTE SÚBITA':'VERSÍCULO '+(activeMatch.results.length+1)+' / 3'):'CITA '+pad(history.length+1)+' / '+pad(deck.length);
  $('displayEyebrow').textContent='ATENCIÓN. EL DESAFÍO ESTÁ POR APARECER.';$('displayCopy').textContent='Preparen sus Biblias…';$('nextLabel').textContent='Revelando cita';$('keyHint').textContent='Un momento. Que comience el desafío.';
  $('revealProgress').hidden=false;$('revealProgress').style.setProperty('--reveal-duration',duration+'ms');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finalBook=deck[history.length].replace(/\s+\d+:.+$/,''),languageOffset=Math.floor(Math.random()*EsgrimaDecoys.LANGUAGES.length);let tick=0;
  const scramble=()=>{if(version!==animationVersion)return;displayDecoy(EsgrimaDecoys.frame(tick++,finalBook,languageOffset));if(tick%2===0)tone(200+Math.min(400,tick*24),.035,0,.012);};
  displayTitle('Preparados…');scramble();if(!reduced)animationTimer=setInterval(scramble,160);
  pendingTimer=setTimeout(()=>{
    if(version!==animationVersion)return;clearInterval(animationTimer);animationTimer=null;pendingTimer=null;
    const ref=deck[history.length];history.push({ref,matchId:mode==='tournament'?activeMatch.id:null,verse:mode==='tournament'?activeMatch.results.length+1:null,suddenDeath:mode==='tournament'&&getMatchResolution(tournament,activeMatch).type==='sudden-death'});updateState('revealed');
    $('stateLabel').textContent=mode==='tournament'?'LEE PRIMERO PARA AVANZAR':history.length===deck.length?'ÚLTIMA CITA DE LA PARTIDA':'¡ENCUENTRA LA CITA!';
    $('displayEyebrow').textContent='TU CITA BÍBLICA';displayTitle(ref);$('displayCopy').textContent='Encuéntrala, ponte de pie y léela en voz alta.';$('revealProgress').hidden=true;
    if(mode==='tournament'){renderWinnerChoices();renderMatch();$('keyHint').textContent='Confirma quién gana el punto de este versículo.';}
    else{$('nextLabel').textContent=history.length===deck.length?'Finalizar partida':'Siguiente cita';setKeyHint(history.length===deck.length?'para ver el cierre':'cuando estén listos');}
    updateStats();renderHistory();announce('Cita '+history.length+' de '+deck.length+'. '+ref+'.');tone(523.25,.22);tone(783.99,.3,.12);tone(1046.5,.4,.23);
  },duration);
}
function renderWinnerChoices(){
  selectedWinner=null;$('confirmWinnerBtn').disabled=true;$('confirmWinnerBtn').removeAttribute('aria-label');$('winnerChoices').replaceChildren();
  const sudden=getMatchResolution(tournament,activeMatch).type==='sudden-death';
  $('winnerTitle').textContent=sudden?'¿Quién ganó la muerte súbita?':'¿Quién ganó el versículo '+(activeMatch.results.length+1)+' de 3?';
  $('winnerDescription').textContent=sudden?'Este punto decide quién avanza. Selecciona a quien leyó correctamente primero.':'Selecciona a quien leyó correctamente primero. Se sumará un punto.';
  $('confirmWinnerLabel').textContent=sudden?'Confirmar punto decisivo':'Confirmar punto';
  for(const player of getMatchPlayers(tournament,activeMatch)){const button=node('button','winner-choice');button.append(EsgrimaAvatars.make(player.name,player.avatar,'avatar-small'),node('span','',player.name));button.type='button';button.setAttribute('aria-label',player.name);button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>{selectedWinner=player.id;for(const other of $('winnerChoices').children)other.setAttribute('aria-pressed',String(other===button));$('confirmWinnerBtn').disabled=false;$('confirmWinnerBtn').setAttribute('aria-label','Confirmar punto: '+player.name);});$('winnerChoices').append(button);
  }
}
function confirmWinner(){
  if(mode!=='tournament'||!selectedWinner||state!=='revealed')return;
  const player=tournament.players.find(p=>p.id===selectedWinner),entry=history[history.length-1];
  recordPoint(tournament,activeMatch.id,selectedWinner,entry.ref);renderMatch();renderHistory();renderBracket();updateStats();
  const resolution=getMatchResolution(tournament,activeMatch);
  if(resolution.type==='winner'){advanceWinner(resolution.winnerId);return;}
  if(resolution.type==='sudden-death'){announce('Empate 1–1–1. Comienza la muerte súbita.');runPresentation('sudden',()=>{showReady();revealNext();});return;}
  updateState('verse-scored');$('stateLabel').textContent='PUNTO CONFIRMADO';$('displayEyebrow').textContent='VERSÍCULO '+activeMatch.results.length+' DE 3 RESUELTO';displayTitle('Punto para '+player.name);$('displayCopy').textContent=activeMatch.results.length===1?'Otro acierto seguido le da la victoria.':'La tercera cita decide quién avanza.';$('nextLabel').textContent='Revelar versículo '+(activeMatch.results.length+1)+' de 3';setKeyHint('para continuar este duelo');$('nextBtn').focus({preventScroll:true});announce('Punto para '+player.name+'.');
}
function advanceWinner(playerId){
  const winner=recordWinner(tournament,activeMatch.id,playerId);renderMatch();renderBracket();renderHistory();updateStats();
  if(!getCurrentMatch(tournament)){finishGame(getPodium(tournament)[0].player);return;}
  updateState('match-won');$('stateLabel').textContent=activeMatch.reason==='streak'?'VICTORIA · DOS ACIERTOS SEGUIDOS':activeMatch.reason==='sudden-death'?'VICTORIA EN MUERTE SÚBITA':'DUELO COMPLETADO';
  const bronze=activeMatch.kind==='bronze',champion=activeMatch.kind==='final';
  $('displayEyebrow').textContent=bronze?'TERCER LUGAR CONFIRMADO':champion?'PRIMER LUGAR CONFIRMADO':'UN PASO MÁS CERCA DE LA FINAL';
  displayTitle(winner.name+(bronze?' gana el bronce.':champion?' es campeón.':' avanza.'));
  $('displayCopy').textContent=bronze?'El tercer lugar está decidido. Ahora vamos a la final.':champion?'Falta definir la plata y el bronce. Los otros dos finalistas jugarán un duelo.':'El duelo terminó. Prepárense para el siguiente enfrentamiento.';
  $('nextLabel').textContent='Siguiente duelo';setKeyHint('para ver el próximo duelo');$('nextBtn').focus({preventScroll:true});announce($('displayTitle').textContent);
}
function podiumLabel(place){return place===1?'Primer lugar':place===2?'Segundo lugar':'Tercer lugar';}
function renderPodiumSummary(places){
  $('podiumSummary').hidden=false;$('podiumSummaryList').replaceChildren();
  for(const {place,player} of places){const item=node('li','podium-result');item.dataset.place=place;item.append(node('span','result-rank',String(place)),EsgrimaAvatars.make(player.name,player.avatar,'avatar-small'));const info=node('span','result-person');info.append(node('small','',podiumLabel(place)),node('strong','',player.name));item.append(info);$('podiumSummaryList').append(item);}
}
function finishGame(champion=null){
  updateState('finished');$('matchBanner').hidden=true;$('championAvatar').replaceChildren();$('championAvatar').hidden=true;$('podiumSummary').hidden=true;
  $('stateLabel').textContent=champion?'PODIO COMPLETO':'PARTIDA COMPLETADA';$('roundBadge').textContent=champion?'CLASIFICACIÓN FINAL':'FINALIZADO';$('displayEyebrow').textContent=champion?'LOS LUGARES SE GANARON EN LA ARENA':'TODAS LAS CITAS. TODO EL DESAFÍO.';
  displayTitle(champion?'¡Tenemos podio!':'¡Bien jugado!');$('displayCopy').textContent=champion?'Gracias por jugar. ¡Celebremos a los ganadores!':'Revelaste '+history.length+(history.length===1?' cita sin repetir.':' citas sin repetir.')+' ¿Listos para otra partida?';
  if(champion)renderPodiumSummary(getPodium(tournament));
  $('nextLabel').textContent='Preparar otra partida';setKeyHint('para volver a configurar');updateStats();renderBracket();
  if(champion)showPodium();else{announce('Partida completada.');tone(523.25,.3);tone(659.25,.3,.15);tone(783.99,.5,.3);$('nextBtn').focus({preventScroll:true});}
}
function showPodium(){
  if(!tournament||getCurrentMatch(tournament))return;
  cancelAnimation();updateState('podium');prepareAudio();
  const places=getPodium(tournament),screen=$('podiumScreen'),version=++animationVersion,reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('podiumGrid').replaceChildren();$('podiumGrid').dataset.count=places.length;
  for(const {place,player} of places){
    const card=node('article','podium-card');card.dataset.place=place;card.setAttribute('aria-label',podiumLabel(place)+': '+player.name);
    card.append(node('span','podium-medal',place===1?'♛':place===2?'✦':'✧'),EsgrimaAvatars.make(player.name,player.avatar,'avatar-podium'),node('strong','podium-name',player.name));
    const step=node('div','podium-step');step.append(node('span','podium-place',String(place)),node('span','podium-place-label',podiumLabel(place)));card.append(step);$('podiumGrid').append(card);
  }
  $('podiumNote').textContent=places.length===2?'Participaron dos personas: se entregan el primer y segundo lugar.':'Tres lugares. Un gran desafío compartido.';
  $('podiumCloseBtn').disabled=!reduced;$('podiumCloseBtn').textContent=reduced?'Ver resultados →':'Celebrando a los ganadores…';
  screen.hidden=false;document.body.classList.add('is-celebrating');document.querySelector('.shell').inert=true;screen.tabIndex=-1;screen.focus({preventScroll:true});
  if(!reduced)pendingTimer=setTimeout(()=>{if(version!==animationVersion)return;$('podiumCloseBtn').disabled=false;$('podiumCloseBtn').textContent='Ver resultados →';pendingTimer=null;$('podiumCloseBtn').focus({preventScroll:true});},4200);
  announce('Podio del torneo. '+places.map(({place,player})=>podiumLabel(place)+': '+player.name).join('. ')+'.');
  tone(392,.3);tone(523.25,.35,.8);tone(659.25,.4,1.6);tone(783.99,.6,2.6);tone(1046.5,.8,2.8);
}
function closePodium(){
  if($('podiumCloseBtn').disabled)return;
  clearTimeout(pendingTimer);pendingTimer=null;$('podiumScreen').hidden=true;document.body.classList.remove('is-celebrating');document.querySelector('.shell').inert=false;updateState('finished');$('nextBtn').focus({preventScroll:true});
}
function advance(){
  if(['setup','spinning','match-intro','sudden-intro','podium'].includes(state))return;
  if(state==='finished'){returnToSetup();return;}
  if(state==='revealed'&&mode==='tournament'){toast('Selecciona y confirma el punto antes de continuar.');return;}
  if(state==='match-won'){activeMatch=getCurrentMatch(tournament);runPresentation('match',()=>{showReady();$('nextBtn').focus({preventScroll:true});});return;}
  revealNext();
}
function cancelAnimation(){animationVersion++;clearTimeout(pendingTimer);clearInterval(animationTimer);clearTimeout(introTimer);clearInterval(introTick);pendingTimer=null;animationTimer=null;introTimer=null;introTick=null;introDone=null;$('versusScreen').hidden=true;$('podiumScreen').hidden=true;document.body.classList.remove('is-presenting','is-celebrating');document.querySelector('.shell').inert=false;}
function requestSetup(){if(['spinning','match-intro','sudden-intro','podium'].includes(state))return;if(state==='finished'||history.length===0){returnToSetup();return;}$('resetDialog').showModal();}
function returnToSetup(){
  cancelAnimation();deck=[];history=[];tournament=null;activeMatch=null;selectedWinner=null;state='setup';visitedPlayers=false;$('podiumSummary').hidden=true;$('podiumGrid').replaceChildren();
  $('playView').hidden=true;$('setupView').hidden=false;document.body.dataset.view='setup';document.body.classList.remove('presentation');
  if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  $('navStage').textContent='Configuración';$('backSetupBtn').hidden=true;$('fullscreenBtn').hidden=true;syncProjection();syncMode();setSetupStep('references');validate();$('referencesNextBtn').focus({preventScroll:true});
}
function prepareAudio(){if(!sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function tone(freq,duration,delay=0,volume=.035){if(!sound||!audio)return;try{const osc=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+delay;osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.001,start+duration);osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+duration+.02);}catch{}}
function syncSound(){$('soundBtn').setAttribute('aria-pressed',String(sound));$('soundBtn').setAttribute('aria-label',sound?'Silenciar sonido':'Activar sonido');$('soundBtn').title=sound?'Silenciar sonido':'Activar sonido';}
function syncProjection(){
  const active=document.body.classList.contains('presentation'),label=active?'Salir de pantalla ampliada':'Expandir pantalla';
  $('fullscreenBtn').setAttribute('aria-label',label);$('fullscreenBtn').title=label;$('fullscreenBtn').setAttribute('aria-pressed',String(active));$('fullscreenLabel').textContent=label;
}
async function toggleProjection(){
  const active=document.body.classList.toggle('presentation');syncProjection();window.scrollTo({top:0,behavior:'instant'});
  try{if(!active&&document.fullscreenElement)await document.exitFullscreen();else if(active&&document.body.requestFullscreen)await document.body.requestFullscreen();}catch{/* The focused arena remains usable when native fullscreen is unavailable. */}
  $('fullscreenBtn').focus({preventScroll:true});
}
function syncTheme(){const theme=EsgrimaThemes.getTheme($('themeSelect').value);$('themeDescription').textContent=theme.references.length+' citas · '+theme.description;}
function loadTheme(replace){
  const theme=EsgrimaThemes.getTheme($('themeSelect').value);if(!theme)return;
  const before=parseReferences($('references').value).unique.length,raw=(replace?'':$('references').value+'\n')+theme.references.join('\n'),parsed=parseReferences(raw);
  $('references').value=[...parsed.unique,...parsed.invalid].join('\n');if(replace)$('roundCount').value=parsed.unique.length;syncTheme();validate(true);previewReferenceImport();
  toast(replace?theme.name+': '+parsed.unique.length+' citas cargadas.':Math.max(0,parsed.unique.length-before)+' citas añadidas. Sin duplicados.');
}
function previewReferenceImport(){
  if(!importedReferences)return null;
  const replace=$('importMode').value==='replace',plan=EsgrimaReferences.mergeImport($('references').value,importedReferences,replace);
  $('importPreview').hidden=false;$('importFilename').textContent=importedReferences.filename+' · '+importedReferences.encoding;
  $('importSummary').textContent=plan.added+' cita(s) válida(s) para '+(replace?'reemplazar la lista. ':'añadir. ')+plan.duplicates+' repetida(s) excluida(s). '+plan.invalid.length+' inválida(s) excluida(s). Solo se cargarán las citas válidas.';
  $('applyImportBtn').textContent=replace?'Usar citas válidas':'Agregar citas válidas';$('applyImportBtn').disabled=plan.added===0;
  $('importIssues').replaceChildren();
  const issues=[...plan.issues.map(issue=>issue.reference+' — '+issue.reason),...plan.duplicateEntries.map(ref=>ref+' — repetida o comparte versículos con otra cita de la lista.')];
  issues.slice(0,20).forEach(text=>$('importIssues').append(node('li','',text)));
  if(issues.length>20)$('importIssues').append(node('li','',issues.length-20+' cita(s) excluida(s) más.'));
  $('importDetails').hidden=!issues.length;return plan;
}
function cancelReferenceImport(){referenceReadVersion++;importedReferences=null;$('referencesFile').value='';$('importPreview').hidden=true;$('importError').textContent='';$('chooseReferencesFileBtn').disabled=false;}
$('chooseReferencesFileBtn').addEventListener('click',()=>$('referencesFile').click());
$('referencesFile').addEventListener('change',async()=>{
  const file=$('referencesFile').files[0];if(!file)return;const version=++referenceReadVersion;
  importedReferences=null;$('importPreview').hidden=true;$('importError').textContent='Leyendo y validando el archivo…';$('chooseReferencesFileBtn').disabled=true;
  try{const result=await EsgrimaReferences.readFile(file);if(version!==referenceReadVersion)return;importedReferences=result;$('importError').textContent='';$('importMode').value='add';$('importDetails').open=false;previewReferenceImport();}
  catch(error){if(version===referenceReadVersion)$('importError').textContent=error.message||'No se pudo leer el archivo.';}
  finally{if(version===referenceReadVersion){$('chooseReferencesFileBtn').disabled=false;$('referencesFile').value='';}}
});
$('importMode').addEventListener('change',previewReferenceImport);$('cancelImportBtn').addEventListener('click',cancelReferenceImport);
$('applyImportBtn').addEventListener('click',()=>{const plan=previewReferenceImport();if(!plan||!plan.added)return;$('references').value=plan.text;cancelReferenceImport();validate(true);toast(plan.added+' cita(s) válida(s) cargada(s), sin repeticiones.');$('references').focus({preventScroll:true});});
function runPresentation(kind,done){
  cancelAnimation();updateState(kind==='sudden'?'sudden-intro':'match-intro');prepareAudio();
  const version=++animationVersion,screen=$('versusScreen'),entrants=getMatchPlayers(tournament,activeMatch),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const round=tournament.rounds[activeMatch.round],drawMode=kind==='draw';
  screen.dataset.kind=kind;screen.style.setProperty('--intro-duration',drawMode?(reduced?'5000ms':'6300ms'):'6000ms');screen.dataset.layout=drawMode?'draw':'fighters';screen.dataset.locked='false';screen.hidden=false;screen.scrollTop=0;document.querySelector('.versus-loading').replaceChildren(node('span'));$('playView').hidden=true;document.body.classList.add('is-presenting');document.querySelector('.shell').inert=true;
  $('versusEyebrow').textContent=kind==='sudden'?'EMPATE 1–1–1 · UNA CITA DECIDE':matchTitle(activeMatch).toUpperCase()+(drawMode?' · '+round.length+' DUELOS':' · DUELO '+(activeMatch.sequence+1));
  $('versusTitle').textContent=kind==='sudden'?'MUERTE SÚBITA':drawMode?'ARMANDO TODOS LOS DUELOS':'FRENTE A FRENTE';
  $('versusCaption').textContent=kind==='sudden'?'El próximo punto decide quién avanza.':drawMode?'Todos los participantes. Todos los duelos. Al mismo tiempo.':'Los rivales están definidos. Prepárense para la batalla.';
  const cards=players=>{
    $('versusCards').replaceChildren();$('versusCards').dataset.count=players.length;
    players.forEach((player,i)=>{if(i)$('versusCards').append(node('span','versus-separator','VS'));const card=node('div','versus-fighter');card.style.setProperty('--fighter-index',i);card.append(node('span','fighter-number','JUGADOR '+(i+1)),EsgrimaAvatars.make(player.name,player.avatar,'avatar-fighter'),node('strong','',player.name));$('versusCards').append(card);});
  };
  const draw=shuffle=>{
    const groups=buildRoundDraw(tournament,activeMatch.round,shuffle);$('versusCards').replaceChildren();$('versusCards').dataset.count=groups.length;
    for(const group of groups){const match=tournament.matches.find(item=>item.id===group.matchId),card=node('article','draw-match'+(match.id===activeMatch.id?' draw-first':''));card.dataset.matchId=match.id;card.dataset.size=group.players.length;
      const head=node('div','draw-match-head');head.append(node('span','','DUELO '+(match.sequence+1)),node('span','',group.players.length===3?'TRIPLE':'1 VS 1'));card.append(head);
      const people=node('div','draw-combatants');group.players.forEach((player,i)=>{if(i)people.append(node('span','draw-vs','VS'));const person=node('div','draw-person');person.dataset.playerId=player.id;person.append(EsgrimaAvatars.make(player.name,player.avatar,'avatar-draw'),node('strong','draw-name',player.name));people.append(person);});card.append(people);
      if(match.id===activeMatch.id)card.append(node('span','draw-start-label','PRIMERO EN ENTRAR A LA ARENA'));$('versusCards').append(card);
    }
  };
  if(drawMode)draw(false);else cards(entrants);
  const shuffled=drawMode&&!reduced;
  if(shuffled)introTick=setInterval(()=>{if(version===animationVersion){draw(true);}},140);
  let locked=false;
  const lock=()=>{if(version!==animationVersion)return;locked=true;clearInterval(introTick);introTick=null;screen.dataset.locked='true';if(drawMode)draw(false);else cards(entrants);
    $('versusTitle').textContent=kind==='sudden'?'MUERTE SÚBITA':drawMode?'TODOS LOS DUELOS, LISTOS':'FRENTE A FRENTE';
    $('versusCaption').textContent=kind==='sudden'?'Una cita extra. El primer acierto da la victoria.':drawMode?round.length+' duelos listos. El primero abre la arena.':'Dos aciertos seguidos dan la victoria.';
    $('skipIntroBtn').textContent=drawMode?'Entrar a la arena →':'Saltar presentación →';tone(kind==='sudden'?146.83:392,.28,0,.05);
  };
  $('skipIntroBtn').textContent=drawMode?'Saltar animación →':'Saltar presentación →';
  const finish=()=>{if(version!==animationVersion)return;clearTimeout(introTimer);clearInterval(introTick);introTimer=null;introTick=null;introDone=null;screen.hidden=true;document.body.classList.remove('is-presenting');document.querySelector('.shell').inert=false;$('playView').hidden=false;if(drawMode)runPresentation('match',done);else done();};
  introDone=()=>{if(drawMode&&!locked){clearTimeout(introTimer);lock();if(round.length<=8)introTimer=setTimeout(finish,5000);return;}finish();};
  const afterLock=()=>{if(drawMode&&round.length>8){$('versusCaption').textContent='Revisa todos los duelos y entra cuando estén listos.';return;}introTimer=setTimeout(finish,drawMode?5000:6000);};
  if(shuffled)introTimer=setTimeout(()=>{lock();afterLock();},1300);else{lock();afterLock();}
  screen.tabIndex=-1;screen.focus({preventScroll:true});announce(kind==='sudden'?'Muerte súbita. El siguiente punto decide quién avanza.':drawMode?'Sorteo simultáneo: '+round.length+' duelos en '+matchTitle(activeMatch)+'.':entrants.map(player=>player.name).join(' contra ')+'.');
}
$('skipIntroBtn').addEventListener('click',()=>introDone?.());
$('podiumCloseBtn').addEventListener('click',closePodium);$('replayPodiumBtn').addEventListener('click',showPodium);
$('avatarCategory').addEventListener('change',renderAvatarEditor);
$('randomAvatarBtn').addEventListener('click',()=>{avatarDraft.symbol=EsgrimaAvatars.SYMBOLS[1+Math.floor(Math.random()*(EsgrimaAvatars.SYMBOLS.length-1))].value;avatarDraft.color=EsgrimaAvatars.COLORS[Math.floor(Math.random()*EsgrimaAvatars.COLORS.length)];avatarDraft.photo=null;$('avatarCategory').value='all';renderAvatarEditor();});
$('uploadAvatarBtn').addEventListener('click',()=>$('avatarUpload').click());
$('removeAvatarPhotoBtn').addEventListener('click',()=>{photoVersion++;avatarDraft.photo=null;$('avatarUpload').value='';renderAvatarEditor();});
$('avatarUpload').addEventListener('change',async()=>{
  const file=$('avatarUpload').files[0];if(!file||!avatarDraft)return;const version=++photoVersion;
  $('saveAvatarBtn').disabled=true;$('uploadAvatarBtn').disabled=true;$('avatarError').textContent='Preparando imagen…';
  try{const photo=await EsgrimaAvatars.readPhoto(file,avatarDraft.color);if(version!==photoVersion)return;avatarDraft.photo=photo;$('avatarError').textContent='';renderAvatarEditor();}
  catch(error){if(version===photoVersion)$('avatarError').textContent=error.message;}
  finally{if(version===photoVersion){$('saveAvatarBtn').disabled=false;$('uploadAvatarBtn').disabled=false;}}
});
$('saveAvatarBtn').addEventListener('click',()=>{if(editingAvatarIndex===null||!avatarDraft)return;avatarRecords[editingAvatarIndex].avatar=EsgrimaAvatars.sanitize(avatarDraft,editingAvatarIndex);renderAvatarRoster();save();$('avatarDialog').close();});
$('avatarDialog').addEventListener('close',()=>{photoVersion++;editingAvatarIndex=null;avatarDraft=null;});
$('classicMode').addEventListener('click',()=>selectMode('classic'));$('tournamentMode').addEventListener('click',()=>selectMode('tournament'));
$('referencesNextBtn').addEventListener('click',continueSetup);$('backToReferencesBtn').addEventListener('click',()=>setSetupStep('references'));$('fixReferencesBtn').addEventListener('click',()=>setSetupStep('references'));$('prepareBtn').addEventListener('click',beginSession);$('nextBtn').addEventListener('click',advance);$('confirmWinnerBtn').addEventListener('click',confirmWinner);
$('references').addEventListener('input',()=>{validate(true);previewReferenceImport();});$('roundCount').addEventListener('input',()=>validate());$('duration').addEventListener('change',save);
$('participants').addEventListener('input',()=>{$('participantCount').value=parsePlayers($('participants').value).names.length;reconcileAvatars();renderAvatarRoster();validate();});$('participantCount').addEventListener('input',()=>validate());
$('generatePlayersBtn').addEventListener('click',()=>{const count=Number($('participantCount').value);if(!Number.isInteger(count)||count<2||count>128){$('playersValidation').textContent='Elige una cantidad entre 2 y 128 personas.';$('playersValidation').classList.add('error');return;}
  const old=parsePlayers($('participants').value).names;$('participants').value=Array.from({length:count},(_,i)=>old[i]||'Participante '+(i+1)).join('\n');reconcileAvatars();renderAvatarRoster();validate();
});
$('themeSelect').addEventListener('change',()=>{syncTheme();save();});$('addThemeBtn').addEventListener('click',()=>loadTheme(false));$('replaceThemeBtn').addEventListener('click',()=>loadTheme(true));$('exampleBtn').addEventListener('click',()=>{$('themeSelect').value='todos';loadTheme(true);});$('clearBtn').addEventListener('click',()=>{$('references').value='';$('roundCount').value='';validate();previewReferenceImport();$('references').focus();});
$('backSetupBtn').addEventListener('click',requestSetup);$('resetBtn').addEventListener('click',requestSetup);$('confirmReset').addEventListener('click',()=>{$('resetDialog').close();returnToSetup();});
$('soundBtn').addEventListener('click',()=>{sound=!sound;syncSound();prepareAudio();tone(660,.15);save();});
$('fullscreenBtn').addEventListener('click',toggleProjection);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('presentation');syncProjection();});
$('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());$('historyBtn').addEventListener('click',()=>{renderHistory();$('historyDialog').showModal();});
$('bracketJumpBtn').addEventListener('click',()=>$('bracketSection').scrollIntoView({behavior:'smooth',block:'start'}));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}}));
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();window.scrollTo({top:0,behavior:'smooth'});});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.body.classList.contains('presentation')&&!document.fullscreenElement&&!document.querySelector('dialog[open]')){document.body.classList.remove('presentation');syncProjection();$('fullscreenBtn').focus({preventScroll:true});return;}
  if(event.key!=='Enter'||event.isComposing||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey)return;
  if(event.repeat){if(!(event.target instanceof Element&&event.target.closest('input,textarea,[contenteditable="true"]')))event.preventDefault();return;}
  if(['setup','match-intro','sudden-intro','podium'].includes(state)||document.querySelector('dialog[open]'))return;
  if(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable="true"],button,a'))return;
  event.preventDefault();advance();
});
if(document.fonts?.load){document.fonts.load('40px BezraelSyriac','ܡܬܝ').catch(()=>{});document.fonts.load('40px BezraelAncient','Κατὰ Μαθθαῖον תהילים').catch(()=>{});}
syncTheme();syncSound();syncProjection();syncMode();setSetupStep('references');validate();renderHistory();
