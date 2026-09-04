'use client';

import {useEffect} from 'react';

type Props = {locale:string};

export default function SellDraftClear({locale}:Props) {
  useEffect(() => {
    try { window.localStorage.removeItem(`repassing:sell-draft:${locale}`); } catch {}
  },[locale]);
  return null;
}
