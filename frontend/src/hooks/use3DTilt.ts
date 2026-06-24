import { useEffect, useRef } from 'react';

export function use3DTilt<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Save original styles to restore them correctly
    const originalTransform = el.style.transform;
    const originalTransition = el.style.transition;
    const originalBackgroundImage = el.style.backgroundImage;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const x = mouseX / rect.width - 0.5; // -0.5 to 0.5
      const y = mouseY / rect.height - 0.5; // -0.5 to 0.5

      el.style.transform = `perspective(800px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) scale(1.01)`;
      el.style.transition = 'transform 0.1s ease-out';
      el.style.backgroundImage = `radial-gradient(200px at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.06), transparent)`;
    };

    const handleMouseLeave = () => {
      el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
      el.style.transition = 'transform 0.4s ease-out';
      el.style.backgroundImage = originalBackgroundImage;
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      
      // Restore original styles on unmount
      el.style.transform = originalTransform;
      el.style.transition = originalTransition;
      el.style.backgroundImage = originalBackgroundImage;
    };
  }, []);

  return ref;
}
