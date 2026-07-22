"use client";

export const dynamic = 'force-dynamic';

import dynamic from 'next/dynamic';

const MainApp = dynamic(() => import('@/components/MainApp'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h2>Loading Pill Recognition System...</h2>
    </div>
  ),
});

export default function Page() {
  return <MainApp />;
}