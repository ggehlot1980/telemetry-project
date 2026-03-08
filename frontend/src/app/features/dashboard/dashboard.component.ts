import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { finalize } from 'rxjs';

import { Device } from '../../core/models/device.model';
import { TimeseriesResponse } from '../../core/models/telemetry.model';
import { TelemetryApiService } from '../../core/services/telemetry-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HighchartsChartModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  readonly Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = this.createDefaultChartOptions();
  updateFlag = false;
  readonly oneToOneFlag = true;

  devices: Device[] = [];
  selectedDeviceId: number | null = null;
  startTime = this.toDateTimeLocal(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  endTime = this.toDateTimeLocal(new Date());

  loading = false;
  errorMessage = '';

  constructor(private readonly telemetryApi: TelemetryApiService) {}

  ngOnInit(): void {
    this.loadDevices();
  }

  refresh(): void {
    if (!this.selectedDeviceId || !this.startTime || !this.endTime) {
      this.errorMessage = 'Please select device and valid date range.';
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    this.telemetryApi
      .getTimeseries(this.selectedDeviceId, this.toIso(this.startTime), this.toIso(this.endTime))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.chartOptions = this.buildChartOptions(response);
          this.updateFlag = true;
        },
        error: () => {
          this.errorMessage = 'Failed to load timeseries data.';
        }
      });
  }

  private loadDevices(): void {
    this.telemetryApi.getDevices().subscribe({
      next: (devices) => {
        this.devices = devices;
        if (devices.length > 0) {
          this.selectedDeviceId = devices[0].device_id;
          this.refresh();
        }
      },
      error: () => {
        this.errorMessage = 'Failed to load devices.';
      }
    });
  }

  private buildChartOptions(response: TimeseriesResponse): Highcharts.Options {
    const metricName = response.meta.metric_name ?? 'Metric';
    const yAxisTitle = response.meta.metric_name ?? 'Metric Value';
    const series: Highcharts.SeriesLineOptions[] = response.series
      .map((line) => {
        const data: Array<[number, number | null]> = line.points
          .map((point) => {
            const timestamp = Date.parse(point.bucket);
            const value = point.value === null ? null : Number(point.value);
            if (!Number.isFinite(timestamp) || (value !== null && !Number.isFinite(value))) {
              return null;
            }
            return [timestamp, value];
          })
          .filter((point): point is [number, number | null] => point !== null);

        return {
          type: 'line' as const,
          id: line.id,
          name: `${metricName} ${line.stat}`,
          showInLegend: true,
          data
        };
      })
      .filter((line) => line.data.length > 0);

    return {
      chart: {
        type: 'line',
        zooming: { type: 'x' }
      },
      title: {
        text: `Device ${response.meta.device_id} | ${metricName}`
      },
      subtitle: {
        text: `Source: ${response.meta.source_table} | Cache hit: ${response.meta.cache_hit}`
      },
      xAxis: {
        type: 'datetime',
        title: { text: 'Time' }
      },
      yAxis: {
        title: { text: yAxisTitle }
      },
      plotOptions: {
        series: {
          animation: false
        }
      },
      noData: {
        style: {
          fontWeight: 'normal'
        }
      },
      legend: {
        enabled: true
      },
      tooltip: {
        shared: true,
        xDateFormat: '%Y-%m-%d %H:%M:%S'
      },
      credits: { enabled: false },
      series: series.length > 0 ? series : []
    };
  }

  private createDefaultChartOptions(): Highcharts.Options {
    return {
      chart: { type: 'line' },
      title: { text: 'Telemetry Timeseries' },
      xAxis: { type: 'datetime' },
      yAxis: { title: { text: 'Metric Value' } },
      legend: { enabled: true },
      series: []
    };
  }

  private toIso(value: string): string {
    return new Date(value).toISOString();
  }

  private toDateTimeLocal(value: Date): string {
    const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return date.toISOString().slice(0, 16);
  }
}
