export interface Device {
  device_id: number;
  device_name: string | null;
  device_type: string | null;
  tags: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}
