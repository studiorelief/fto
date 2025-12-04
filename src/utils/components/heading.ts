export function heading() {
  // Sélectionner tous les éléments heading avec la classe .heading-component
  const headings = document.querySelectorAll('.heading-component');

  if (!headings.length) {
    console.error('No elements with class .heading-component found');
    return;
  }

  headings.forEach((heading) => {
    // Trouver tous les éléments en gras (strong, b) dans heading ET ses descendants
    const boldElements = heading.querySelectorAll('strong, b');

    boldElements.forEach((boldElement) => {
      const element = boldElement as HTMLElement;

      // Récupérer le contenu texte
      const textContent = element.innerHTML;

      // Créer le span de background en position absolute
      const highlightBg = document.createElement('span');
      highlightBg.className = 'heading-highlight';
      highlightBg.setAttribute('aria-hidden', 'true');

      // Créer le span pour le texte
      const textSpan = document.createElement('span');
      textSpan.className = 'heading-text';
      textSpan.innerHTML = textContent;

      // Mettre l'élément bold en position relative
      element.style.position = 'relative';
      element.style.display = 'inline-block';

      // Vider et reconstruire la structure
      element.innerHTML = '';
      element.appendChild(highlightBg);
      element.appendChild(textSpan);
    });
  });
}
