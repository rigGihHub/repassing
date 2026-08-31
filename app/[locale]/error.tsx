"use client";

import {useEffect} from 'react';

export default function LocaleError({error,reset}:{error:Error & {digest?:string};reset:()=>void}) {
  useEffect(()=>{console.error('Repassing route error', error);},[error]);
  return <main className="errorShell"><section className="emptyState"><strong>Något gick fel</strong><p>Repassing kunde inte ladda den här sidan. Försök igen.</p><button className="primary inlineAction" type="button" onClick={()=>reset()}>Försök igen</button>{error.digest&&<small>Fel-ID: {error.digest}</small>}</section></main>;
}
