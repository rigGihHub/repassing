'use client';

import {useEffect, useState} from 'react';

type Props = {sv:boolean; storageKey:string};
type Draft = Record<string,string>;

const RESTORABLE_FIELDS = [
  'title','price','size_label','condition','description','organization_id','team_id','sport_id','category_id','brand_id'
] as const;

export default function SellDraftPersistence({sv,storageKey}:Props) {
  const [restored,setRestored] = useState(false);

  useEffect(() => {
    const form = document.getElementById('sell-listing-form') as HTMLFormElement | null;
    if (!form) return;

    let hadRestoredValue = false;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        for (const name of RESTORABLE_FIELDS) {
          const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
          const value = draft[name];
          if (!field || typeof value !== 'string' || !value) continue;
          if (!field.value) {
            field.value = value;
            field.dispatchEvent(new Event('change',{bubbles:true}));
            hadRestoredValue = true;
          }
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    if (hadRestoredValue) setRestored(true);

    let timer:number | undefined;
    const saveNow = () => {
      const draft:Draft = {};
      for (const name of RESTORABLE_FIELDS) {
        const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (field) draft[name] = field.value;
      }
      try { window.localStorage.setItem(storageKey, JSON.stringify(draft)); } catch {}
    };
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(saveNow,250);
    };
    const saveBeforeSubmit = () => {
      window.clearTimeout(timer);
      saveNow();
    };

    form.addEventListener('input',save);
    form.addEventListener('change',save);
    form.addEventListener('submit',saveBeforeSubmit);
    return () => {
      window.clearTimeout(timer);
      form.removeEventListener('input',save);
      form.removeEventListener('change',save);
      form.removeEventListener('submit',saveBeforeSubmit);
    };
  },[storageKey]);

  if (!restored) return null;
  return <div className="draftRestored" role="status">✓ {sv?'Vi återställde det du redan hade fyllt i. Lägg bara till bilderna igen.':'We restored what you had already entered. Just add the photos again.'}</div>;
}
