'use client';

import {useEffect, useState} from 'react';

type Props = {sv:boolean};
type Stage = 'idle'|'uploading'|'processing'|'error';

type EnhancedResponse = {
  ok?: boolean;
  code?: string;
  redirect?: string;
};

const errorMessage = (code:string | undefined, sv:boolean) => {
  if (code === 'validation') return sv
    ? 'Kontrollera uppgifterna och bilderna. Bilder får vara högst 10 MB och du kan välja högst 6.'
    : 'Check the details and photos. Photos may be up to 10 MB and you can select up to 6.';
  if (code === 'image') return sv
    ? 'Bilderna kunde inte sparas. De är fortfarande valda så länge du stannar på sidan – försök igen när anslutningen är stabil.'
    : 'The photos could not be saved. They remain selected while you stay on this page — try again when the connection is stable.';
  if (code === 'auth') return sv
    ? 'Din inloggning behöver förnyas.'
    : 'Your sign-in needs to be renewed.';
  if (code === 'offline') return sv
    ? 'Du verkar vara offline. Dina textuppgifter är sparade på enheten. Försök igen när du har internet.'
    : 'You appear to be offline. Your text details are saved on this device. Try again when you are online.';
  if (code === 'network') return sv
    ? 'Kontakten bröts under publiceringen. Kontrollera om annonsen hann publiceras innan du försöker igen.'
    : 'The connection was lost while publishing. Check whether the listing was published before trying again.';
  return sv
    ? 'Annonsen kunde inte publiceras just nu. Dina textuppgifter finns kvar – försök igen om en stund.'
    : 'The listing could not be published right now. Your text details are still here — try again shortly.';
};

export default function SellSubmitGuard({sv}:Props) {
  const [stage,setStage] = useState<Stage>('idle');
  const [progress,setProgress] = useState(0);
  const [message,setMessage] = useState('');

  useEffect(() => {
    const form = document.getElementById('sell-listing-form') as HTMLFormElement | null;
    if (!form) return;

    let submitting = false;
    let request:XMLHttpRequest | null = null;
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;

    const resetButton = () => {
      submitting = false;
      form.removeAttribute('aria-busy');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || (sv ? 'Publicera gratis' : 'Publish for free');
      }
    };

    const fail = (code:string) => {
      setStage('error');
      setMessage(errorMessage(code,sv));
      resetButton();
    };

    const onBeforeUnload = (event:BeforeUnloadEvent) => {
      if (!submitting) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const onSubmit = (event:SubmitEvent) => {
      if (submitting) {
        event.preventDefault();
        return;
      }
      event.preventDefault();

      if (!navigator.onLine) {
        fail('offline');
        return;
      }

      const imageInput = form.elements.namedItem('images') as HTMLInputElement | null;
      const files = Array.from(imageInput?.files ?? []);
      if (files.length < 1 || files.length > 6 || files.some(file => file.size > 10 * 1024 * 1024)) {
        fail('validation');
        return;
      }

      submitting = true;
      setStage('uploading');
      setProgress(0);
      setMessage(sv ? 'Laddar upp bilder…' : 'Uploading photos…');
      form.setAttribute('aria-busy','true');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.textContent ?? '';
        submitButton.textContent = sv ? 'Publicerar…' : 'Publishing…';
      }

      const xhr = new XMLHttpRequest();
      request = xhr;
      xhr.open('POST', form.action, true);
      xhr.responseType = 'json';
      xhr.setRequestHeader('x-repassing-enhanced-submit','1');
      xhr.setRequestHeader('accept','application/json');

      xhr.upload.onprogress = (uploadEvent) => {
        if (!uploadEvent.lengthComputable) return;
        const next = Math.max(1,Math.min(99,Math.round((uploadEvent.loaded / uploadEvent.total) * 100)));
        setProgress(next);
        setMessage(sv ? `Laddar upp bilder… ${next}%` : `Uploading photos… ${next}%`);
      };
      xhr.upload.onload = () => {
        setProgress(100);
        setStage('processing');
        setMessage(sv ? 'Bilderna är uppladdade. Sparar och publicerar annonsen…' : 'Photos uploaded. Saving and publishing the listing…');
      };
      xhr.onerror = () => fail('network');
      xhr.onabort = () => fail('network');
      xhr.onload = () => {
        const response = (xhr.response ?? {}) as EnhancedResponse;
        if (xhr.status >= 200 && xhr.status < 300 && response.ok && response.redirect) {
          submitting = false;
          form.removeAttribute('aria-busy');
          setStage('processing');
          setMessage(sv ? 'Klart! Öppnar din annons…' : 'Done! Opening your listing…');
          window.location.assign(response.redirect);
          return;
        }
        if (response.code === 'auth' && response.redirect) {
          submitting = false;
          form.removeAttribute('aria-busy');
          window.location.assign(response.redirect);
          return;
        }
        fail(response.code || 'save');
      };

      xhr.send(new FormData(form));
    };

    window.addEventListener('beforeunload',onBeforeUnload);
    form.addEventListener('submit', onSubmit);
    return () => {
      request?.abort();
      window.removeEventListener('beforeunload',onBeforeUnload);
      form.removeEventListener('submit', onSubmit);
    };
  },[sv]);

  if (stage === 'idle') return null;
  return <div className={`sellPublishStatus ${stage==='error'?'isError':''}`} role={stage==='error'?'alert':'status'} aria-live="polite">
    <div className="sellPublishStatusRow"><strong>{stage==='error'?(sv?'Publiceringen pausades':'Publishing paused'):(sv?'Publicerar annonsen':'Publishing listing')}</strong><span>{stage==='uploading'?`${progress}%`:stage==='processing'?'✓':''}</span></div>
    <p>{message}</p>
    {stage!=='error' && <div className={`sellPublishProgress ${stage==='processing'?'isProcessing':''}`} aria-hidden="true"><span style={stage==='uploading'?{width:`${progress}%`}:undefined}/></div>}
  </div>;
}
