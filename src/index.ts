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
// WebApp - Auth & API
import { initAuthForm, initAuthGuard } from '$utils/webapp/auth';
import { initPasswordToggle } from '$utils/webapp/auth/passwordToggle';
import { initSlideLoginReset } from '$utils/webapp/front/slideLoginReset';
import { tabLink } from '$utils/webapp/front/tabLink';
import { initReportDetail, initReportsDisplay } from '$utils/webapp/reports';

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
  initAuthForm();
  initPasswordToggle(); // Toggle visibilité des mots de passe
  initAuthGuard(); // Vérifie l'auth sur les pages protégées
  initSlideLoginReset(); // Animation slide login ↔ reset
  initReportsDisplay(); // Liste des rapports Power BI
  initReportDetail(); // Détail d'un rapport Power BI
});
