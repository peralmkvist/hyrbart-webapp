export type CategoryNode={
  name:string;
  hyggloId?:number;
  children?:readonly CategoryNode[];
};

const leaf=(name:string,hyggloId?:number):CategoryNode=>({name,hyggloId});
const branch=(name:string,hyggloId:number|undefined,children:readonly CategoryNode[]):CategoryNode=>({name,hyggloId,children});

export const CATEGORY_TAXONOMY:readonly CategoryNode[]=[
  branch('Bygg & verktyg',17,[
    branch('Anläggningsmaskiner',8739,['Anläggningsraka','Betong & armering','Jordborr','Markvibrator','Stenklipp','Övrigt inom anläggningsmaskiner'].map(name=>leaf(name))),
    leaf('Arbetsbelysning',182),
    branch('Borrmaskiner och skruvdragare',171,['Bergborr','Bitssats','Borrar','Borrhammare','Borrmaskin','Hålsåg','Mejselhammare / Bilmaskin','Mutterdragare','Pelarborr','Skruvdragare','Slagborrmaskin','Spräckkilar','Vinkelborr','Övrigt inom borrmaskiner och skruvdragare'].map(name=>leaf(name))),
    branch('Byggmaskiner',8737,['Dumper','Grävmaskin','Lastare','Minidumper','Skylift','Traktor','Övrigt inom byggmaskiner'].map(name=>leaf(name))),
    branch('Elmaterial & energi',8738,['Batterier & batteriladdare','Dragfjäder','Elcentral','Elverk','Elvinda och elkabel','Kabelskalare'].map(name=>leaf(name))),
    branch('Fräsa & hyvla',175,['Fräs','Fräsbord','Handhyvel','Planhyvel','Svarv','Övrigt inom fräs & hyvla'].map(name=>leaf(name))),
    branch('Golvläggning & plattsättning',8956,['Golvslip','Kakelskärare','Laminatskärare','Mattstripper','Paket för golvläggning','Paket för plattsättning','Trallverktyg','Övrigt inom golvläggning och plattsättning'].map(name=>leaf(name))),
    branch('Handverktyg',178,['Avdragare','Fogpistol','Gångjärnsriktare','Hammare','Hylsnycklar','Kofot','Limpistol','Lödkolv','Momentnyckel','Skiftnyckel','Skruvstäd','Slagskruvmejsel','Slägga','Tvingar','Tänger','Verktygslåda','Övrigt inom handverktyg'].map(name=>leaf(name))),
    leaf('Hole in one / Dossökare',8676),
    branch('Mätinstrument',173,['Decibelmätare','Energimätare','Fuktmätare','IR-termometer','Kabelsökare','Krysslaser','Laseravståndsmätare','Ljusmätare','Luftflödesmätare','Luftkvalitetsmätare','Metalldetektor','Multimeter','Måttband','Oscilloskop','Radonmätare','Regelsökare','Rotationslaser','Totalstation','Vattenpass','Vinkelmätare','Värmekamera','Våg','Övrigt inom mätinstrument'].map(name=>leaf(name))),
    branch('Målning och tapet',176,['Färgborttagare','Färgkarta NCS','Färgscanner','Färgspruta','Målarbockar','Omrörare','Putsspruta','Rollbox','Tapetbord','Tapetborttagare','Övrigt inom måla'].map(name=>leaf(name))),
    leaf('Skyddsutrustning',8546),
    branch('Slipning och polering',174,['Bandslip','Bänkslip','Excenterslip','Fingerslip','Giraffslip','Golvslip','Gravyrmaskin','Planslip','Polermaskin','Slipmus','Varmluftspistol','Vinkelslip','Övriga slipmaskiner','Övrigt inom slipa'].map(name=>leaf(name))),
    branch('Spik- och häftpistoler',9503,['Häftpistol','Spikpistol'].map(name=>leaf(name))),
    branch('Ställningar',179,['Arbetsbänk','Byggstaket','Byggställning','Fodervagn','Fönsterparaply','Gipsvagn','Målarbockar','Skivhiss','Stämp och Monteringsstöd','Tapetbord','Övrigt inom ställningar'].map(name=>leaf(name))),
    branch('Svets',177,['Elsvets','Gassvets','MIG-svets','Plastsvets','Svetshjälm','Övrigt inom svets'].map(name=>leaf(name))),
    branch('Såga & kapa',172,['Alligatorsåg','Bandsåg','Bordssåg','Bultsax','Cirkelsåg','Gersåg manuell','Handsåg','Kakelskärare','Kap- & gersåg','Kombisåg','Metallkapsåg','Mobilt sågverk','Motorkap','Multiverktyg','Plasmabrännare','Plåtsax','Pressmaskin','Sticksåg','Sågskena','Tigersåg','Övrigt inom sågar & kapa'].map(name=>leaf(name))),
    branch('Transport & lyft',8749,['Glaslyft','Handtruck','Pirra','Plattformsvagn','Truck','Vinsch','Övrigt inom transport & lyft'].map(name=>leaf(name))),
    branch('Tryckluft',8743,['Bläster','Kompressor','Tryckluftslang','Övrigt inom tryckluft'].map(name=>leaf(name))),
    branch('VVS-verktyg',9046,['Expansionsverktyg','Pressmaskin','Provtryckningspump','Rörböjare','Rörkap','Rörtång','Sanipexverktyg','Övrigt inom VVS-verktyg'].map(name=>leaf(name))),
    branch('Ventilation',181,['Air conditioning','Avfuktare','Fläkt','Luftflödesmätare','Luftfuktare','Luftrenare','Ozongenerator','Ventilationsrensare','Värmefläkt','Värmelement','Övrigt inom ventilation'].map(name=>leaf(name))),
    leaf('Verktygspaket',8601),
    leaf('Övrigt inom bygg & verktyg',183),
  ]),
  branch('Elektronik',29,[
    branch('Datorer & tillbehör',291,['4G-router / mobilt bredband','Bärbara datorer','Datortillbehör','Nätverksutrustning','Ritplatta','Skärmar','Stationär dator','Övrigt inom datorer'].map(name=>leaf(name))),
    leaf('Drönare',297),leaf('FM-radio',9349),leaf('Inverter',9397),leaf('Komradio',8499),leaf('Kontorsmaskiner',294),leaf('Kortterminal',8987),leaf('Ljud',296),leaf('Mobil & surfplatta',298),leaf('Projektor & TV',293),leaf('Satellitinstrument',9138),leaf('Smart högtalare',9521),leaf('TV-spel',295),leaf('Övrigt inom elektronik',299),
  ]),
  branch('Fest',33,[
    branch('Festaktiviteter',8411,['Badtunna','Bastu','Beer pong','Bubbelbad','Chokladfontän','Glass- och slushmaskin','Hoppborg','Karaoke','Photo booth & tillbehör','Popcornvagn','Sockervaddsmaskin','Toastmasterutrustning','Vattenpipa','Övrigt inom festaktiviteter'].map(name=>leaf(name))),
    branch('Festdekoration',8640,['Ballongpump','Discokula','Eldkorg','Kandelabrar och ljusstakar','Röd matta','Styling & inredning','Övrigt inom festdekoration'].map(name=>leaf(name))),
    leaf('Festkök',8655),leaf('Festmöbler',8641),leaf('Festpaket',9401),leaf('Kläder',335),leaf('Ljud, ljus & scen',331),leaf('Partytält',334),leaf('Terrassvärmare',8639),leaf('Övrigt inom fest',338),
  ]),
  branch('Film & foto',292,[
    branch('Blixtar och ljus',2925,['Blixttrigger','Kamerablixt','Reflexskärm','Ringlampa','Softbox & paraply','Speed Booster','Studioblixt','Studiolampa','Övrigt inom Blixtar och ljus'].map(name=>leaf(name))),
    leaf('Follow focus & objektivstöd',9460),leaf('Fotobakgrund',8502),leaf('Fotoskrivare',9035),leaf('Färgkalibrator',8733),leaf('Kamera',9452),leaf('Kamerabatteri',9034),leaf('Kamerapaket',9458),leaf('Kameraväska',9007),leaf('Minneskort',9033),leaf('Monitor',9030),leaf('Objektiv',2926),leaf('Stativ & riggar',8416),leaf('Streaming',9245),leaf('Teleprompter',8696),leaf('Undervattenshus till kamera',9417),leaf('Övrigt inom film & foto',2927),
  ]),
  branch('Fordon',24,[
    leaf('ATV/Fyrhjuling'),leaf('Bilar'),leaf('Biltillbehör'),leaf('Båt'),leaf('Campingfordon'),leaf('Hästtransport'),leaf('Lätt lastbil'),leaf('MC & tillbehör'),leaf('Moped'),leaf('Skåpbil'),leaf('Släpvagnar'),leaf('Snöskoter'),leaf('Tung lastbil'),leaf('Verkstad'),leaf('Övriga fordon'),leaf('Övrigt inom fordon'),
  ]),
  branch('Hem & hushåll',453,[leaf('Barnsaker'),leaf('Flytt'),leaf('Husdjur'),leaf('Kök'),leaf('Personvård'),leaf('Styling & inredning'),leaf('Symaskin'),leaf('Tvätt och städning'),leaf('Övrigt inom Hem')]),
  branch('Sport & fritid',39,[leaf('Cykling'),leaf('Friluftsliv'),leaf('Hjälpmedel'),leaf('Lek & hobby'),leaf('Musikinstrument'),leaf('Resa'),leaf('Sport'),leaf('Träning & gym'),leaf('Vattensport'),leaf('Vintersport'),leaf('Övrigt inom sport och fritid')]),
  branch('Trädgård',22,[leaf('Gräsmattevård'),leaf('Stege'),leaf('Trädgårdsmaskiner'),leaf('Trädgårdsmöbler'),leaf('Trädgårdsredskap'),leaf('Övrigt inom trädgård')]),
  branch('Övrigt',45,[leaf('Lokaler')]),
] as const;

export function slugifyCategory(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'-och-').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}

export function categoryPathValue(path:readonly string[]){return path.map(slugifyCategory).join('/')}

export function leafCategories(){
  const result:{name:string;path:string[];value:string;hyggloId?:number}[]=[];
  const walk=(nodes:readonly CategoryNode[],parents:string[])=>nodes.forEach(node=>{
    const path=[...parents,node.name];
    if(node.children?.length)walk(node.children,path);else result.push({name:node.name,path,value:categoryPathValue(path),hyggloId:node.hyggloId});
  });
  walk(CATEGORY_TAXONOMY,[]);
  return result;
}
