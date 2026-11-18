/* Thematic reference collections. The game supplies references, never paraphrased Bible text. */
(function(root){
  'use strict';
  const themes={
    amor:{name:'Amor',description:'El amor de Dios y el amor al prójimo.',references:['Juan 3:16','1 Juan 4:7','1 Juan 4:8','1 Juan 4:9','1 Juan 4:10','1 Juan 4:11','1 Juan 4:12','1 Juan 4:16','1 Juan 4:18','1 Juan 4:19','Juan 13:34','Juan 13:35','Juan 15:9','Juan 15:12','Juan 15:13','Romanos 5:8','Romanos 8:38-39','Romanos 12:9','Romanos 12:10','Romanos 13:8','Romanos 13:10','1 Corintios 13:1','1 Corintios 13:2','1 Corintios 13:3','1 Corintios 13:4','1 Corintios 13:5','1 Corintios 13:6','1 Corintios 13:7','1 Corintios 13:8','1 Corintios 13:13']},
    perdon:{name:'Perdón',description:'Recibir el perdón de Dios y aprender a perdonar.',references:['Mateo 6:12','Mateo 6:14','Mateo 6:15','Mateo 18:21','Mateo 18:22','Mateo 18:27','Mateo 18:33','Marcos 11:25','Lucas 6:37','Lucas 7:47','Lucas 7:48','Lucas 11:4','Lucas 17:3','Lucas 17:4','Lucas 23:34','Efesios 1:7','Efesios 4:32','Colosenses 3:13','1 Juan 1:9','1 Juan 2:1','1 Juan 2:2','Salmos 32:1','Salmos 32:5','Salmos 86:5','Salmos 103:3','Salmos 103:12','Isaías 43:25','Isaías 55:7','Miqueas 7:18','Miqueas 7:19']},
    salvacion:{name:'Salvación',description:'La gracia, la fe y la vida nueva en Cristo.',references:['Juan 1:12','Juan 3:15','Juan 3:16','Juan 3:17','Juan 3:18','Juan 3:36','Juan 5:24','Juan 6:40','Juan 10:9','Juan 14:6','Hechos 2:21','Hechos 2:38','Hechos 4:12','Hechos 16:30','Hechos 16:31','Romanos 1:16','Romanos 3:23','Romanos 3:24','Romanos 5:1','Romanos 5:8','Romanos 6:23','Romanos 10:9','Romanos 10:10','Romanos 10:13','Efesios 2:8','Efesios 2:9','Tito 3:5','1 Timoteo 2:4','Hebreos 7:25','1 Pedro 1:3']}
  };
  function getTheme(key){
    if(key==='todos')return {name:'Todos los temas',description:'Amor, perdón y salvación en una sola lista.',references:[...new Set(Object.values(themes).flatMap(theme=>theme.references))]};
    return Object.hasOwn(themes,key)?themes[key]:null;
  }
  root.EsgrimaThemes={themes,getTheme};
  if(typeof module!=='undefined')module.exports=root.EsgrimaThemes;
})(typeof globalThis!=='undefined'?globalThis:window);
