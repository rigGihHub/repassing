'use client';

import Link from 'next/link';
import {FormEvent, useState} from 'react';

type SubmitState = 'idle' | 'saving' | 'done' | 'error';

export function ClubApplicationForm({locale}: {locale: string}) {
  const sv = locale === 'sv';
  const [state, setState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'saving') return;

    const form = event.currentTarget;
    setState('saving');
    setErrorMessage('');

    try {
      const response = await fetch('/api/v1/organization-applications', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
      });

      const payload = await response.json().catch(() => null) as {error?: string} | null;
      if (!response.ok) {
        const code = payload?.error;
        setErrorMessage(code === 'UNAUTHORIZED'
          ? (sv ? 'Din inloggning har gått ut. Ladda om sidan och logga in igen.' : 'Your session has expired. Reload the page and sign in again.')
          : code === 'DUPLICATE_APPLICATION'
          ? (sv ? 'Det finns redan en pågående ansökan för den föreningen.' : 'There is already an active application for that club.')
          : code === 'INVALID_WEBSITE'
            ? (sv ? 'Webbadressen måste börja med http:// eller https://.' : 'The website address must start with http:// or https://.')
            : code === 'INVALID_INPUT'
              ? (sv ? 'Kontrollera namn och e-postadress och försök igen.' : 'Check the name and email address and try again.')
              : (sv ? 'Ansökan kunde inte skickas just nu. Försök igen om en stund.' : 'The application could not be sent right now. Please try again shortly.'));
        setState('error');
        return;
      }

      form.reset();
      setState('done');
    } catch {
      setErrorMessage(sv ? 'Ingen kontakt med tjänsten. Försök igen om en stund.' : 'Could not reach the service. Please try again shortly.');
      setState('error');
    }
  }

  if (state === 'done') {
    return <div className="successBox" role="status">
      <h2>{sv ? 'Ansökan är skickad' : 'Application sent'}</h2>
      <p>{sv ? 'Vi har tagit emot din intresseanmälan. Du kan följa statusen under Mina föreningar.' : 'We have received your application. You can follow its status under My clubs.'}</p>
      <div className="successActions"><Link className="primaryButton" href={`/${locale}/clubs`}>{sv ? 'Visa mina föreningar' : 'View my clubs'}</Link><Link className="secondaryButton" href={`/${locale}`}>{sv ? 'Till marknaden' : 'Go to marketplace'}</Link></div>
    </div>;
  }

  return <form className="clubApplyForm" onSubmit={submit} aria-busy={state === 'saving'}>
    <label>{sv ? 'Föreningens namn' : 'Club name'}
      <input name="clubName" required minLength={2} maxLength={120} autoComplete="organization" placeholder={sv ? 'Exempel: Örebro SK' : 'Example: Local Sports Club'} />
    </label>
    <div className="formTwo">
      <label>{sv ? 'Kontaktperson' : 'Contact person'}
        <input name="contactName" required minLength={2} maxLength={120} autoComplete="name" />
      </label>
      <label>E-post
        <input name="contactEmail" type="email" required maxLength={254} autoComplete="email" inputMode="email" />
      </label>
    </div>
    <div className="formTwo">
      <label>{sv ? 'Ort (valfritt)' : 'City (optional)'}
        <input name="city" maxLength={120} autoComplete="address-level2" />
      </label>
      <label>{sv ? 'Webbplats (valfritt)' : 'Website (optional)'}
        <input name="website" type="url" maxLength={300} inputMode="url" autoComplete="url" placeholder="https://" />
      </label>
    </div>
    <label>{sv ? 'Meddelande (valfritt)' : 'Message (optional)'}
      <textarea name="note" rows={4} spellCheck maxLength={1000} placeholder={sv ? 'Berätta gärna kort om föreningen och hur ni vill använda Repassing.' : 'Tell us briefly about the club and how you would like to use Repassing.'} />
    </label>
    {state === 'error' && <p className="formError" role="alert">{errorMessage}</p>}
    <button className="primaryButton" disabled={state === 'saving'} aria-busy={state === 'saving'}>
      {state === 'saving' ? (sv ? 'Skickar…' : 'Sending…') : (sv ? 'Skicka intresseanmälan' : 'Send application')}
    </button>
    <p className="formHelp">{sv ? 'Du förbinder dig inte till något genom att skicka ansökan.' : 'Submitting the application does not commit you to anything.'}</p>
  </form>;
}
