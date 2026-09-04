'use client';

import {useEffect, useState} from 'react';

export default function ReservationSubmitGuard({sv}:{sv:boolean}) {
  const [submitting,setSubmitting]=useState(false);

  useEffect(()=>{
    const form=document.querySelector<HTMLFormElement>('.reservationForm');
    if(!form)return;
    const button=form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if(!button)return;

    const onSubmit=(event:SubmitEvent)=>{
      if(submitting){
        event.preventDefault();
        return;
      }
      setSubmitting(true);
      button.disabled=true;
      button.setAttribute('aria-disabled','true');
      button.textContent=sv?'Startar affären…':'Starting deal…';
    };

    form.addEventListener('submit',onSubmit);
    return()=>form.removeEventListener('submit',onSubmit);
  },[submitting,sv]);

  return null;
}
