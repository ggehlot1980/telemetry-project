import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Device } from '../models/device.model';
import { RawTelemetryQuery, RawTelemetryResponse, TimeseriesResponse } from '../models/telemetry.model';

@Injectable({
  providedIn: 'root'
})
export class TelemetryApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getDevices(): Observable<Device[]> {
    return this.http.get<Device[]>(`${this.baseUrl}/devices`);
  }

  getTimeseries(deviceId: number, startTime: string, endTime: string): Observable<TimeseriesResponse> {
    const params = new HttpParams()
      .set('device_id', String(deviceId))
      .set('start_time', startTime)
      .set('end_time', endTime);
    return this.http.get<TimeseriesResponse>(`${this.baseUrl}/telemetry/timeseries`, { params });
  }

  getRawTelemetry(query: RawTelemetryQuery): Observable<RawTelemetryResponse> {
    let params = new HttpParams()
      .set('start_time', query.start_time)
      .set('end_time', query.end_time)
      .set('page', String(query.page))
      .set('page_size', String(query.page_size));

    if (query.sort_by) {
      params = params.set('sort_by', query.sort_by);
    }
    if (query.sort_dir) {
      params = params.set('sort_dir', query.sort_dir);
    }
    if (query.device_id !== undefined) {
      params = params.set('device_id', String(query.device_id));
    }
    if (query.metric_name) {
      params = params.set('metric_name', query.metric_name);
    }
    if (query.device_name) {
      params = params.set('device_name', query.device_name);
    }

    return this.http.get<RawTelemetryResponse>(`${this.baseUrl}/telemetry/raw`, { params });
  }
}
