import './index.css';

import { homeHeroScroll } from '$utils/animations/homeHeroScroll';
import { logoRotationScroll } from '$utils/animations/logoAnimation';
import { authSide } from '$utils/components/auth';
import { buttonHover } from '$utils/components/button';
import { filterMobile } from '$utils/components/filterMobile';
import { heading } from '$utils/components/heading';
import { navbarScroll } from '$utils/components/navbar';
import { navMobile } from '$utils/components/navbarMobile';
import { copyUrl } from '$utils/components/share';
import { loadAttributesScripts } from '$utils/global/loadScript';
import { initMarker } from '$utils/global/marker';
import { projectLink } from '$utils/page/home/projectLink';
import { tabLink } from '$utils/webapp/tabLink';

window.Webflow ||= [];
window.Webflow.push(() => {
  /* Global */
  initMarker();
  loadAttributesScripts();

  /* Components */
  heading();
  buttonHover();
  filterMobile();
  navbarScroll();
  navMobile();
  authSide();
  copyUrl();

  /* Animations */
  homeHeroScroll();
  logoRotationScroll();

  /* Page */
  projectLink();

  /* Web App */
  tabLink();
});
