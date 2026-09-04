'use client';

import {useEffect, useMemo, useState} from 'react';

type Props = {sv:boolean};

type PriceBand = {labelSv:string; labelEn:string; low:number; high:number};

const bands: PriceBand[] = [
  {labelSv:'Fotbollsskor', labelEn:'Football boots', low:100, high:350},
  {labelSv:'Matchtröja', labelEn:'Match shirt', low:80, high:250},
  {labelSv:'Träningskläder', labelEn:'Training clothes', low:50, high:180},
  {labelSv:'Klubba', labelEn:'Stick', low:100, high:400},
  {labelSv:'Skydd', labelEn:'Protective gear', low:50, high:200},
];

const conditionFactor: Record<string,number> = {
  NEW_WITH_TAGS: 1.35,
  LIKE_NEW: 1.15,
  GOOD: 1,
  USED: .75,
  WELL_USED: .5,
};

const round25 = (value:number) => Math.max(25, Math.round(value / 25) * 25);

export default function SellPriceHelper({sv}:Props) {
  const [title,setTitle] = useState('');
  const [condition,setCondition] = useState('GOOD');

  useEffect(() => {
    const form = document.getElementById('sell-listing-form') as HTMLFormElement | null;
    if (!form) return;
    const titleInput = form.elements.namedItem('title') as HTMLInputElement | null;
    const conditionInput = form.elements.namedItem('condition') as HTMLSelectElement | null;
    const sync = () => {
      setTitle(titleInput?.value ?? '');
      setCondition(conditionInput?.value ?? 'GOOD');
    };
    sync();
    titleInput?.addEventListener('input',sync);
    conditionInput?.addEventListener('change',sync);
    return () => {
      titleInput?.removeEventListener('input',sync);
      conditionInput?.removeEventListener('change',sync);
    };
  },[]);

  const suggestion = useMemo(() => {
    const normalized = title.toLowerCase();
    const band = bands.find(item => {
      const needles = item.labelSv.toLowerCase().split(' ').concat(item.labelEn.toLowerCase().split(' '));
      return needles.some(word => word.length > 4 && normalized.includes(word));
    });
    if (!band) return null;
    const factor = conditionFactor[condition] ?? 1;
    return {
      label: sv ? band.labelSv : band.labelEn,
      low: round25(band.low * factor),
      high: round25(band.high * factor),
    };
  },[condition,sv,title]);

  function usePrice(value:number) {
    const form = document.getElementById('sell-listing-form') as HTMLFormElement | null;
    const input = form?.elements.namedItem('price') as HTMLInputElement | null;
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.focus();
  }

  if (!suggestion) return <div className="priceHelper full"><div><strong>{sv?'Osäker på priset?':'Unsure about the price?'}</strong><span>{sv?'Skriv vad du säljer så kan vi visa ett enkelt riktmärke.':'Describe what you are selling and we can show a simple guide.'}</span></div><small>{sv?'Riktmärket bygger på generella begagnatnivåer – inte aktuell marknadsdata.':'The guide uses general second-hand levels, not live market data.'}</small></div>;

  const midpoint = round25((suggestion.low + suggestion.high) / 2);
  return <div className="priceHelper full">
    <div><strong>{sv?`Prisidé för ${suggestion.label}`:`Price idea for ${suggestion.label}`}</strong><span>{sv?`Ett rimligt startintervall kan vara cirka ${suggestion.low}–${suggestion.high} kr.`:`A reasonable starting range may be about SEK ${suggestion.low}–${suggestion.high}.`}</span></div>
    <div className="priceHelperActions"><button type="button" onClick={()=>usePrice(suggestion.low)}>{suggestion.low} kr</button><button type="button" onClick={()=>usePrice(midpoint)}>{midpoint} kr</button><button type="button" onClick={()=>usePrice(suggestion.high)}>{suggestion.high} kr</button></div>
    <small>{sv?'Endast vägledning. Märke, modell, ålder och lokalt intresse kan påverka priset mycket.':'Guidance only. Brand, model, age and local demand can change the price significantly.'}</small>
  </div>;
}
