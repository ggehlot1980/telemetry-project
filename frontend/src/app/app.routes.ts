import { Routes } from '@angular/router';

import { DashboardComponent } from './features/dashboard/dashboard.component';
import { RawTelemetryComponent } from './features/raw-telemetry/raw-telemetry.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: DashboardComponent },
  { path: 'raw-telemetry', component: RawTelemetryComponent }
];
