export type ReviewPriority = "high" | "medium" | "low";

export function getReviewPriorityColor(priority: ReviewPriority) {
  if (priority === "high") {
    return {
      badge: "bg-red-100",
      text: "text-red-700",
      dot: "#ef4444",
    };
  }
  if (priority === "medium") {
    return {
      badge: "bg-amber-100",
      text: "text-amber-700",
      dot: "#f59e0b",
    };
  }
  return {
    badge: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "#10b981",
  };
}
