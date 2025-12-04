/**
 * Activate a Webflow tab based on URL parameter
 * Supports both search params (?tab=value) and hash params (#tab=value)
 * Example: ?tab=publications or ?tab=rapports
 */
export const tabLink = (): void => {
  const tabName = getParam('tab');

  if (!tabName) return;

  const $tab = document.querySelector<HTMLElement>(`[data-w-tab="${tabName}"]`);

  if ($tab) {
    $tab.click(); // simulate click
  }
};

/**
 * Get URL parameter from either search params or hash
 * @param name - Parameter name to retrieve
 * @returns Parameter value or empty string if not found
 */
const getParam = (name: string): string => {
  const searchParams = window.location.search;
  const hashParams = window.location.hash.replace(/^#/, '?'); // convert hash to query

  const params = searchParams || hashParams; // use search if available, else use hash

  const regex = new RegExp(`[?&]${name}=([^&#]*)`);
  const results = regex.exec(params);

  return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : '';
};
