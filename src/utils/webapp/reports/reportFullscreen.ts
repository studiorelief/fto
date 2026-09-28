/**
 * Report Fullscreen - France Tourisme Observation
 * Bouton "Plein écran" / "Fermer" injecté sur l'embed Power BI
 *
 * Utilise l'API Fullscreen du navigateur sur le container (iframe + bouton restent visibles).
 * Fallback CSS (.is-fullscreen) pour les navigateurs sans support (Safari iPhone).
 */

const BUTTON_CLASS = 'report_fullscreen-button';
const FALLBACK_CLASS = 'is-fullscreen';

const ICON_EXPAND =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>';
const ICON_CLOSE =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';

let listenersInitialized = false;

/**
 * Ajoute le bouton plein écran au container de l'embed (idempotent :
 * le SDK Power BI réécrit le contenu du container à chaque nouvel embed)
 */
export function initReportFullscreen(container: HTMLElement): void {
  if (!container.querySelector(`.${BUTTON_CLASS}`)) {
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    button.addEventListener('click', () => toggleFullscreen(container));
    container.appendChild(button);
  }

  updateButton(container);
  initGlobalListeners(container);
}

function isFullscreen(container: HTMLElement): boolean {
  return document.fullscreenElement === container || container.classList.contains(FALLBACK_CLASS);
}

function toggleFullscreen(container: HTMLElement): void {
  if (isFullscreen(container)) {
    exitFullscreen(container);
  } else {
    enterFullscreen(container);
  }
}

function enterFullscreen(container: HTMLElement): void {
  if (document.fullscreenEnabled && container.requestFullscreen) {
    container.requestFullscreen().catch(() => setFallback(container, true));
  } else {
    setFallback(container, true);
  }
}

function exitFullscreen(container: HTMLElement): void {
  if (document.fullscreenElement === container) {
    document.exitFullscreen();
  } else {
    setFallback(container, false);
  }
}

function setFallback(container: HTMLElement, active: boolean): void {
  container.classList.toggle(FALLBACK_CLASS, active);
  document.documentElement.style.overflow = active ? 'hidden' : '';
  updateButton(container);
}

function updateButton(container: HTMLElement): void {
  const button = container.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
  if (!button) return;

  const active = isFullscreen(container);
  const label = active ? 'Fermer' : 'Plein écran';
  button.innerHTML = `${active ? ICON_CLOSE : ICON_EXPAND}<span>${label}</span>`;
  button.setAttribute('aria-label', active ? 'Quitter le plein écran' : 'Afficher en plein écran');
}

function initGlobalListeners(container: HTMLElement): void {
  if (listenersInitialized) return;
  listenersInitialized = true;

  // Sortie native (touche Échap, geste navigateur) → mettre à jour le bouton
  document.addEventListener('fullscreenchange', () => updateButton(container));

  // Échap pour le mode fallback
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains(FALLBACK_CLASS)) {
      setFallback(container, false);
    }
  });
}
