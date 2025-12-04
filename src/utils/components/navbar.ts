export function navbarScroll() {
  const navbar = document.querySelector('.nav_component') as HTMLElement;

  if (!navbar) {
    console.error('Navbar with class .nav_component not found');
    return;
  }

  let lastScrollY = window.scrollY;
  let scrollTimeout: number | null = null;
  const viewportHeight = window.innerHeight;

  function handleScroll() {
    const currentScrollY = window.scrollY;
    const scrollingDown = currentScrollY > lastScrollY;
    const isAbove100vh = currentScrollY > viewportHeight - 8 * 16;

    // Si on est au-dessus de 100vh et qu'on scroll vers le bas, cacher la navbar
    if (isAbove100vh && scrollingDown) {
      navbar.style.transform = 'translateY(-100%)';
    }
    // Si on scroll vers le haut, afficher la navbar
    else if (!scrollingDown) {
      navbar.style.transform = 'translateY(0%)';
    }

    lastScrollY = currentScrollY;

    // Réinitialiser le timeout
    if (scrollTimeout !== null) {
      clearTimeout(scrollTimeout);
    }

    // Après 5 secondes sans scroll, remettre la navbar à 0%
    scrollTimeout = window.setTimeout(() => {
      navbar.style.transform = 'translateY(0%)';
    }, 5000);
  }

  // Ajouter une transition CSS pour un effet fluide
  navbar.style.transition = 'transform 0.3s ease-in-out';

  // Écouter les événements de scroll
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Cleanup function pour supprimer l'événement si nécessaire
  return () => {
    window.removeEventListener('scroll', handleScroll);
    if (scrollTimeout !== null) {
      clearTimeout(scrollTimeout);
    }
  };
}
