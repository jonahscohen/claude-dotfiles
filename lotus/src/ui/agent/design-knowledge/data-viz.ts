import type { DesignKnowledgeModule } from './index';

export const dataVizKnowledge: DesignKnowledgeModule = {
  id: 'data-viz',
  title: 'Data Visualization',
  content: `Color-blind safe palette (8 colors): #2271B3 (blue), #E66100 (orange), #5D3A9B (purple), #D55E00 (vermillion), #0072B2 (cerulean), #009E73 (teal), #F0E442 (yellow), #CC79A7 (pink). Never rely on color alone -- pair with labels, patterns, or shape.
Chart type selection: bar/column for comparison, line for trends over time, area for volume trends, pie/donut only for 2-3 parts max (never more), scatter for correlation, table for exact values.
Dashboard layout: KPI summary cards at top, trend charts in the middle, detailed tables at bottom. Most important metric top-left (F-pattern reading).
Annotations: highlight key data points with labels and callout lines. Use bold for the value, regular weight for the label.
Axis labels: horizontal when possible, rotate 45deg only when necessary (long category names). Always include units. Y-axis starts at 0 for bar charts.
Grid lines: light (neutral-200), horizontal only for most charts. Remove chart border (chartjunk).`,
  modes: ['generate', 'components', 'critique'],
  priority: 9,
};
