import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';

const apiBaseUrl = environment.apiBaseUrl;

export interface Medicine {
  id: string;
  fullName: string;
  expiryDate: string;
  quantity: number;
  price: number;
  brand: string;
}

export interface MedicineDetails extends Medicine {
  notes: string | null;
}

export interface MedicineCreateRequest {
  fullName: string;
  notes?: string | null;
  expiryDate: string;
  quantity: number;
  price: number;
  brand: string;
}

export type MedicineUpdateRequest = MedicineCreateRequest;

export interface SaleRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  brand: string;
  quantitySold: number;
  unitPrice: number;
  totalPrice: number;
  soldAt: string;
}

export interface SaleCreateRequest {
  medicineId: string;
  quantitySold: number;
}

@Injectable({ providedIn: 'root' })
export class PharmacyApi {
  private readonly http = inject(HttpClient);

  getMedicines(search = '') {
    const params = search.trim()
      ? new HttpParams().set('search', search.trim())
      : undefined;

    return this.http.get<Medicine[]>(`${apiBaseUrl}/medicines`, { params });
  }

  getMedicine(id: string) {
    return this.http.get<MedicineDetails>(`${apiBaseUrl}/medicines/${id}`);
  }

  addMedicine(request: MedicineCreateRequest) {
    return this.http.post<MedicineDetails>(`${apiBaseUrl}/medicines`, request);
  }

  updateMedicine(id: string, request: MedicineUpdateRequest) {
    return this.http.put<MedicineDetails>(`${apiBaseUrl}/medicines/${id}`, request);
  }

  deleteMedicine(id: string) {
    return this.http.delete<void>(`${apiBaseUrl}/medicines/${id}`);
  }

  getSales() {
    return this.http.get<SaleRecord[]>(`${apiBaseUrl}/sales`);
  }

  recordSale(request: SaleCreateRequest) {
    return this.http.post<SaleRecord>(`${apiBaseUrl}/sales`, request);
  }
}
