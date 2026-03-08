import { createLoader, parseAsStringLiteral } from "nuqs/server";

export const periods = [
  "today",
  "this_week",
  "this_month",
  "this_year",
] as const;

export const dashboardSearchParams = {
  moviePeriod: parseAsStringLiteral(periods).withDefault("this_month"),
  episodePeriod: parseAsStringLiteral(periods).withDefault("this_week"),
};

export const loadDashboardSearchParams = createLoader(dashboardSearchParams);
