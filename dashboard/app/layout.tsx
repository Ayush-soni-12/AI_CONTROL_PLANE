import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Configure Inter font to prevent preload warnings
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // ← This prevents the preload warning
  variable: '--font-inter',
  preload: true, // Explicitly enable preload
});

export const metadata: Metadata = {
  title: 'NeuralControl - AI Control Plane',
  description: 'Intelligent service orchestration and monitoring platform',
  keywords: ['AI', 'Monitoring', 'Microservices', 'Dashboard', 'Control Plane'],
  authors: [{ name: 'NeuralControl Team' }],
  creator: 'NeuralControl',
  publisher: 'NeuralControl',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yourdomain.com',
    title: 'NeuralControl - AI Control Plane',
    description: 'Intelligent service orchestration and monitoring platform',
    siteName: 'NeuralControl',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Add meta tags for better performance */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        
        {/* Preconnect to improve font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link 
          rel="preconnect" 
          href="https://fonts.gstatic.com" 
          crossOrigin="anonymous" 
        />
        
        {/* Optional: Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.variable} ${inter.className} font-sans bg-gray-950 text-white antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}