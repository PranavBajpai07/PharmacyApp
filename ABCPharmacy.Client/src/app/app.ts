import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
  NonNullableFormBuilder
} from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { PharmacyApi, Medicine, SaleRecord } from './pharmacy-api';

const millisecondsPerDay = 24 * 60 * 60 * 1000;

function twoDecimalPlaces(control: AbstractControl): ValidationErrors | null {
  const value = Number(control.value);

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 100) === value * 100 ? null : { decimalPlaces: true };
}

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly api = inject(PharmacyApi);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly medicines = signal<Medicine[]>([]);
  readonly sales = signal<SaleRecord[]>([]);
  readonly searchTerm = signal('');
  readonly loading = signal(false);
  readonly savingMedicine = signal(false);
  readonly recordingSale = signal(false);
  readonly message = signal('');
  readonly error = signal('');

  readonly lowStockCount = computed(
    () => this.medicines().filter((medicine) => medicine.quantity < 10).length
  );
  readonly expiringSoonCount = computed(
    () => this.medicines().filter((medicine) => this.daysUntilExpiry(medicine.expiryDate) < 30).length
  );
  readonly inventoryValue = computed(
    () => this.medicines().reduce((total, medicine) => total + medicine.quantity * medicine.price, 0)
  );
  readonly saleOptions = computed(
    () => this.medicines().filter((medicine) => medicine.quantity > 0)
  );

  readonly medicineForm = this.formBuilder.group({
    fullName: ['', [Validators.required, Validators.maxLength(160)]],
    brand: ['', [Validators.required, Validators.maxLength(120)]],
    expiryDate: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0)]],
    price: [0, [Validators.required, Validators.min(0.01), twoDecimalPlaces]],
    notes: ['', Validators.maxLength(1000)]
  });

  readonly saleForm = this.formBuilder.group({
    medicineId: ['', Validators.required],
    quantitySold: [1, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.loadMedicines();
    this.loadSales();
  }

  loadMedicines(): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getMedicines(this.searchTerm()).subscribe({
      next: (medicines) => {
        this.medicines.set(medicines);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load medicines. Start the API and try again.');
        this.loading.set(false);
      }
    });
  }

  loadSales(): void {
    this.api.getSales().subscribe({
      next: (sales) => this.sales.set(sales),
      error: () => this.error.set('Unable to load sales records.')
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.loadMedicines();
  }

  addMedicine(): void {
    this.message.set('');
    this.error.set('');

    if (this.medicineForm.invalid) {
      this.medicineForm.markAllAsTouched();
      return;
    }

    const formValue = this.medicineForm.getRawValue();
    this.savingMedicine.set(true);

    this.api.addMedicine({
      fullName: formValue.fullName.trim(),
      brand: formValue.brand.trim(),
      expiryDate: formValue.expiryDate,
      quantity: Number(formValue.quantity),
      price: Number(Number(formValue.price).toFixed(2)),
      notes: formValue.notes.trim() || null
    }).subscribe({
      next: () => {
        this.medicineForm.reset({
          fullName: '',
          brand: '',
          expiryDate: '',
          quantity: 0,
          price: 0,
          notes: ''
        });
        this.message.set('Medicine added.');
        this.savingMedicine.set(false);
        this.loadMedicines();
      },
      error: () => {
        this.error.set('Unable to add medicine. Check the form values.');
        this.savingMedicine.set(false);
      }
    });
  }

  recordSale(): void {
    this.message.set('');
    this.error.set('');

    if (this.saleForm.invalid) {
      this.saleForm.markAllAsTouched();
      return;
    }

    const formValue = this.saleForm.getRawValue();
    this.recordingSale.set(true);

    this.api.recordSale({
      medicineId: formValue.medicineId,
      quantitySold: Number(formValue.quantitySold)
    }).subscribe({
      next: () => {
        this.saleForm.reset({ medicineId: '', quantitySold: 1 });
        this.message.set('Sale recorded.');
        this.recordingSale.set(false);
        this.loadMedicines();
        this.loadSales();
      },
      error: (response) => {
        this.error.set(response?.error?.message ?? 'Unable to record sale.');
        this.recordingSale.set(false);
      }
    });
  }

  daysUntilExpiry(expiryDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(`${expiryDate}T00:00:00`);
    return Math.ceil((expiry.getTime() - today.getTime()) / millisecondsPerDay);
  }

  rowClass(medicine: Medicine): string {
    if (this.daysUntilExpiry(medicine.expiryDate) < 30) {
      return 'row-expiring';
    }

    if (medicine.quantity < 10) {
      return 'row-low-stock';
    }

    return '';
  }

  statusLabel(medicine: Medicine): string {
    if (this.daysUntilExpiry(medicine.expiryDate) < 30) {
      return 'Expiring';
    }

    if (medicine.quantity < 10) {
      return 'Low stock';
    }

    return 'Available';
  }
}
