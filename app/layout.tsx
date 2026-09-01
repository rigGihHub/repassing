import './globals.css';
import type {Metadata} from 'next';
import {APP_VERSION} from '../src/config/app-version';

export const metadata: Metadata = {
  title: 'Repassing — Play more. Waste less.',
  description: 'Ge sportkläder och utrustning ett nytt liv.'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="sv"><body>{children}<footer className="appVersion" aria-label={`Repassing version ${APP_VERSION}`}>Repassing · v{APP_VERSION}</footer></body></html>;
}