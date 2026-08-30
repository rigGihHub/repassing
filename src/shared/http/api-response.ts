import {NextResponse} from 'next/server';

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({data, meta: {apiVersion: 'v1'}}, init);
}

export function apiUnauthorized(message = 'Unauthorized') {
  return NextResponse.json({error: {code: 'UNAUTHORIZED', message}}, {status: 401});
}
