export interface SystemAlert {
  id: string;
  message: string;
  timestamp: Date;
}

export interface UserMetric {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface DetailedLog {
  userId: number;
  actionCount: number;
  lastActive: string;
  status: string;
}
