/**
 * Update project link for each card
 * For each .home_projects_cards[id], update its child .home_projects_link href with /projets#{id}
 * Handles dynamically loaded Webflow collection items
 */
export const projectLink = (): void => {
  const updateLinks = (): void => {
    const cards = document.querySelectorAll<HTMLElement>('.home_projects_cards[id]');

    cards.forEach((card) => {
      const link = card.querySelector<HTMLAnchorElement>('.home_projects_link');
      const name = card.id;

      if (link && name) {
        link.href = `/projets#${name}`;
      }
    });
  };

  // Initial update
  updateLinks();

  // Watch for dynamically added cards (Webflow collections)
  const observer = new MutationObserver(() => {
    updateLinks();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};
