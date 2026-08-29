import {money} from '@/src/shared/domain/money';
import type {ListingCard} from '../domain/listing';

export const mockListings: ListingCard[] = [
  {id:'1', title:'Fotbollsskor', category:'Fotboll', size:'36', organization:'ÖSK Fotboll', price:money(15000,'SEK'), image:'/mock/boots.svg', status:'ACTIVE'},
  {id:'2', title:'Träningsjacka', category:'Kläder', size:'152', organization:'ÖSK Fotboll', price:money(12000,'SEK'), image:'/mock/jacket.svg', status:'ACTIVE'},
  {id:'3', title:'Innebandyklubba', category:'Innebandy', size:'87 cm', organization:'ÖSK Fotboll', price:money(20000,'SEK'), image:'/mock/stick.svg', status:'ACTIVE'},
  {id:'4', title:'Skridskor', category:'Ishockey', size:'37', organization:'ÖSK Fotboll', price:money(18000,'SEK'), image:'/mock/skates.svg', status:'ACTIVE'}
];
