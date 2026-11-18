"""Build reference bounds only, not verse text, from the public-domain RV1909 USX source."""
from pathlib import Path
import concurrent.futures, hashlib, json, re, urllib.request, xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
NAMES = [
('GEN','Génesis','Gn Ge Gen'),('EXO','Éxodo','Ex Exo'),('LEV','Levítico','Lv Lev Le'),('NUM','Números','Nm Num Nu'),('DEU','Deuteronomio','Dt Deut Deu'),('JOS','Josué','Jos'),('JDG','Jueces','Jue Jc'),('RUT','Rut','Rt Ru'),
('1SA','1 Samuel','1S 1Sa 1Sam 1Sm'),('2SA','2 Samuel','2S 2Sa 2Sam 2Sm'),('1KI','1 Reyes','1R 1Re 1Rey'),('2KI','2 Reyes','2R 2Re 2Rey'),('1CH','1 Crónicas','1Cr 1Cron'),('2CH','2 Crónicas','2Cr 2Cron'),('EZR','Esdras','Esd Ezr'),('NEH','Nehemías','Neh Ne'),('EST','Ester','Est Et'),('JOB','Job','Job'),('PSA','Salmos','Sal Salmo Sl Ps'),('PRO','Proverbios','Pr Prov Pro'),('ECC','Eclesiastés','Ec Ecl Ecc'),('SNG','Cantares','Cnt Cant Cantares'),('ISA','Isaías','Is Isa'),('JER','Jeremías','Jer Jr'),('LAM','Lamentaciones','Lm Lam'),('EZK','Ezequiel','Ez Eze Ezq'),('DAN','Daniel','Dn Dan'),('HOS','Oseas','Os Ose'),('JOL','Joel','Jl Joe'),('AMO','Amós','Am Amo'),('OBA','Abdías','Abd Ab'),('JON','Jonás','Jon'),('MIC','Miqueas','Mi Miq'),('NAM','Nahúm','Nah Na'),('HAB','Habacuc','Hab Ha'),('ZEP','Sofonías','Sof So'),('HAG','Hageo','Hag Hg'),('ZEC','Zacarías','Zac Za'),('MAL','Malaquías','Mal Ml'),
('MAT','Mateo','Mt Mat'),('MRK','Marcos','Mc Mr Mar'),('LUK','Lucas','Lc Luc Lc'),('JHN','Juan','Jn Jua'),('ACT','Hechos','Hch Hec Hechos'),('ROM','Romanos','Ro Rm Rom'),('1CO','1 Corintios','1Co 1Cor'),('2CO','2 Corintios','2Co 2Cor'),('GAL','Gálatas','Ga Gal Gl'),('EPH','Efesios','Ef Efe'),('PHP','Filipenses','Flp Fil Filip'),('COL','Colosenses','Col Cl'),('1TH','1 Tesalonicenses','1Ts 1Tes'),('2TH','2 Tesalonicenses','2Ts 2Tes'),('1TI','1 Timoteo','1Ti 1Tim 1Tm'),('2TI','2 Timoteo','2Ti 2Tim 2Tm'),('TIT','Tito','Tit Tt'),('PHM','Filemón','Flm Fm Filem'),('HEB','Hebreos','Heb He Hb'),('JAS','Santiago','Stg Sant St'),('1PE','1 Pedro','1P 1Pe 1Ped'),('2PE','2 Pedro','2P 2Pe 2Ped'),('1JN','1 Juan','1Jn 1J 1Jua'),('2JN','2 Juan','2Jn 2J 2Jua'),('3JN','3 Juan','3Jn 3J 3Jua'),('JUD','Judas','Jud Jd'),('REV','Apocalipsis','Ap Apo Apoc')]
EXTRA = {'SNG':['Cantar de los Cantares','Cantar de Salomón'], 'REV':['Revelación','Revelaciones']}
def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Bezrael-Esgrima'}),timeout=45).read()
def parse(entry):
    path=entry['path'];data=fetch('https://raw.githubusercontent.com/BibleAquifer/ReinaValera1909/main/'+path)
    assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==entry['sha'], path
    doc=ET.fromstring(data);code=doc.find('book').get('code');chapters={};chapter=None
    for el in doc.iter():
        if el.tag=='chapter' and el.get('number'):
            chapter=int(el.get('number'));chapters.setdefault(chapter,set())
        if el.tag=='verse' and el.get('number'):
            m=re.fullmatch(r'(\d+)(?:-(\d+))?',el.get('number'));assert m,(path,el.attrib)
            start=int(m[1]);end=int(m[2] or start);chapters[chapter].update(range(start,end+1))
    assert sorted(chapters)==list(range(1,len(chapters)+1)),code
    for c,verses in chapters.items():assert verses==set(range(1,max(verses)+1)),(code,c,verses)
    return code,[max(chapters[c]) for c in sorted(chapters)]
def main():
    tree=json.loads(fetch('https://api.github.com/repos/BibleAquifer/ReinaValera1909/git/trees/main?recursive=1'))
    files=[el for el in tree['tree'] if el['path'].endswith('.usx')];assert len(files)==66
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:counts=dict(pool.map(parse,files))
    books=[{'code':code,'name':name,'aliases':list(dict.fromkeys(aliases.split()+EXTRA.get(code,[]))),'chapters':counts[code]} for code,name,aliases in NAMES]
    assert len(books)==66 and sum(len(b['chapters']) for b in books)==1189
    catalog={'edition':'Reina-Valera 1909 · 66 libros','source':'https://github.com/BibleAquifer/ReinaValera1909','sourceTree':tree['sha'],'books':books}
    output='/* Chapter/verse bounds derived from public-domain RV1909 USX. No verse text. */\n(function(root){\n  const catalog='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n  root.EsgrimaBible=catalog;\n  if(typeof module!==\'undefined\')module.exports=catalog;\n})(typeof globalThis!==\'undefined\'?globalThis:window);\n'
    (ROOT/'bible-catalog.js').write_text(output)
    print('PASS: 66 books, 1189 chapters, '+str(sum(sum(b['chapters']) for b in books))+' verses; source blob hashes verified.')
if __name__=='__main__':main()
