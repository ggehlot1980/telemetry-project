import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, SortChangedEvent } from 'ag-grid-community';
import { finalize } from 'rxjs';

import { Device } from '../../core/models/device.model';
import { RawTelemetryRow } from '../../core/models/telemetry.model';
import { TelemetryApiService } from '../../core/services/telemetry-api.service';

@Component({
  selector: 'app-raw-telemetry',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './raw-telemetry.component.html',
  styleUrl: './raw-telemetry.component.css'
})
export class RawTelemetryComponent implements OnInit {
  readonly pageSize = 50;

  devices: Device[] = [];
  selectedDeviceId?: number;
  metricName = '';
  deviceNameFilter = '';

  startTime = this.toDateTimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000));
  endTime = this.toDateTimeLocal(new Date());

  rowData: RawTelemetryRow[] = [];
  loading = false;
  errorMessage = '';

  page = 1;
  totalPages = 0;
  totalRows = 0;

  sortBy = 'timestamp';
  sortDir: 'asc' | 'desc' = 'desc';

  private gridApi?: GridApi<RawTelemetryRow>;

  columnDefs: ColDef<RawTelemetryRow>[] = [
    { field: 'device_name', headerName: 'Device Name', sortable: true, filter: true, minWidth: 140 },
    { field: 'metric_name', headerName: 'Metric Name', sortable: true, filter: true, minWidth: 130 },
    { field: 'metric_value', headerName: 'Metric Value', sortable: true, filter: 'agNumberColumnFilter', minWidth: 120 },
    { field: 'timestamp', headerName: 'Timestamp', sortable: true, filter: 'agDateColumnFilter', minWidth: 190 },
    {
      field: 'attributes',
      headerName: 'Attributes',
      sortable: false,
      filter: true,
      minWidth: 240,
      valueFormatter: (params) => JSON.stringify(params.value ?? {})
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    floatingFilter: true
  };

  constructor(private readonly telemetryApi: TelemetryApiService) {}

  ngOnInit(): void {
    this.loadDevices();
  }

  onGridReady(event: GridReadyEvent<RawTelemetryRow>): void {
    this.gridApi = event.api;
    this.loadRows();
  }

  onSortChanged(event: SortChangedEvent<RawTelemetryRow>): void {
    const sortedColumn = event.api
      .getColumnState()
      .find((col) => !!col.sort && ['device_name', 'metric_name', 'metric_value', 'timestamp'].includes(col.colId));

    if (sortedColumn?.sort) {
      this.sortBy = sortedColumn.colId;
      this.sortDir = sortedColumn.sort;
      this.page = 1;
      this.loadRows();
    }
  }

  refresh(): void {
    this.page = 1;
    this.loadRows();
  }

  previousPage(): void {
    if (this.page <= 1) {
      return;
    }
    this.page -= 1;
    this.loadRows();
  }

  nextPage(): void {
    if (this.page >= this.totalPages) {
      return;
    }
    this.page += 1;
    this.loadRows();
  }

  private loadDevices(): void {
    this.telemetryApi.getDevices().subscribe({
      next: (devices) => {
        this.devices = devices;
      }
    });
  }

  private loadRows(): void {
    this.errorMessage = '';
    this.loading = true;

    this.telemetryApi
      .getRawTelemetry({
        page: this.page,
        page_size: this.pageSize,
        start_time: this.toIso(this.startTime),
        end_time: this.toIso(this.endTime),
        sort_by: this.sortBy,
        sort_dir: this.sortDir,
        device_id: this.selectedDeviceId,
        metric_name: this.metricName || undefined,
        device_name: this.deviceNameFilter || undefined
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.rowData = response.rows;
          this.totalPages = response.total_pages;
          this.totalRows = response.total_rows;
          this.page = response.page;
          this.gridApi?.setGridOption('rowData', this.rowData);
        },
        error: () => {
          this.errorMessage = 'Failed to load raw telemetry.';
        }
      });
  }

  private toIso(value: string): string {
    return new Date(value).toISOString();
  }

  private toDateTimeLocal(value: Date): string {
    const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return date.toISOString().slice(0, 16);
  }
}
