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
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, SortChangedEvent } from 'ag-grid-community';
import { finalize } from 'rxjs';

import { Device } from '../../core/models/device.model';
import { RawTelemetryRow } from '../../core/models/telemetry.model';
import { TelemetryApiService } from '../../core/services/telemetry-api.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-raw-telemetry',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './raw-telemetry.component.html',
  styleUrl: './raw-telemetry.component.css'
})
export class RawTelemetryComponent implements OnInit {
  readonly pageSize = 50;
  // Number of page buttons shown around the current page.
  readonly pageWindowSize = 7;

  devices: Device[] = [];
  selectedDeviceId?: number;
  metricName = '';
  deviceNameFilter = '';

  startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  startTime = this.toTimeInputValue(this.startDate);
  endDate = new Date();
  endTime = this.toTimeInputValue(this.endDate);

  rowData: RawTelemetryRow[] = [];
  loading = false;
  errorMessage = '';

  page = 1;
  pageJumpValue: number | null = null;
  totalPages = 0;
  totalRows = 0;

  sortBy = 'timestamp';
  sortDir: 'asc' | 'desc' = 'desc';

  private gridApi?: GridApi<RawTelemetryRow>;

  columnDefs: ColDef<RawTelemetryRow>[] = [
    { field: 'device_name', headerName: 'Device Name', sortable: true, filter: true, minWidth: 140, flex: 1.1 },
    { field: 'metric_name', headerName: 'Metric Name', sortable: true, filter: true, minWidth: 130, flex: 1 },
    {
      field: 'metric_value',
      headerName: 'Metric Value',
      sortable: true,
      filter: 'agNumberColumnFilter',
      minWidth: 120,
      flex: 1
    },
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      sortable: true,
      filter: 'agDateColumnFilter',
      minWidth: 190,
      flex: 1.3
    },
    {
      field: 'attributes',
      headerName: 'Attributes',
      sortable: false,
      filter: true,
      minWidth: 240,
      flex: 2.2,
      valueFormatter: (params) => JSON.stringify(params.value ?? {})
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    flex: 1,
    floatingFilter: true
  };

  constructor(
    private readonly telemetryApi: TelemetryApiService,
    readonly themeService: ThemeService
  ) {}

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
    this.goToPage(this.page - 1);
  }

  nextPage(): void {
    this.goToPage(this.page + 1);
  }

  firstPage(): void {
    this.goToPage(1);
  }

  lastPage(): void {
    if (this.totalPages > 0) {
      this.goToPage(this.totalPages);
    }
  }

  jumpToPage(): void {
    if (this.pageJumpValue === null || this.pageJumpValue === undefined) {
      return;
    }
    if (!Number.isFinite(this.pageJumpValue)) {
      return;
    }

    const requestedPage = Math.trunc(this.pageJumpValue);
    const maxPage = Math.max(this.totalPages, 1);
    // Clamp page input to valid bounds to avoid empty/server-invalid requests.
    const boundedPage = Math.max(1, Math.min(requestedPage, maxPage));
    this.pageJumpValue = boundedPage;
    this.goToPage(boundedPage);
  }

  goToPage(targetPage: number): void {
    if (!Number.isFinite(targetPage)) {
      return;
    }

    const maxPage = Math.max(this.totalPages, 1);
    const boundedPage = Math.max(1, Math.min(Math.trunc(targetPage), maxPage));
    if (boundedPage === this.page) {
      return;
    }
    this.page = boundedPage;
    this.loadRows();
  }

  get visiblePages(): number[] {
    const maxPage = Math.max(this.totalPages, 1);
    const halfWindow = Math.floor(this.pageWindowSize / 2);

    // Create a sliding page window centered on the current page when possible.
    let start = Math.max(1, this.page - halfWindow);
    let end = Math.min(maxPage, start + this.pageWindowSize - 1);
    start = Math.max(1, end - this.pageWindowSize + 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
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

    const startTimeIso = this.toIso(this.startDate, this.startTime);
    const endTimeIso = this.toIso(this.endDate, this.endTime);

    if (!startTimeIso || !endTimeIso) {
      this.loading = false;
      this.errorMessage = 'Please provide a valid date range.';
      return;
    }
    if (Date.parse(startTimeIso) > Date.parse(endTimeIso)) {
      this.loading = false;
      this.errorMessage = 'Start time must be before end time.';
      return;
    }

    this.telemetryApi
      .getRawTelemetry({
        page: this.page,
        page_size: this.pageSize,
        start_time: startTimeIso,
        end_time: endTimeIso,
        sort_by: this.sortBy,
        sort_dir: this.sortDir,
        device_id: this.selectedDeviceId,
        metric_name: this.metricName || undefined,
        device_name: this.deviceNameFilter || undefined
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          // Backend is the source of truth for page metadata after each request.
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
