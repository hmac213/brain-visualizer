"use client";
import React from 'react';
import dynamic from 'next/dynamic';

const DynamicViewer = dynamic(() => import('./viewer/page'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Loading viewer...</div>
    </div>
  )
});

export default function Home() {
  return <DynamicViewer />;
}