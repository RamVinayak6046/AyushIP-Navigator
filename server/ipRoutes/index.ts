import type { Product, Jurisdiction, EvidenceItem } from '../../src/types.js';
import type { CombinedIPRouteResult } from '../types.js';

import { evaluatePatentRoute } from './patent.js';
import { evaluateTrademarkRoute } from './trademark.js';
import { evaluateGIRoute } from './gi.js';
import { evaluateCopyrightRoute } from './copyright.js';
import { evaluateDesignRoute } from './design.js';
import { evaluateTradeSecretRoute } from './tradeSecret.js';
import { evaluatePlantVarietyRoute } from './plantVariety.js';

export function evaluateAllIPRoutes(product: Product, jurisdiction: Jurisdiction, corpus: EvidenceItem[]): CombinedIPRouteResult {
  return {
    patent: evaluatePatentRoute(product, jurisdiction, corpus),
    trademark: evaluateTrademarkRoute(product, jurisdiction, corpus),
    gi: evaluateGIRoute(product, jurisdiction, corpus),
    copyright: evaluateCopyrightRoute(product, jurisdiction, corpus),
    design: evaluateDesignRoute(product, jurisdiction, corpus),
    tradeSecret: evaluateTradeSecretRoute(product, jurisdiction, corpus),
    plantVariety: evaluatePlantVarietyRoute(product, jurisdiction, corpus)
  };
}
