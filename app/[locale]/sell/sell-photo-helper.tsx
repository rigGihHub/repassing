'use client';

import {ChangeEvent, useEffect, useMemo, useState} from 'react';

type Props = {sv:boolean};

type Preview = {url:string;name:string};

const presets = [
  {sv:'Fotbollsskor', en:'Football boots'},
  {sv:'Matchtröja', en:'Match shirt'},
  {sv:'Träningskläder', en:'Training clothes'},
  {sv:'Klubba', en:'Stick'},
  {sv:'Skydd', en:'Protective gear'},
];

export default function SellPhotoHelper({sv}:Props) {
  const [previews,setPreviews] = useState<Preview[]>([]);
  const selectedText = useMemo(() => previews.length ? (sv ? `${previews.length} bild${previews.length === 1 ? '' : 'er'} vald${previews.length === 1 ? '' : 'a'}` : `${previews.length} photo${previews.length === 1 ? '' : 's'} selected`) : '', [previews,sv]);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  function onImages(event: ChangeEvent<HTMLInputElement>) {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    const files = Array.from(event.target.files ?? []).slice(0,6);
    setPreviews(files.map(file => ({url:URL.createObjectURL(file), name:file.name})));
  }

  function usePreset(label:string) {
    const input = document.getElementById('listing-title') as HTMLInputElement | null;
    if (!input) return;
    if (!input.value.trim()) input.value = label;
    input.focus();
    input.setSelectionRange(input.value.length,input.value.length);
  }

  return <>
    <label className="full photoField sellPhotoHelper">
      <span>{sv?'Bilder':'Photos'} *</span>
      <input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple required onChange={onImages}/>
      <small>{sv?'1–6 bilder · högst 10 MB per bild':'1–6 photos · max 10 MB each'}</small>
      {selectedText && <strong className="photoSelectionStatus">✓ {selectedText}</strong>}
      {previews.length > 0 && <div className="sellPhotoPreview" aria-label={sv?'Valda bilder':'Selected photos'}>{previews.map((preview,index)=><div key={preview.url}><img src={preview.url} alt={sv?`Bild ${index+1}`:`Photo ${index+1}`}/>{index===0 && <em>{sv?'Huvudbild':'Cover'}</em>}</div>)}</div>}
    </label>
    <div className="full sellQuickStart">
      <div><strong>{sv?'Snabbstart':'Quick start'}</strong><span>{sv?'Välj vad du säljer så fyller vi början på rubriken. Du kan ändra allt efteråt.':'Choose what you are selling and we will start the title for you. You can change everything afterwards.'}</span></div>
      <div className="sellQuickChips">{presets.map(p => {const label=sv?p.sv:p.en; return <button key={p.en} type="button" onClick={()=>usePreset(label)}>{label}</button>;})}</div>
    </div>
  </>;
}
