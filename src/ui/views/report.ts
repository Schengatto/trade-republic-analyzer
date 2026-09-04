/**
 * Assembles the whole report from its sections, in reading order.
 *
 * The order is deliberate and matches the printed document: what happened
 * first, then how it was reached, then whether it can be trusted, then the
 * detail, and finally what the report does not claim to cover.
 */

import { banners } from './banner';
import {
  assetClassSection,
  holdingSection,
  topFlopSection,
  winRateSection,
} from './breakdown';
import { capitalSection } from './capital';
import { compositionSection } from './composition';
import { excludedSection } from './excluded';
import { executionSection } from './execution';
import { monthlySection } from './monthly';
import { performanceSection } from './performance';
import { openPositionsSection, securitiesSection } from './securities';
import { reconciliationSection } from './reconciliation';
import { summarySection } from './summary';
import { trendSection } from './trend';
import { windowsSection } from './windows';
import { el } from '../dom';
import { formatDateTime } from '../format';
import { section, type ReportContext, type SectionView } from './common';

const SECTIONS: SectionView[] = [
  summarySection,
  trendSection,
  compositionSection,
  excludedSection,
  reconciliationSection,
  windowsSection,
  monthlySection,
  capitalSection,
  assetClassSection,
  winRateSection,
  topFlopSection,
  holdingSection,
  performanceSection,
  executionSection,
  securitiesSection,
  openPositionsSection,
  limitsSection,
];

export function reportView(context: ReportContext, generatedAt: Date): HTMLElement {
  const { language, t } = context;

  return el('div', { class: 'report', id: 'report' }, [
    // Only visible on paper: on screen the same information is in the header.
    el('p', { class: 'print-only print-header' }, [
      t('print.generatedOn', { date: formatDateTime(language, generatedAt) }),
    ]),
    banners(context),
    ...SECTIONS.map((view) => view(context)),
    el('p', { class: 'print-only print-footer' }, [t('print.source')]),
    // The screen footer carries `.no-print`, so the page's disclaimers would
    // otherwise leave the building the moment the report did. Condensed to one
    // line: a printout that a reader hands to an accountant has to say what it
    // is not, but it does not have to spend a page saying so.
    el('p', { class: 'print-only print-footer' }, [t('print.legal')]),
  ]);
}

/**
 * What the report does not do.
 *
 * Last, and always present: a reader who takes these figures for a tax
 * calculation would be wrong in ways the numbers themselves cannot show.
 */
function limitsSection(context: ReportContext): HTMLElement {
  const { t } = context;
  return section('limits', t('limits.heading'), [
    el('ul', { class: 'limits' }, [
      el('li', {}, [t('limits.lossCarryforward')]),
      el('li', {}, [t('limits.unrealized')]),
      el('li', {}, [t('limits.brokerOnly')]),
      el('li', {}, [t('limits.currency')]),
      el('li', {}, [t('limits.marketPrices')]),
    ]),
  ]);
}

/** Exported so a test can assert every section survives an empty report. */
export const REPORT_SECTIONS = SECTIONS;
