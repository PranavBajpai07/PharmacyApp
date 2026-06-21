import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
  NonNullableFormBuilder
} from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PharmacyApi, Medicine, SaleRecord } from './pharmacy-api';

const millisecondsPerDay = 24 * 60 * 60 * 1000;

function twoDecimalPlaces(control: AbstractControl): ValidationErrors | null {
  const value = Number(control.value);

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 100) === value * 100 ? null : { decimalPlaces: true };
}

type MedicineFormControlName = 'fullName' | 'brand' | 'expiryDate' | 'quantity' | 'price' | 'notes';
type SaleFormControlName = 'medicineId' | 'quantitySold';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private readonly api = inject(PharmacyApi);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private searchDebounceId: number | undefined;

  readonly medicines = signal<Medicine[]>([]);
  readonly sales = signal<SaleRecord[]>([]);
  readonly searchTerm = signal('');
  readonly loading = signal(false);
  readonly savingMedicine = signal(false);
  readonly recordingSale = signal(false);
  readonly editingMedicineId = signal<string | null>(null);
  readonly deletingMedicineId = signal<string | null>(null);
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

  ngOnDestroy(): void {
    window.clearTimeout(this.searchDebounceId);
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
    window.clearTimeout(this.searchDebounceId);
    this.searchDebounceId = window.setTimeout(() => this.loadMedicines(), 300);
  }

  saveMedicine(): void {
    this.message.set('');
    this.error.set('');

    if (this.medicineForm.invalid) {
      this.medicineForm.markAllAsTouched();
      return;
    }

    const formValue = this.medicineForm.getRawValue();
    const editingId = this.editingMedicineId();
    this.savingMedicine.set(true);

    const request = {
      fullName: formValue.fullName.trim(),
      brand: formValue.brand.trim(),
      expiryDate: formValue.expiryDate,
      quantity: Number(formValue.quantity),
      price: Number(Number(formValue.price).toFixed(2)),
      notes: formValue.notes.trim() || null
    };
    const saveRequest = editingId
      ? this.api.updateMedicine(editingId, request)
      : this.api.addMedicine(request);

    saveRequest.subscribe({
      next: () => {
        this.resetMedicineForm();
        this.message.set(editingId ? 'Medicine updated.' : 'Medicine added.');
        this.savingMedicine.set(false);
        this.loadMedicines();
      },
      error: (response: unknown) => {
        this.error.set(this.problemMessage(response, 'Unable to save medicine. Check the form values.'));
        this.savingMedicine.set(false);
      }
    });
  }

  startEdit(medicine: Medicine): void {
    this.message.set('');
    this.error.set('');

    this.api.getMedicine(medicine.id).subscribe({
      next: (details) => {
        this.editingMedicineId.set(details.id);
        this.medicineForm.reset({
          fullName: details.fullName,
          brand: details.brand,
          expiryDate: details.expiryDate,
          quantity: details.quantity,
          price: details.price,
          notes: details.notes ?? ''
        });
      },
      error: (response: unknown) => {
        this.error.set(this.problemMessage(response, 'Unable to load medicine details.'));
      }
    });
  }

  cancelEdit(): void {
    this.resetMedicineForm();
  }

  deleteMedicine(medicine: Medicine): void {
    this.message.set('');
    this.error.set('');

    if (!window.confirm(`Delete ${medicine.fullName}? This removes it from inventory.`)) {
      return;
    }

    this.deletingMedicineId.set(medicine.id);

    this.api.deleteMedicine(medicine.id).subscribe({
      next: () => {
        if (this.editingMedicineId() === medicine.id) {
          this.resetMedicineForm();
        }

        if (this.saleForm.controls.medicineId.value === medicine.id) {
          this.saleForm.reset({ medicineId: '', quantitySold: 1 });
        }

        this.message.set('Medicine deleted.');
        this.deletingMedicineId.set(null);
        this.loadMedicines();
      },
      error: (response: unknown) => {
        this.error.set(this.problemMessage(response, 'Unable to delete medicine.'));
        this.deletingMedicineId.set(null);
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
      error: (response: unknown) => {
        this.error.set(this.problemMessage(response, 'Unable to record sale.'));
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
    const daysUntilExpiry = this.daysUntilExpiry(medicine.expiryDate);

    if (daysUntilExpiry < 0) {
      return 'row-expired';
    }

    if (daysUntilExpiry < 30) {
      return 'row-expiring';
    }

    if (medicine.quantity < 10) {
      return 'row-low-stock';
    }

    return '';
  }

  statusLabel(medicine: Medicine): string {
    const daysUntilExpiry = this.daysUntilExpiry(medicine.expiryDate);

    if (daysUntilExpiry < 0) {
      return 'Expired';
    }

    if (daysUntilExpiry < 30) {
      return 'Expiring';
    }

    if (medicine.quantity < 10) {
      return 'Low stock';
    }

    return 'Available';
  }

  medicineControlInvalid(controlName: MedicineFormControlName): boolean {
    const control = this.medicineForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  saleControlInvalid(controlName: SaleFormControlName): boolean {
    const control = this.saleForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  medicineError(controlName: MedicineFormControlName): string {
    const control = this.medicineForm.controls[controlName];

    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (control.hasError('maxlength')) {
      return 'This value is too long.';
    }

    if (control.hasError('min')) {
      return controlName === 'quantity'
        ? 'Quantity cannot be negative.'
        : 'Price must be greater than zero.';
    }

    if (control.hasError('decimalPlaces')) {
      return 'Use no more than two decimal places.';
    }

    return 'Check this value.';
  }

  saleError(controlName: SaleFormControlName): string {
    const control = this.saleForm.controls[controlName];

    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (control.hasError('min')) {
      return 'Quantity sold must be at least 1.';
    }

    return 'Check this value.';
  }

  private resetMedicineForm(): void {
    this.editingMedicineId.set(null);
    this.medicineForm.reset({
      fullName: '',
      brand: '',
      expiryDate: '',
      quantity: 0,
      price: 0,
      notes: ''
    });
  }

  private problemMessage(response: unknown, fallback: string): string {
    if (response instanceof HttpErrorResponse) {
      const error = response.error;

      if (typeof error === 'string' && error.trim()) {
        return error;
      }

      if (error && typeof error === 'object') {
        const apiError = error as { detail?: string; message?: string; title?: string };
        return apiError.detail ?? apiError.message ?? apiError.title ?? fallback;
      }
    }

    return fallback;
  }
}
