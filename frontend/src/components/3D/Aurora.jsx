import React from 'react';

const AURORA_STYLES = `
  @keyframes aurora-drift-1 {
    0% {
      transform: translate(0px, 0px) scale(1);
      border-radius: 40% 60% 60% 40% / 40% 40% 60% 60%;
    }
    33% {
      transform: translate(120px, 80px) scale(1.15);
      border-radius: 60% 40% 40% 60% / 50% 60% 40% 50%;
    }
    66% {
      transform: translate(-60px, 120px) scale(0.9);
      border-radius: 50% 50% 50% 50% / 40% 60% 50% 60%;
    }
    100% {
      transform: translate(0px, 0px) scale(1);
      border-radius: 40% 60% 60% 40% / 40% 40% 60% 60%;
    }
  }

  @keyframes aurora-drift-2 {
    0% {
      transform: translate(0px, 0px) scale(1);
      border-radius: 50% 50% 30% 70% / 50% 60% 40% 50%;
    }
    50% {
      transform: translate(-100px, -60px) scale(1.1);
      border-radius: 40% 60% 60% 40% / 60% 40% 60% 40%;
    }
    100% {
      transform: translate(0px, 0px) scale(1);
      border-radius: 50% 50% 30% 70% / 50% 60% 40% 50%;
    }
  }

  @keyframes aurora-drift-3 {
    0% {
      transform: translate(0px, 0px) scale(1.1);
      border-radius: 60% 40% 50% 50% / 40% 50% 60% 50%;
    }
    33% {
      transform: translate(-80px, 100px) scale(0.9);
      border-radius: 50% 60% 40% 60% / 60% 50% 50% 40%;
    }
    66% {
      transform: translate(80px, -80px) scale(1.05);
      border-radius: 40% 50% 60% 40% / 50% 40% 60% 60%;
    }
    100% {
      transform: translate(0px, 0px) scale(1.1);
      border-radius: 60% 40% 50% 50% / 40% 50% 60% 50%;
    }
  }
`;

export const Aurora = () => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0
    }}>
      <style dangerouslySetInnerHTML={{ __html: AURORA_STYLES }} />
      
      {/* Aurora Blob 1 - Purple */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '10%',
        width: '750px',
        height: '750px',
        background: 'rgba(124, 58, 237, 0.09)',
        filter: 'blur(120px)',
        animation: 'aurora-drift-1 18s ease-in-out infinite',
        pointerEvents: 'none'
      }} />

      {/* Aurora Blob 2 - Teal */}
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '680px',
        height: '680px',
        background: 'rgba(13, 148, 136, 0.06)',
        filter: 'blur(120px)',
        animation: 'aurora-drift-2 24s ease-in-out infinite',
        pointerEvents: 'none'
      }} />

      {/* Aurora Blob 3 - Indigo / Blue */}
      <div style={{
        position: 'absolute',
        top: '30%',
        right: '25%',
        width: '800px',
        height: '800px',
        background: 'rgba(99, 102, 241, 0.08)',
        filter: 'blur(130px)',
        animation: 'aurora-drift-3 30s ease-in-out infinite',
        pointerEvents: 'none'
      }} />
    </div>
  );
};

export default Aurora;
