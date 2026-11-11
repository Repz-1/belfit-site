// Bandeau « nouvelle version » (11/11). En portail sur body : la barre
// de navigation anime ses parents et decalerait une position fixe.
import { createPortal } from 'preact/compat';
import { majDisponible, appliquerMiseAJour } from '../services/mise-a-jour.js';
import { t } from '../i18n/index.js';

export function BandeauMaj() {
  const v = majDisponible.value;
  if (!v) return null;
  return createPortal((
    <div class="maj-bandeau" role="status">
      <span class="maj-txt">{t('maj_dispo')}</span>
      <button type="button" class="maj-go" onClick={() => appliquerMiseAJour(v)}>{t('maj_go')}</button>
    </div>
  ), document.body);
}
