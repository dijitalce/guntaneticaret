import type { PlanArticle } from "./blog-plan-types";
import { PLAN_ARTICLES_1 } from "./blog-plan-articles-1";
import { PLAN_ARTICLES_2 } from "./blog-plan-articles-2";
import { PLAN_ARTICLES_3 } from "./blog-plan-articles-3";
import { PLAN_ARTICLES_4 } from "./blog-plan-articles-4";
import { PLAN_EXTRA_1 } from "./blog-plan-extra-1";
import { PLAN_EXTRA_1B } from "./blog-plan-extra-1b";
import { PLAN_EXTRA_2 } from "./blog-plan-extra-2";
import { PLAN_EXTRA_2B } from "./blog-plan-extra-2b";
import { PLAN_EXTRA_3 } from "./blog-plan-extra-3";
import { PLAN_EXTRA_3B } from "./blog-plan-extra-3b";
import { PLAN_EXTRA_4 } from "./blog-plan-extra-4";
import { PLAN_EXTRA_4B } from "./blog-plan-extra-4b";

type Sections = Record<string, [string, string][]>;

/** Ek bölümler, ilgili yazının ana bölümlerinin sonuna sırayla eklenir. */
const EXTRAS: Sections[] = [PLAN_EXTRA_1, PLAN_EXTRA_1B, PLAN_EXTRA_2, PLAN_EXTRA_2B, PLAN_EXTRA_3, PLAN_EXTRA_3B, PLAN_EXTRA_4, PLAN_EXTRA_4B];

const BASE: Record<string, PlanArticle> = { ...PLAN_ARTICLES_1, ...PLAN_ARTICLES_2, ...PLAN_ARTICLES_3, ...PLAN_ARTICLES_4 };

export const PLAN_ARTICLES: Record<string, PlanArticle> = Object.fromEntries(
  Object.entries(BASE).map(([id, a]) => [id, { ...a, sections: [...a.sections, ...EXTRAS.flatMap((e) => e[id] ?? [])] }]),
);
