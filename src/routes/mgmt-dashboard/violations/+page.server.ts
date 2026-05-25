import {
  getViolationAnalytics,
  isViolationGroupBy,
  isViolationTimeframe,
  violationGroupings,
  violationTimeframes,
  type ViolationGroupBy,
  type ViolationTimeframe
} from '$lib/server/incidents/violation-analytics';

const defaultGroupForTimeframe = (timeframe: ViolationTimeframe): ViolationGroupBy =>
  timeframe === '12m' || timeframe === 'all' ? 'month' : 'day';

export const load = async ({ url }: { url: URL }) => {
  const timeframeParam = url.searchParams.get('timeframe');
  const groupByParam = url.searchParams.get('groupBy');
  const timeframe = isViolationTimeframe(timeframeParam) ? timeframeParam : '30d';
  const groupBy = isViolationGroupBy(groupByParam) ? groupByParam : defaultGroupForTimeframe(timeframe);

  try {
    return {
      analytics: await getViolationAnalytics({ timeframe, groupBy }),
      filters: {
        timeframe,
        groupBy,
        timeframes: Object.entries(violationTimeframes).map(([value, config]) => ({ value, label: config.label })),
        groupings: Object.entries(violationGroupings).map(([value, config]) => ({ value, label: config.label }))
      },
      dbError: null
    };
  } catch (loadError) {
    console.error('[mgmt-dashboard/violations] failed to load violation analytics', loadError);
    return {
      analytics: {
        summaries: [],
        recentIncidents: [],
        dailyBuckets: [],
        knownViolations: [],
        timeframe,
        groupBy,
        timeframeLabel: violationTimeframes[timeframe].label,
        groupByLabel: violationGroupings[groupBy].label,
        generatedAt: new Date().toISOString()
      },
      filters: {
        timeframe,
        groupBy,
        timeframes: Object.entries(violationTimeframes).map(([value, config]) => ({ value, label: config.label })),
        groupings: Object.entries(violationGroupings).map(([value, config]) => ({ value, label: config.label }))
      },
      dbError: 'Database is unavailable. Check DATABASE_URL and Postgres connectivity.'
    };
  }
};
