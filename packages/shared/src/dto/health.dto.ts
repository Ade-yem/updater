type HealthStatus = "ok" | "degraded" | "down";

type HealthCheck = {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  lastCheckedAt?: string;
};

export type HealthResponse = {
  status: HealthStatus;
  timestamp: string;
  service: string;
  version?: string;
  environment?: string;
  uptimeSeconds?: number;
  checks?: HealthCheck[];
};