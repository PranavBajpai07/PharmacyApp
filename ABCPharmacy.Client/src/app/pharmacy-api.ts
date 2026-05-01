import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

const apiBaseUrl = 'http://localhost:5178/api';

export interface Medicine {
  id: string;
  fullName: string;
  expiryDate: string;
  quantity: number;
  price: number;
  brand: string;
}

export interface MedicineCreateRequest {
  fullName: string;
  notes?: string | null;
  expiryDate: string;
  quantity: number;
  price: number;
  brand: string;
}

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

  addMedicine(request: MedicineCreateRequest) {
    return this.http.post<Medicine>(`${apiBaseUrl}/medicines`, request);
  }

  getSales() {
    return this.http.get<SaleRecord[]>(`${apiBaseUrl}/sales`);
  }

  recordSale(request: SaleCreateRequest) {
    return this.http.post<SaleRecord>(`${apiBaseUrl}/sales`, request);
  }
}
