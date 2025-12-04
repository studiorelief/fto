import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export const homeHeroScroll = () => {
  // Get the trigger element
  const trigger = document.querySelector('.home_hero_asset');

  if (!trigger) {
    return;
  }

  // Animate .home_hero_asset-line.is-1 to translateY(0rem)
  const line1 = document.querySelector('.home_hero_asset-line.is-1');
  if (line1) {
    gsap.fromTo(
      line1,
      {
        x: '0',
      },
      {
        x: '15rem',
        scrollTrigger: {
          trigger: trigger,
          start: 'bottom bottom', // when top of trigger hits bottom of viewport
          end: 'bottom top', // when bottom of trigger hits top of viewport
          scrub: 1, // smooth scrubbing effect
        },
      }
    );
  }

  // Animate .home_hero_asset-line.is-2 to translateY(-10rem)
  const line2 = document.querySelector('.home_hero_asset-line.is-2');
  if (line2) {
    gsap.fromTo(
      line2,
      {
        x: '0rem',
      },
      {
        x: '-15rem',
        scrollTrigger: {
          markers: false,
          trigger: trigger,
          start: 'bottom bottom',
          end: 'bottom top',
          scrub: 1,
        },
      }
    );
  }
};
