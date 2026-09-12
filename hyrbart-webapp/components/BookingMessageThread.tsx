'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Message = { id:string; sender_id:string; body:string; created_at:string; read_at?:string|null; attachment_name?:string|null; attachment_type?:string|null; attachment_size?:number|null; attachment_url?:string|null };

export default function BookingMessageThread({ bookingId, locale, counterpartName }: { bookingId:string; locale:string; counterpartName:string }) {
  const en = locale === 'en';
  const [messages,setMessages]=useState<Message[]>([]); const [currentUserId,setCurrentUserId]=useState(''); const [body,setBody]=useState('');
  const [sending,setSending]=useState(false); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [live,setLive]=useState(false);
  const [attachment,setAttachment]=useState<File|null>(null); const endRef=useRef<HTMLDivElement>(null); const fileRef=useRef<HTMLInputElement>(null);

  async function load(silent=false){try{const response=await fetch(`/api/bookings/${bookingId}/messages`,{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Kunde inte hämta meddelanden.');setMessages(data.messages??[]);setCurrentUserId(data.currentUserId??'');if(!silent)setError('')}catch(err){if(!silent)setError(err instanceof Error?err.message:'Kunde inte hämta meddelanden.')}finally{if(!silent)setLoading(false)}}

  useEffect(()=>{load();const supabase=createClient();const channel=supabase.channel(`booking-messages-${bookingId}`).on('postgres_changes',{event:'*',schema:'public',table:'booking_messages',filter:`booking_id=eq.${bookingId}`},()=>load(true)).subscribe(status=>setLive(status==='SUBSCRIBED'));const onVisibility=()=>{if(document.visibilityState==='visible')load(true)};document.addEventListener('visibilitychange',onVisibility);return()=>{document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(channel)}},[bookingId]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[messages.length]);

  async function send(event:FormEvent){event.preventDefault();const text=body.trim();if((!text&&!attachment)||sending)return;setSending(true);setError('');try{let response:Response;if(attachment){const form=new FormData();form.append('file',attachment);if(text)form.append('body',text);response=await fetch(`/api/bookings/${bookingId}/messages`,{method:'POST',body:form})}else{response=await fetch(`/api/bookings/${bookingId}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:text})})}const data=await response.json();if(!response.ok)throw new Error(data.error||(en?'Could not send message.':'Kunde inte skicka meddelandet.'));setMessages(prev=>prev.some(item=>item.id===data.message.id)?prev:[...prev,data.message]);setBody('');setAttachment(null);if(fileRef.current)fileRef.current.value=''}catch(err){setError(err instanceof Error?err.message:(en?'Could not send message.':'Kunde inte skicka meddelandet.'))}finally{setSending(false)}}

  function chooseFile(file:File|null){if(!file)return;if(file.size>8*1024*1024){setError(en?'The attachment may be at most 8 MB.':'Bilagan får vara högst 8 MB.');return}setAttachment(file);setError('')}

  return <section className="bookingMessageCard">
    <div className="bookingMessageHeader"><div><span>{en?'Messages':'Meddelanden'}</span><strong>{counterpartName}</strong></div><small className={`bookingMessageLive${live?' connected':''}`}>{live?'Live':(en?'Connecting…':'Ansluter…')}</small></div>
    <div className="bookingMessageList" aria-live="polite">
      {loading?<p className="bookingMessageEmpty">{en?'Loading…':'Laddar…'}</p>:messages.length===0?<p className="bookingMessageEmpty">{en?'No messages yet. Start the conversation here.':'Inga meddelanden ännu. Starta konversationen här.'}</p>:messages.map(message=>{const mine=message.sender_id===currentUserId;const isImage=message.attachment_type?.startsWith('image/');return <div className={`bookingBubbleRow ${mine?'mine':'theirs'}`} key={message.id}><div className={`bookingBubble${message.attachment_url?' hasAttachment':''}`}>{message.attachment_url&&isImage?<a href={message.attachment_url} target="_blank" rel="noreferrer" className="bookingAttachmentImageLink"><img src={message.attachment_url} alt={message.attachment_name||'Bilaga'} className="bookingAttachmentImage"/></a>:null}{message.attachment_url&&!isImage?<a href={message.attachment_url} target="_blank" rel="noreferrer" className="bookingAttachmentFile"><span>↗</span><span><strong>{message.attachment_name||'Bilaga'}</strong><small>{message.attachment_size?`${Math.max(1,Math.round(message.attachment_size/1024))} KB`:''}</small></span></a>:null}{message.body?<p>{message.body}</p>:null}<div className="bookingBubbleMeta"><time>{new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}).format(new Date(message.created_at))}</time>{mine?<span>{message.read_at?(en?'Read':'Läst'):(en?'Sent':'Skickat')}</span>:null}</div></div></div>})}<div ref={endRef}/>
    </div>
    {attachment?<div className="bookingAttachmentDraft"><span>{attachment.type.startsWith('image/')?'Bild':'PDF'} · {attachment.name}</span><button type="button" onClick={()=>{setAttachment(null);if(fileRef.current)fileRef.current.value=''}} aria-label={en?'Remove attachment':'Ta bort bilaga'}>×</button></div>:null}
    <form className="bookingMessageComposer" onSubmit={send}><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" hidden onChange={e=>chooseFile(e.target.files?.[0]??null)}/><button type="button" className="bookingAttachButton" onClick={()=>fileRef.current?.click()} aria-label={en?'Add attachment':'Lägg till bilaga'}>＋</button><textarea value={body} onChange={e=>setBody(e.target.value)} rows={2} maxLength={2000} placeholder={en?'Write a message…':'Skriv ett meddelande…'} aria-label={en?'Message':'Meddelande'}/><button type="submit" className="bookingSendButton" disabled={sending||(!body.trim()&&!attachment)}>{sending?(en?'Sending…':'Skickar…'):(en?'Send':'Skicka')}</button></form>
    {error?<small className="bookingMessageError">{error}</small>:null}
  </section>;
}
