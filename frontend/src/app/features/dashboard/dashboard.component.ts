import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { finalize } from 'rxjs';

import { Device } from '../../core/models/device.model';
import { TimeseriesResponse } from '../../core/models/telemetry.model';
import { TelemetryApiService } from '../../core/services/telemetry-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HighchartsChartModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  readonly Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = this.createDefaultChartOptions();
  // Required by highcharts-angular to trigger option updates after async responses.
  updateFlag = false;
  readonly oneToOneFlag = true;

  devices: Device[] = [];
  selectedDeviceId: number | null = null;
  startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  startTime = this.toTimeInputValue(this.startDate);
  endDate = new Date();
  endTime = this.toTimeInputValue(this.endDate);

  loading = false;
  errorMessage = '';

  constructor(private readonly telemetryApi: TelemetryApiService) {}

  ngOnInit(): void {
    this.loadDevices();
  }

  refresh(): void {
    if (!this.selectedDeviceId || !this.startDate || !this.startTime || !this.endDate || !this.endTime) {
      this.errorMessage = 'Please select device and valid date range.';
      return;
    }

    const startTimeIso = this.toIso(this.startDate, this.startTime);
    const endTimeIso = this.toIso(this.endDate, this.endTime);
    if (!startTimeIso || !endTimeIso) {
      this.errorMessage = 'Please select a valid date range.';
      return;
    }
    if (Date.parse(startTimeIso) > Date.parse(endTimeIso)) {
      this.errorMessage = 'Start time must be before end time.';
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    this.telemetryApi
      .getTimeseries(this.selectedDeviceId, startTimeIso, endTimeIso)
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
    const metricName = this.formatMetricName(response.meta.metric_name ?? 'Metric');
    const yAxisTitle = metricName;
    const series: Highcharts.SeriesLineOptions[] = response.series
      .map((line) => {
        // Convert API points into [x, y] tuples expected by Highcharts datetime series.
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
      // Hide empty lines when selected interval has no rows for a stat.
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

  private formatMetricName(metricName: string): string {
    return metricName.replace(/_/g, ' ').toUpperCase();
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

  private toIso(date: Date | null, time: string): string | null {
    if (!date || !time) {
      return null;
    }

    const [hoursString, minutesString] = time.split(':');
    const hours = Number(hoursString);
    const minutes = Number(minutesString);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
      return null;
    }

    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    if (Number.isNaN(combined.getTime())) {
      return null;
    }

    return combined.toISOString();
  }

  private toTimeInputValue(value: Date): string {
    const hours = value.getHours().toString().padStart(2, '0');
    const minutes = value.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
