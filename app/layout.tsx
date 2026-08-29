import './globals.css';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Repassing — Play more. Waste less.',
  description: 'Ge sportkläder och utrustning ett nytt liv.'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="sv"><body>{children}</body></html>;
}