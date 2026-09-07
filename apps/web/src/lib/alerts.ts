/**
 * Sentinel NER — Stage 9 Alerting, Notification Delivery & Degraded Connectivity Client
 * Authoritative types, API methods, and client-side bounded offline operations queue.
 */

import { fetchFromAPI } from './api';

export type AlertStatus =
  | 'QUEUED'
  | 'DISPATCHING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'FAILED'
  | 'DELIVERY_FAILED'
  | 'EXPIRED';

export type DeliveryChannel = 'SMS' | 'EMAIL' | 'PUSH' | 'WEB_NOTIFICATION';

export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProviderCapabilityStatus =
  | 'CONFIGURED'
  | 'NOT_CONFIGURED'
  | 'DISABLED'
  | 'DEGRADED'
  | 'FAILED';

export type ConnectivityState = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'RECOVERING';

export type FreshnessState = 'CURRENT' | 'STALE' | 'UNKNOWN';

export type OperationType = 'ALERT_ACKNOWLEDGE' | 'OFFLINE_PING';

export type OperationStatus =
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'FAILED'
  | 'CONFLICT'
  | 'EXPIRED';

export interface Alert {
  id: string;
  warning_id: string;
  action_id?: string | null;
  recipient_id: string;
  recipient_name: string;
  channel: DeliveryChannel;
  contact_target_masked: string;
  priority: AlertPriority;
  payload_reference?: {
    headline?: string;
    body?: string;
    mizo_translation?: string;
    hindi_translation?: string;
    district_id?: string;
    affected_entity_type?: string;
    affected_entity_id?: string;
  };
  status: AlertStatus;
  provider: string;
  provider_status: ProviderCapabilityStatus;
  provider_message_id?: string | null;
  attempt_count: number;
  max_retries: number;
  created_at: string;
  queued_at: string;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  acknowledged_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
  expires_at: string;
  correlation_id: string;
  district_id: string;
  organization_id: string;
  idempotency_key?: string | null;
}

export interface AlertSummary {
  total_alerts: number;
  queued_count: number;
  dispatching_count: number;
  dispatched_count: number;
  delivered_count: number;
  acknowledged_count: number;
  failed_count: number;
  expired_count: number;
  district_id?: string | null;
  generated_at: string;
}

export interface ConnectivityStatus {
  connectivity_state: ConnectivityState;
  server_timestamp: string;
  authoritative_source: string;
  freshness_state: FreshnessState;
  last_synced_at: string;
  database_healthy: boolean;
  database_latency_ms?: number | null;
  details: string;
}

export interface OfflineSyncOperation {
  operation_id: string;
  created_at: string;
  operation_type: OperationType;
  payload: Record<string, any>;
  client_timestamp: string;
  status: OperationStatus;
  attempt_count: number;
  last_error?: string | null;
  idempotency_key: string;
}

export interface OfflineSyncResponse {
  batch_id: string;
  processed_count: number;
  synced_count: number;
  conflict_count: number;
  failed_count: number;
  results: Array<{
    operation_id: string;
    status: OperationStatus;
    reconciled_at: string;
    message: string;
    conflict_details?: Record<string, any>;
  }>;
  server_timestamp: string;
  freshness_state: FreshnessState;
}


export async function fetchAlerts(params?: {
  district_id?: string;
  warning_id?: string;
  status?: AlertStatus;
  page?: number;
  limit?: number;
}): Promise<{ items: Alert[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.district_id) query.set('district_id', params.district_id);
  if (params?.warning_id) query.set('warning_id', params.warning_id);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const queryStr = query.toString() ? `?${query.toString()}` : '';
  const res = await fetchFromAPI<{ data: { items: Alert[]; total: number } }>(`/api/v1/alerts${queryStr}`);
  return res.data;
}

export async function fetchAlertsSummary(district_id?: string): Promise<AlertSummary> {
  const queryStr = district_id ? `?district_id=${district_id}` : '';
  const res = await fetchFromAPI<{ data: AlertSummary }>(`/api/v1/alerts/summary${queryStr}`);
  return res.data;
}

export async function acknowledgeAlert(
  alertId: string,
  recipientId: string,
  method: string = 'WEB',
  notes?: string
): Promise<Alert> {
  const res = await fetchFromAPI<{ data: Alert }>(`/api/v1/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({
      recipient_id: recipientId,
      method,
      notes,
    }),
  });
  return res.data;
}

export async function retryAlert(alertId: string, reason: string): Promise<Alert> {
  const res = await fetchFromAPI<{ data: Alert }>(`/api/v1/alerts/${alertId}/retry`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

export async function checkConnectivityStatus(): Promise<ConnectivityStatus> {
  const res = await fetchFromAPI<{ data: ConnectivityStatus }>('/api/v1/connectivity/status');
  return res.data;
}

export async function reconcileOfflineBatch(
  operations: OfflineSyncOperation[]
): Promise<OfflineSyncResponse> {
  const clientId =
    (typeof window !== 'undefined' && localStorage.getItem('sentinel_client_id')) ||
    `cli-${Math.random().toString(36).substring(2, 10)}`;

  const res = await fetchFromAPI<{ data: OfflineSyncResponse }>('/api/v1/sync/reconcile', {
    method: 'POST',
    body: JSON.stringify({
      client_id: clientId,
      operations,
    }),
  });
  return res.data;
}

// Bounded Client Offline Queue Manager
const OFFLINE_QUEUE_KEY = 'sentinel_offline_ops_queue';
const MAX_OFFLINE_OPS = 50;

export class OfflineQueueManager {
  static getQueue(): OfflineSyncOperation[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static enqueue(
    type: OperationType,
    payload: Record<string, any>,
    idempotencyKey?: string
  ): OfflineSyncOperation {
    if (typeof window === 'undefined') throw new Error('Offline queue unavailable in SSR');
    const queue = this.getQueue();
    if (queue.length >= MAX_OFFLINE_OPS) {
      throw new Error(`Offline operation queue limit (${MAX_OFFLINE_OPS}) exceeded. Please sync before continuing.`);
    }

    const op: OfflineSyncOperation = {
      operation_id: `op-${Math.random().toString(36).substring(2, 10)}`,
      created_at: new Date().toISOString(),
      operation_type: type,
      payload,
      client_timestamp: new Date().toISOString(),
      status: 'PENDING',
      attempt_count: 0,
      idempotency_key: idempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };

    queue.push(op);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return op;
  }

  static enqueueAcknowledge(
    alertId: string,
    recipientId: string,
    method: string = 'FIELD_TERMINAL',
    notes?: string
  ): OfflineSyncOperation {
    return this.enqueue(
      'ALERT_ACKNOWLEDGE',
      {
        alert_id: alertId,
        recipient_id: recipientId,
        method,
        notes: notes || 'Queued offline on field terminal',
      },
      `ack-${alertId}-${recipientId}`
    );
  }

  static clearQueue(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }
  }

  static async sync(): Promise<OfflineSyncResponse | null> {
    const queue = this.getQueue();
    if (queue.length === 0) return null;

    const res = await reconcileOfflineBatch(queue);

    // Keep only failed or conflict items for operator review; remove SYNCED items
    const remaining = queue.filter(q => {
      const result = res.results.find(r => r.operation_id === q.operation_id);
      return result && result.status !== 'SYNCED';
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    }
    return res;
  }
}
