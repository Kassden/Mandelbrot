import Head from 'next/head';
import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import of THREE to avoid SSR issues
const ThreeScene = dynamic(() => import('../components/ThreeScene'), {
  ssr: false
});

export default function Home() {
  return (
    <div>
      <Head>
        <title>Dynamic Mandelbrot Set - Three.js</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ThreeScene />
    </div>
  );
}
