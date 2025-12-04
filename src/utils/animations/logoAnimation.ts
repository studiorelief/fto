import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const logoRotationScroll = () => {
  const elements = document.querySelectorAll<HTMLElement>('[gsap="rotation-right"]');

  if (!elements.length) return;

  elements.forEach((el) => {
    gsap.fromTo(
      el,
      { rotate: 0 },
      {
        rotate: 50,
        ease: 'none',
        scrollTrigger: {
          markers: false,
          trigger: elements,
          start: '0% bottom',
          end: '100% top',
          scrub: true,
        },
      }
    );
  });

  const elementFooter = document.querySelectorAll<HTMLElement>('[gsap="rotation-footer"]');

  if (!elementFooter.length) return;

  elementFooter.forEach((el) => {
    gsap.to(el, {
      rotate: 0,
      ease: 'none',
      scrollTrigger: {
        markers: false,
        trigger: '.footer_component',
        start: '0% bottom',
        end: '100% top',
        scrub: true,
      },
    });
  });
};
