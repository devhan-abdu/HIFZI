import {
  PerformanceSummary,
  calculatePerformanceSummary,
  getSamplePerformanceSummary,
} from "./performanceEngine";

export type PlanSuggestion = {
  hifzAdjustment: "increase" | "decrease" | "keep";
  murajaPriority: "high" | "medium" | "low";
  focusPages?: number[];
};

export function createPlanSuggestion(summary: PerformanceSummary): PlanSuggestion {
  let hifzAdjustment: PlanSuggestion["hifzAdjustment"] = "keep";
  let murajaPriority: PlanSuggestion["murajaPriority"] = "medium";

  if (summary.completionRate > 80) {
    hifzAdjustment = "increase";
    murajaPriority = "low";
  } else if (summary.completionRate < 50) {
    hifzAdjustment = "decrease";
    murajaPriority = "high";
  }

  const suggestion: PlanSuggestion = {
    hifzAdjustment,
    murajaPriority,
  };

  if (summary.missedPages.length > 0) {
    suggestion.focusPages = summary.missedPages;
    if (murajaPriority === "low") {
      suggestion.murajaPriority = "medium";
    }
  }

  return suggestion;
}

export function createPlanFromRawPerformanceInput(input: {
  completedDates: string[];
  missedPageRanges: Array<{ startPage: number; endPage: number }>;
  expectedDays: number;
  untilDate: string;
}) {
  const summary = calculatePerformanceSummary(input);
  const suggestion = createPlanSuggestion(summary);
  return { summary, suggestion };
}

export function getSamplePlanSuggestion() {
  const summary = getSamplePerformanceSummary();
  const suggestion = createPlanSuggestion(summary);
  return { summary, suggestion };
}
