/* Avatar data stays local. Photos are decoded and reduced before use. */
(function(root){
  'use strict';
  const COLORS=['#c7f779','#7dd9c2','#8bbcf4','#dca5ef','#efb778','#ed939b','#b8b9f3','#ded29a','#82d8e7','#a8d59b','#f5d17e','#cbb9a8','#a0c3ef','#f3bfa7','#b4e6d4','#e8caec'];
  const COLOR_NAMES=['Lima','Menta','Azul','Lavanda','Naranja','Coral','Índigo','Arena','Turquesa','Salvia','Dorado','Piedra','Cielo','Durazno','Jade','Lila'];
  const SYMBOLS=[{value:'initials',label:'Iniciales',group:'Identidad'},
    ...[['🦁','León'],['🦅','Águila'],['🐺','Lobo'],['🦊','Zorro'],['🐻','Oso'],['🦉','Búho'],['🐯','Tigre'],['🐼','Panda'],['🐨','Koala'],['🐸','Rana'],['🐬','Delfín'],['🐢','Tortuga']].map(([value,label])=>({value,label,group:'Animales'})),
    ...[['🌵','Cactus'],['🌲','Pino'],['🌻','Girasol'],['🍀','Trébol'],['🌊','Ola'],['🔥','Fuego'],['⚡','Rayo'],['🌙','Luna'],['☀️','Sol'],['🪐','Planeta'],['🌈','Arcoíris'],['🏔️','Montaña']].map(([value,label])=>({value,label,group:'Naturaleza'})),
    ...[['⚔','Espadas'],['✦','Estrella'],['🛡️','Escudo'],['👑','Corona'],['💎','Diamante'],['⚓','Ancla'],['🧭','Brújula'],['🎯','Diana'],['🚀','Cohete'],['🎸','Guitarra'],['📖','Libro'],['🏆','Trofeo']].map(([value,label])=>({value,label,group:'Emblemas'})),
    ...[['😎','Gafas de sol'],['🤠','Vaquero'],['🥷','Ninja'],['🧑‍🚀','Astronauta'],['🦸','Superhéroe'],['🧙','Mago'],['🤖','Robot'],['👽','Extraterrestre'],['🧑‍🎨','Artista'],['🧑‍🚒','Bombero'],['🕵️','Detective'],['🧑‍🍳','Chef']].map(([value,label])=>({value,label,group:'Personajes'}))];
  function sanitize(value,index=0){
    return {symbol:SYMBOLS.some(item=>item.value===value?.symbol)?value.symbol:'initials',color:COLORS.includes(value?.color)?value.color:COLORS[index%COLORS.length],photo:typeof value?.photo==='string'&&value.photo.length<=100000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value.photo)?value.photo:null};
  }
  function make(name,value,className=''){
    const avatar=sanitize(value),element=document.createElement('span');element.className='avatar-badge '+className;element.style.backgroundColor=avatar.color;element.setAttribute('role','img');element.setAttribute('aria-label','Avatar de '+name);
    if(avatar.photo){const image=document.createElement('img');image.src=avatar.photo;image.alt='';element.append(image);}
    else element.textContent=avatar.symbol==='initials'?name.trim().split(/\s+/).slice(0,2).map(part=>part.charAt(0)).join('').toUpperCase()||'?':avatar.symbol;
    return element;
  }
  async function readPhoto(file,color){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Selecciona una imagen PNG, JPG o WebP.');
    if(file.size>5*1024*1024)throw new Error('La imagen debe pesar como máximo 5 MB.');
    const url=URL.createObjectURL(file);
    try{
      const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('No se pudo leer la imagen. Prueba con otra foto.'));image.src=url;});
      if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>25000000)throw new Error('Elige una imagen de menos de 25 megapíxeles.');
      const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;const context=canvas.getContext('2d');
      context.fillStyle=COLORS.includes(color)?color:COLORS[0];context.fillRect(0,0,192,192);
      const size=Math.min(image.naturalWidth,image.naturalHeight);context.drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,192,192);
      return canvas.toDataURL('image/jpeg',.82);
    }finally{URL.revokeObjectURL(url);}
  }
  root.EsgrimaAvatars={COLORS,COLOR_NAMES,SYMBOLS,sanitize,make,readPhoto};
  if(typeof module!=='undefined')module.exports=root.EsgrimaAvatars;
})(typeof globalThis!=='undefined'?globalThis:window);
