export interface TimeseriesPoint {
  bucket: string;
  value: number | null;
}

export interface TimeseriesSeries {
  id: string;
  stat: 'min' | 'max' | 'avg';
  points: TimeseriesPoint[];
}

export interface TimeseriesResponse {
  meta: {
    device_id: number;
    start_time: string;
    end_time: string;
    source_table: string;
    expected_bucket_count: number;
    bucket_count: number;
    cache_hit: boolean;
    metric_name: string | null;
  };
  series: TimeseriesSeries[];
}

export interface RawTelemetryRow {
  device_name: string | null;
  metric_name: string;
  metric_value: number | null;
  timestamp: string;
  attributes: Record<string, unknown> | null;
}

export interface RawTelemetryResponse {
  rows: RawTelemetryRow[];
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
}

export interface RawTelemetryQuery {
  start_time: string;
  end_time: string;
  page: number;
  page_size: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  device_id?: number;
  metric_name?: string;
  device_name?: string;
}
