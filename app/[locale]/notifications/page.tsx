import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentSession} from '@/src/modules/identity/application/get-current-session';
import {getNotificationsForUser} from '@/src/modules/notifications/infrastructure/supabase-notifications';
import {platformConfig} from '@/src/shared/config/platform';

function when(locale:string,value:string){return new Intl.DateTimeFormat(locale==='sv'?'sv-SE':'en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
function localAction(locale:string,url:string|null){if(!url)return null;if(url.startsWith('/orders/')||url.startsWith('/messages/')||url.startsWith('/listings/'))return `/${locale}${url}`;return url;}

export default async function NotificationsPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(!platformConfig.supportedLocales.includes(locale as 'sv'|'en'))notFound();const sv=locale==='sv';
  const session=await getCurrentSession();
  if(!session||session.preview)return <main className="accountShell"><section className="authCard"><h1>{sv?'Logga in för att se notifieringar':'Sign in to see notifications'}</h1><Link className="primary inlineAction" href={`/${locale}/login?next=/${locale}/notifications`}>{sv?'Logga in':'Sign in'}</Link></section></main>;
  const notifications=await getNotificationsForUser(session.user.id);const unread=notifications.filter(n=>!n.readAt).length;
  return <main className="accountShell notificationShell">
    <div className="accountTop"><Link href={`/${locale}`}>← {sv?'Till marknaden':'Back to marketplace'}</Link>{unread>0&&<form action="/api/v1/notifications/read" method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="mark_all" value="1"/><input type="hidden" name="return_to" value={`/${locale}/notifications`}/><button className="textButton" type="submit">{sv?'Markera alla som lästa':'Mark all as read'}</button></form>}</div>
    <section className="accountHero compactHero"><div><span className="eyebrow">{sv?'NOTIFIERINGAR':'NOTIFICATIONS'}</span><h1>{sv?'Det som behöver din uppmärksamhet':'What needs your attention'}</h1><p>{unread>0?(sv?`${unread} olästa notifieringar`:`${unread} unread notifications`):(sv?'Du är uppdaterad.':'You are all caught up.')}</p></div></section>
    {notifications.length===0?<section className="emptyState"><strong>{sv?'Inga notifieringar ännu':'No notifications yet'}</strong><p>{sv?'Reservationer, betalningar, meddelanden och överlämningar visas här.':'Reservations, payments, messages and handoffs will appear here.'}</p></section>:<section className="notificationList">{notifications.map(n=>{const href=localAction(locale,n.actionUrl);return <article className={`notificationRow ${n.readAt?'':'notificationUnread'}`} key={n.id}><div className="notificationDot"/><div className="notificationCopy"><strong>{n.title}</strong>{n.body&&<p>{n.body}</p>}<small>{when(locale,n.createdAt)}</small></div><div className="notificationActions">{href&&<Link className="secondary compactAction" href={href}>{sv?'Öppna':'Open'}</Link>}{!n.readAt&&<form action="/api/v1/notifications/read" method="post"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="notification_id" value={n.id}/><input type="hidden" name="return_to" value={`/${locale}/notifications`}/><button className="textButton" type="submit">{sv?'Läst':'Read'}</button></form>}</div></article>})}</section>}
  </main>;
}
