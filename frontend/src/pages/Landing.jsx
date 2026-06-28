import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { use3DTilt } from '../hooks/use3DTilt';
import { VaultOrb } from '../components/3D/VaultOrb';
import { Aurora } from '../components/3D/Aurora';
import { RAGFlow } from '../components/3D/RAGFlow';

const IconBrandGithub = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const IconWifiOff = ({ size = 24, style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5" />
    <path d="M5 12.5a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const IconBolt = ({ size = 24, style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconLock = ({ size = 24, style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// Particle class for the canvas background
class Particle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.width;
    this.y = Math.random() * this.height;
    // Slow drift velocity
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = Math.random() * 2 + 1;
    // Purple or Teal colors
    this.color = Math.random() > 0.5 ? 'rgba(124, 58, 237, 0.25)' : 'rgba(13, 148, 136, 0.25)';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off walls or reset
    if (this.x < 0 || this.x > this.width) this.vx *= -1;
    if (this.y < 0 || this.y > this.height) this.vy *= -1;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

// Canvas Particle System Component
const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let particles = [];
    const particleCount = 150;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            // Dynamic opacity based on distance
            const alpha = (1 - dist / 80) * 0.15;
            ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      drawConnections();
      
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none', 
        zIndex: 0 
      }} 
    />
  );
};

const StatCard = ({ 
  icon: Icon, 
  label, 
  subtext, 
  targetValue, 
  valueSuffix, 
  glowColor 
}) => {
  const [count, setCount] = useState(0);
  const [animated, setAnimated] = useState(false);
  const cardRef = use3DTilt();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated) {
          setAnimated(true);
          
          if (targetValue === 0) {
            setCount(0);
            return;
          }

          let start = 0;
          const duration = 1500; // 1.5s total animation time
          const stepTime = Math.max(Math.floor(duration / targetValue), 16); // cap at ~60fps
          
          const timer = setInterval(() => {
            start += Math.ceil(targetValue / 100); // larger steps for higher numbers
            if (start >= targetValue) {
              setCount(targetValue);
              clearInterval(timer);
            } else {
              setCount(start);
            }
          }, stepTime);

          return () => clearInterval(timer);
        }
      },
      { threshold: 0.15 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => observer.disconnect();
  }, [targetValue, animated, cardRef]);

  // Pass custom CSS variable for glow color
  const glowStyle = {
    '--glow-color': glowColor,
    flex: 1,
    padding: '24px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    transition: 'all 300ms ease',
    position: 'relative',
    minWidth: '220px',
  };

  return (
    <div 
      ref={cardRef} 
      className="glass stat-card" 
      style={glowStyle}
    >
      <div 
        style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '16px',
          boxShadow: `0 0 15px ${glowColor}1A`
        }}
      >
        <Icon size={24} style={{ color: glowColor }} />
      </div>
      <div style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '4px', color: '#fff' }}>
        {count === 0 && targetValue > 0 ? '0' : count}{valueSuffix}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
        {subtext}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .stat-card:hover {
          border-color: var(--glow-color) !important;
          box-shadow: 0 0 24px rgba(124, 58, 237, 0.1), 0 0 12px var(--glow-color) !important;
          transform: translateY(-4px);
        }
      `}} />
    </div>
  );
};

export const Landing = ({ onLaunch }) => {
  const headlineWords = {
    line1: "Your documents.".split(" "),
    line2: "Your intelligence.".split(" "),
    tags: "Offline. Private. Instant.".split(" ")
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const techStack = [
    { name: 'Ollama', color: '#FF8A00' },
    { name: 'LangChain', color: '#12C2E9' },
    { name: 'ChromaDB', color: '#F64F59' },
    { name: 'FastAPI', color: '#009688' },
    { name: 'React', color: '#61DAFB' },
    { name: 'TypeScript', color: '#3178C6' },
    { name: 'Docker', color: '#2496ED' }
  ];

  return (
    <div 
      style={{ 
        backgroundColor: '#0A0A0F', 
        minHeight: '100vh', 
        width: '100%', 
        position: 'relative', 
        overflowX: 'hidden', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '60px 20px',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. Canvas Particle Background */}
      <ParticleBackground />

      {/* Aurora Drifting Blobs Background */}
      <Aurora />

      {/* 2. Radial Ambient Background Glow */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'radial-gradient(ellipse 800px 600px at 50% 40%, rgba(124, 58, 237, 0.08) 0%, transparent 70%)', 
          pointerEvents: 'none', 
          zIndex: 0 
        }} 
      />

      {/* Hero Outer Wrapper */}
      <div 
        style={{ 
          maxWidth: '1200px', 
          width: '100%', 
          display: 'grid', 
          gridTemplateColumns: '1fr 400px', 
          gap: '40px', 
          alignItems: 'center', 
          position: 'relative', 
          zIndex: 2,
          boxSizing: 'border-box'
        }}
      >
        {/* Left Side: Headline & CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          
          {/* Framer Motion stagger for words */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ marginBottom: '32px' }}
          >
            {/* Tagline: Offline. Private. Instant. */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {headlineWords.tags.map((word, idx) => (
                <motion.span 
                  key={`tag-${idx}`} 
                  variants={wordVariants}
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: 'rgba(255, 255, 255, 0.4)', 
                    letterSpacing: '0.2em', 
                    textTransform: 'uppercase' 
                  }}
                >
                  {word}{' '}
                </motion.span>
              ))}
            </div>

            {/* Line 1: Your documents. */}
            <h1 
              style={{ 
                margin: 0, 
                fontSize: '56px', 
                fontWeight: 300, 
                lineHeight: '1.15', 
                color: '#fff', 
                letterSpacing: '-1.5px',
                display: 'block' 
              }}
            >
              {headlineWords.line1.map((word, idx) => (
                <motion.span 
                  key={`l1-${idx}`} 
                  variants={wordVariants}
                  style={{ display: 'inline-block', marginRight: '12px' }}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* Line 2: Your intelligence. */}
            <h1 
              style={{ 
                margin: 0, 
                fontSize: '56px', 
                fontWeight: 600, 
                lineHeight: '1.15', 
                letterSpacing: '-1.5px',
                background: 'linear-gradient(135deg, #7C3AED, #0D9488)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'block',
                marginTop: '4px'
              }}
            >
              {headlineWords.line2.map((word, idx) => (
                <motion.span 
                  key={`l2-${idx}`} 
                  variants={wordVariants}
                  style={{ display: 'inline-block', marginRight: '12px' }}
                >
                  {word}
                </motion.span>
              ))}
            </h1>
          </motion.div>

          {/* CTA Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '56px' }}>
            <button 
              className="btn cta-launch-btn"
              onClick={onLaunch}
              style={{ 
                border: 'none',
                borderRadius: '12px', 
                padding: '14px 28px', 
                fontSize: '15px', 
                fontWeight: 500,
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(124, 58, 237, 0.25)'
              }}
            >
              Launch VaultAI
            </button>

            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn glass"
              style={{ 
                textDecoration: 'none',
                borderRadius: '12px', 
                padding: '14px 28px', 
                fontSize: '15px', 
                fontWeight: 500,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <IconBrandGithub size={18} />
              View on GitHub
            </a>
          </div>

          {/* Stats Row */}
          <div 
            style={{ 
              display: 'flex', 
              gap: '20px', 
              width: '100%', 
              flexWrap: 'wrap' 
            }}
          >
            <StatCard 
              icon={IconWifiOff} 
              label="100% Offline" 
              subtext="Zero network calls, fully local vector operations" 
              targetValue={100} 
              valueSuffix="%" 
              glowColor="#10B981" 
            />
            <StatCard 
              icon={IconBolt} 
              label="Instant Performance" 
              subtext="Optimized parallel chunks retrieval" 
              targetValue={2} 
              valueSuffix="s" 
              glowColor="#F59E0B" 
            />
            <StatCard 
              icon={IconLock} 
              label="Data Shared" 
              subtext="Your secure documents never leave this device" 
              targetValue={0} 
              valueSuffix="" 
              glowColor="#8B5CF6" 
            />
          </div>
        </div>

        {/* Right Side: Rotating 3D Three.js Orb */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            position: 'relative',
            height: '400px'
          }}
        >
          <VaultOrb size={360} />
        </div>
      </div>

      {/* RAG Flow Pipeline Visualization */}
      <div style={{ width: '100%', maxWidth: '1000px', marginTop: '60px', zIndex: 2, position: 'relative' }}>
        <RAGFlow />
      </div>

      {/* Tech Stack Marquee Footer */}
      <div 
        style={{ 
          marginTop: '80px', 
          maxWidth: '1000px', 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          position: 'relative',
          zIndex: 2
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
          Local Vector Intelligence Stack
        </div>
        
        <div className="marquee-container glass" style={{ padding: '16px 0', border: '1px solid var(--border-subtle)', borderRadius: '16px' }}>
          <div className="marquee-content">
            {techStack.map((tech, idx) => (
              <div 
                key={`tech-1-${idx}`} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 16px', 
                  borderRadius: '20px', 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                <span 
                  style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: tech.color,
                    boxShadow: `0 0 8px ${tech.color}`
                  }} 
                />
                {tech.name}
              </div>
            ))}
          </div>
          
          <div className="marquee-content" aria-hidden="true">
            {techStack.map((tech, idx) => (
              <div 
                key={`tech-2-${idx}`} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 16px', 
                  borderRadius: '20px', 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                <span 
                  style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: tech.color,
                    boxShadow: `0 0 8px ${tech.color}`
                  }} 
                />
                {tech.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
