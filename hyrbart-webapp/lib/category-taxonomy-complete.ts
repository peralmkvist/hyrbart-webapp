import { CATEGORY_TAXONOMY as BASE_TAXONOMY, type CategoryNode } from './category-taxonomy';

const leaf=(name:string,hyggloId?:number):CategoryNode=>({name,hyggloId});
const branch=(name:string,hyggloId:number|undefined,children:readonly CategoryNode[]):CategoryNode=>({name,hyggloId,children});

// Deep category branches verified against Hygglo's public Swedish category pages on 2026-09-13.
// Keys are full category paths, which avoids collisions for repeated names such as "Ljud".
const DEEP_CHILDREN:Record<string,readonly CategoryNode[]>={
  'Elektronik > Ljud > DJ-utrustning':[
    leaf('DJ-paket'),leaf('DJ-ställ'),leaf('Kontroller'),leaf('Mixing desk'),leaf('Vinylspelare och andra musikspelare'),leaf('Övrigt inom DJ-utrustning')
  ],
  'Fordon > Båt > Båttillbehör':[
    leaf('Batterier & batteriladdare'),leaf('Båtmotor'),leaf('Flytväst'),leaf('VHF'),leaf('Övriga båttillbehör')
  ],
  'Fordon > Verkstad > Bilverktyg':[
    leaf('Bromsluftare'),leaf('Bromsverktyg'),leaf('Fjäderspännare'),leaf('Hjullagerverktyg'),leaf('Kompressionsprovare'),leaf('Övrigt inom bilverktyg')
  ],
  'Hem & hushåll > Barnsaker > Barncyklar & tillbehör':[
    leaf('Barncykel'),leaf('Cykelstol'),leaf('Sparkcykel'),leaf('Trehjuling')
  ],
  'Hem & hushåll > Barnsaker > Barnvagnar & tillbehör':[
    leaf('Barnvagn'),leaf('Cykelvagn'),leaf('Joggingvagn'),leaf('Resevagn'),leaf('Skidset till multivagn'),leaf('Tillbehör till barnvagn'),leaf('Transportväska för barnvagn')
  ],
  'Hem & hushåll > Barnsaker > Resa med barn':[
    leaf('Bedbox'),leaf('Flygplansvagga'),leaf('Resesäng'),leaf('Resevagn'),leaf('Solskyddstält'),leaf('Transportväska för barnvagn'),leaf('Övrigt inom resa med barn')
  ],
  'Hem & hushåll > Kök > Husgeråd och köksmaskiner':[
    leaf('Bakmaskin'),leaf('Fondueset'),leaf('Fritös & Airfryer'),leaf('Fruktpress och fruktkross'),leaf('Hushållsmixer'),leaf('Induktionshäll'),leaf('Kaffebryggare och espressomaskin'),leaf('Köksbrännare'),leaf('Köttkvarn'),leaf('Mackjärn'),leaf('Pastamaskin'),leaf('Raclettegrill'),leaf('Råsaftcentrifug'),leaf('Slowcooker'),leaf('Sodastreamer'),leaf('Vakuumförpackare'),leaf('Våffeljärn'),leaf('Övrigt inom husgeråd och köksmaskiner')
  ],
  'Hem & hushåll > Tvätt och städning > Dammsugare':[
    leaf('Golvdammsugare'),leaf('Grovdammsugare / byggdammsugare'),leaf('Handdammsugare'),leaf('Robotdammsugare'),leaf('Stoftavskiljare'),leaf('Våtdammsugare'),leaf('Övrigt inom dammsugare')
  ],
  'Sport & fritid > Cykling > Cyklar':[
    leaf('BMX'),leaf('Elcykel'),leaf('Enhjuling'),leaf('Ihopfällbar cykel'),leaf('Lådcykel'),leaf('Mountainbike'),leaf('Racer'),leaf('Tandem'),leaf('Vanlig cykel'),leaf('Övriga cyklar')
  ],
  'Sport & fritid > Friluftsliv > Camping':[
    branch('Campingkök',3927,[]),leaf('Campingmöbler'),branch('Campingtält',3921,[]),leaf('Campingvagn'),leaf('Fjällduk'),leaf('Liggunderlag'),leaf('Sovsäck'),leaf('Övrigt inom camping')
  ],
  'Sport & fritid > Friluftsliv > Camping > Campingkök':[
    leaf('Optimus'),leaf('Primuskök'),leaf('Tillbehör till campingkök'),leaf('Trangiakök'),leaf('Övriga campingkök')
  ],
  'Sport & fritid > Friluftsliv > Camping > Campingtält':[
    leaf('Enmannatält'),leaf('Tvåmannatält'),leaf('Tremannatält'),leaf('Fyrmannatält'),leaf('Femmannatält'),leaf('Sexmannatält'),leaf('Stora tält'),leaf('Hängmattetält'),leaf('Taktält'),leaf('Tarp'),leaf('Tältkåta'),leaf('Tältlampa'),leaf('Tältpinnar för snö/sand'),leaf('Vindsäck'),leaf('Övrigt inom campingtält')
  ],
  'Sport & fritid > Friluftsliv > Jakt & fiske':[
    leaf('Bulvaner'),leaf('Fiskespö'),leaf('Fällor'),leaf('GPS-pejl'),leaf('Isborr'),leaf('Jaktkläder'),leaf('Komradio'),leaf('Sonar ekolod'),leaf('Vadarställ'),leaf('Åtelkamera'),leaf('Övrigt inom fiske'),leaf('Övrigt inom jakt')
  ],
  'Sport & fritid > Sport > Golf':[
    leaf('Golf resefodral'),leaf('Golfbag'),leaf('Golfradar'),leaf('Golfset'),leaf('Golftält'),leaf('Golfvagn'),leaf('Övrigt inom golf')
  ],
  'Sport & fritid > Sport > Klättring':[
    leaf('Crashpad'),leaf('Klätterhjälm'),leaf('Klättersele'),leaf('Klätterskor'),leaf('Övrigt inom klättring')
  ],
  'Sport & fritid > Sport > Racketsport':[
    leaf('Badminton'),leaf('Bordtennis'),leaf('Padeltennis'),leaf('Squash'),leaf('Strängningsmaskin'),leaf('Tennis'),leaf('Övrigt inom racketsport')
  ],
  'Sport & fritid > Sport > Ridsport':[
    leaf('Hästtransport'),leaf('Hästvagn'),leaf('Klippmaskin för häst'),leaf('Övrigt inom ridsport')
  ],
  'Sport & fritid > Vintersport > Skidor & snowboard':[
    leaf('Alpinskidor'),leaf('Längdskidor'),leaf('Pjäxor'),leaf('Skarjärn'),leaf('Skidfodral & skidväska'),leaf('Skidsele'),leaf('Snowblades'),leaf('Snowboard'),leaf('Snowboard- och skidhållare'),leaf('Splitboard'),leaf('Stavar'),leaf('Stighudar'),leaf('Telemark'),leaf('Vallautrustning'),leaf('Övrigt inom skidor & snowboard')
  ]
};

const IDS:Record<string,number>={
  'Elektronik > Ljud > DJ-utrustning':8662,
  'Fordon > Båt > Båttillbehör':256,
  'Fordon > Verkstad > Bilverktyg':2424,
  'Hem & hushåll > Barnsaker > Barncyklar & tillbehör':463,
  'Hem & hushåll > Barnsaker > Barnvagnar & tillbehör':461,
  'Hem & hushåll > Barnsaker > Resa med barn':8855,
  'Hem & hushåll > Kök > Husgeråd och köksmaskiner':3333,
  'Hem & hushåll > Tvätt och städning > Dammsugare':8735,
  'Sport & fritid > Cykling > Cyklar':8936,
  'Sport & fritid > Friluftsliv > Camping':8949,
  'Sport & fritid > Friluftsliv > Jakt & fiske':8865,
  'Sport & fritid > Sport > Golf':3973,
  'Sport & fritid > Sport > Klättring':3974,
  'Sport & fritid > Sport > Racketsport':8431,
  'Sport & fritid > Sport > Ridsport':8444,
  'Sport & fritid > Vintersport > Skidor & snowboard':4653
};

function expand(nodes:readonly CategoryNode[],parents:string[]=[]):readonly CategoryNode[]{
  return nodes.map(node=>{
    const path=[...parents,node.name];
    const key=path.join(' > ');
    const explicit=DEEP_CHILDREN[key];
    const children=explicit ?? node.children;
    return {
      ...node,
      hyggloId: IDS[key] ?? node.hyggloId,
      ...(children?.length ? {children:expand(children,path)} : {})
    };
  });
}

export const CATEGORY_TAXONOMY=expand(BASE_TAXONOMY);

export function slugifyCategory(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'-och-').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
export function categoryPathValue(path:readonly string[]){return path.map(slugifyCategory).join('/')}
export function leafCategories(){const result:{name:string;path:string[];value:string;hyggloId?:number}[]=[];const walk=(nodes:readonly CategoryNode[],parents:string[])=>nodes.forEach(node=>{const path=[...parents,node.name];if(node.children?.length)walk(node.children,path);else result.push({name:node.name,path,value:categoryPathValue(path),hyggloId:node.hyggloId})});walk(CATEGORY_TAXONOMY,[]);return result}

export type { CategoryNode };
