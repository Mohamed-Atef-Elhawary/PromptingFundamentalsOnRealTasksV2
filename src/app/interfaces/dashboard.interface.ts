export interface MetricItem {
  id: string;
  name: string;
  category: string;
  value: number;
  status: 'critical' | 'stable' | 'warning';
  timestamp: string;
}

export interface DashboardState {
  metrics: MetricItem[];
  loading: boolean;
  error: string | null;
}
