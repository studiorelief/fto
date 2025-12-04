import './button.css';

import gsap from 'gsap';

interface ButtonDOM {
  button: HTMLElement;
  hover: HTMLElement;
}

interface Coordinates {
  x: number;
  y: number;
}

/**
 * Classe gérant l'effet de survol animé sur les boutons
 * Utilise GSAP pour animer un élément qui suit le curseur de la souris
 *
 * @example
 * ```typescript
 * const button = new Button(document.querySelector('[data-block="button"]'));
 * // Pour nettoyer :
 * button.destroy();
 * ```
 */
export class Button {
  private block: HTMLElement;
  private DOM!: ButtonDOM;
  private xSet!: (value: number | string) => void;
  private ySet!: (value: number | string) => void;

  // Constantes pour les animations
  private readonly EDGE_THRESHOLD = 10;
  private readonly EDGE_OFFSET = 20;
  private readonly THROTTLE_DELAY = 16; // ~60fps

  // Event handlers stockés pour pouvoir les retirer
  private handleMouseEnter!: (e: MouseEvent) => void;
  private handleMouseLeave!: (e: MouseEvent) => void;
  private handleMouseMove!: (e: MouseEvent) => void;

  constructor(buttonElement: HTMLElement) {
    this.block = buttonElement;
    if (this.init()) {
      this.initEvents();
    }
  }

  /**
   * Initialise les références DOM et les setters GSAP
   * @returns true si l'initialisation réussit, false sinon
   */
  private init(): boolean {
    const hoverElement = this.block.querySelector('.button_primary_hover') as HTMLElement;

    if (!hoverElement) {
      console.error('Element .button_hover not found in button', this.block);
      return false;
    }

    this.DOM = {
      button: this.block,
      hover: hoverElement,
    };

    this.xSet = gsap.quickSetter(this.DOM.hover, 'xPercent') as (value: number | string) => void;
    this.ySet = gsap.quickSetter(this.DOM.hover, 'yPercent') as (value: number | string) => void;

    return true;
  }

  /**
   * Crée une fonction de transformation pour normaliser les coordonnées
   * @param max - Valeur maximale (width ou height)
   * @returns Fonction de transformation qui convertit en pourcentage (0-100)
   */
  private createTransformer(max: number): (value: number) => number {
    return gsap.utils.pipe(gsap.utils.mapRange(0, max, 0, 100), gsap.utils.clamp(0, 100));
  }

  /**
   * Calcule les coordonnées x,y en pourcentage (0-100)
   * basées sur la position de la souris dans le bouton
   * @param e - L'événement MouseEvent
   * @returns Coordonnées normalisées en pourcentage
   */
  private getXY(e: MouseEvent): Coordinates {
    const { left, top, width, height } = this.DOM.button.getBoundingClientRect();

    return {
      x: this.createTransformer(width)(e.clientX - left),
      y: this.createTransformer(height)(e.clientY - top),
    };
  }

  /**
   * Throttle une fonction pour limiter sa fréquence d'exécution
   * @param func - Fonction à throttler
   * @param delay - Délai minimum entre les appels en ms
   * @returns Fonction throttlée
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private throttle<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Initialise les event listeners pour les interactions souris
   */
  private initEvents(): void {
    // Handler pour l'entrée de la souris
    this.handleMouseEnter = (e: MouseEvent) => {
      const { x, y } = this.getXY(e);

      this.xSet(x);
      this.ySet(y);

      gsap.to(this.DOM.hover, {
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      });
    };

    // Handler pour la sortie de la souris
    this.handleMouseLeave = (e: MouseEvent) => {
      const { x, y } = this.getXY(e);

      gsap.killTweensOf(this.DOM.hover);

      gsap.to(this.DOM.hover, {
        xPercent:
          x > 100 - this.EDGE_THRESHOLD
            ? x + this.EDGE_OFFSET
            : x < this.EDGE_THRESHOLD
              ? x - this.EDGE_OFFSET
              : x,
        yPercent:
          y > 100 - this.EDGE_THRESHOLD
            ? y + this.EDGE_OFFSET
            : y < this.EDGE_THRESHOLD
              ? y - this.EDGE_OFFSET
              : y,
        scale: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    // Handler pour le mouvement de la souris (avec throttling)
    this.handleMouseMove = this.throttle((e: MouseEvent) => {
      const { x, y } = this.getXY(e);

      gsap.to(this.DOM.hover, {
        xPercent: x,
        yPercent: y,
        duration: 0.4,
        ease: 'power2',
      });
    }, this.THROTTLE_DELAY);

    // Ajout des event listeners
    this.DOM.button.addEventListener('mouseenter', this.handleMouseEnter);
    this.DOM.button.addEventListener('mouseleave', this.handleMouseLeave);
    this.DOM.button.addEventListener('mousemove', this.handleMouseMove);
  }

  /**
   * Nettoie les event listeners et les animations GSAP
   * À appeler quand le composant est détruit
   */
  public destroy(): void {
    if (!this.DOM) return;

    // Retirer les event listeners
    this.DOM.button.removeEventListener('mouseenter', this.handleMouseEnter);
    this.DOM.button.removeEventListener('mouseleave', this.handleMouseLeave);
    this.DOM.button.removeEventListener('mousemove', this.handleMouseMove);

    // Tuer toutes les animations en cours
    gsap.killTweensOf(this.DOM.hover);
  }
}

// Stockage des instances de Button pour pouvoir les détruire si nécessaire
const buttonInstances: Button[] = [];

/**
 * Initialise l'effet de survol sur tous les boutons avec l'attribut [data-block="button"]
 * Retourne les instances créées pour permettre un nettoyage ultérieur
 *
 * @returns Tableau des instances Button créées
 *
 * @example
 * ```typescript
 * // Initialisation
 * const instances = buttonHover();
 *
 * // Nettoyage plus tard
 * destroyAllButtons();
 * ```
 */
export function buttonHover(): Button[] {
  const buttonElements = document.querySelectorAll<HTMLElement>('[data-block="button"]');

  buttonElements.forEach((buttonElement) => {
    const instance = new Button(buttonElement);
    buttonInstances.push(instance);
  });

  return buttonInstances;
}

/**
 * Détruit toutes les instances de Button et nettoie les event listeners
 * Utile pour le cleanup lors d'un changement de page ou déchargement
 */
export function destroyAllButtons(): void {
  buttonInstances.forEach((instance) => instance.destroy());
  buttonInstances.length = 0; // Vide le tableau
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buttonHover);
} else {
  buttonHover();
}
