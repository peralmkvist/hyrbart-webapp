import 'server-only';
import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,timingSafeEqual} from 'crypto';

const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD=30;
const DIGITS=6;

function key(){
  const source=process.env.SUPABASE_SECRET_KEY;
  if(!source)throw new Error('Missing server encryption secret');
  return createHash('sha256').update(`hyrbart-admin-mfa:v1:${source}`).digest();
}

export function encryptMfaSecret(secret:string){
  const iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key(),iv);
  const encrypted=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptMfaSecret(value:string){
  const [version,ivRaw,tagRaw,dataRaw]=value.split('.');
  if(version!=='v1'||!ivRaw||!tagRaw||!dataRaw)throw new Error('Invalid MFA secret payload');
  const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(ivRaw,'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw,'base64url')),decipher.final()]).toString('utf8');
}

export function generateBase32Secret(bytes=20){
  const input=randomBytes(bytes);
  let bits='';
  for(const b of input)bits+=b.toString(2).padStart(8,'0');
  let out='';
  for(let i=0;i<bits.length;i+=5){
    const chunk=bits.slice(i,i+5).padEnd(5,'0');
    out+=ALPHABET[parseInt(chunk,2)];
  }
  return out;
}

function decodeBase32(value:string){
  const normalized=value.replace(/=+$/,'').replace(/\s+/g,'').toUpperCase();
  let bits='';
  for(const char of normalized){
    const index=ALPHABET.indexOf(char);
    if(index<0)throw new Error('Invalid base32');
    bits+=index.toString(2).padStart(5,'0');
  }
  const bytes:number[]=[];
  for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));
  return Buffer.from(bytes);
}

function totpAt(secret:string,unixMs:number){
  const counter=Math.floor(unixMs/1000/PERIOD);
  const buffer=Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest=createHmac('sha1',decodeBase32(secret)).update(buffer).digest();
  const offset=digest[digest.length-1]&0x0f;
  const binary=((digest[offset]&0x7f)<<24)|((digest[offset+1]&0xff)<<16)|((digest[offset+2]&0xff)<<8)|(digest[offset+3]&0xff);
  return String(binary%(10**DIGITS)).padStart(DIGITS,'0');
}

export function verifyTotp(secret:string,code:string,now=Date.now()){
  const normalized=code.replace(/\s+/g,'');
  if(!/^\d{6}$/.test(normalized))return false;
  for(const step of [-1,0,1]){
    const expected=totpAt(secret,now+step*PERIOD*1000);
    const a=Buffer.from(expected); const b=Buffer.from(normalized);
    if(a.length===b.length&&timingSafeEqual(a,b))return true;
  }
  return false;
}

export function otpauthUri(username:string,secret:string){
  const issuer='Hyrbart Admin';
  const label=encodeURIComponent(`${issuer}:${username}`);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function generateRecoveryCodes(count=10){
  return Array.from({length:count},()=>`${randomBytes(4).toString('hex').toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`);
}

export function hashRecoveryCode(code:string){
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}
