# ABC Pharmacy Project Documentation

Last reviewed: 2026-06-21

## 1. Project Overview

ABC Pharmacy is a standalone medicine inventory and sales tracking application. It is designed for a small pharmacy-style workflow where a user can:

- View available medicines.
- Search medicines by name.
- Add new medicine records.
- Edit existing medicine details.
- Delete medicines from inventory.
- Record sales.
- Automatically reduce stock when a sale is recorded.
- See basic inventory metrics such as low-stock count, expiring-soon count, and stock value.

The project is split into two applications:

- `ABCPharmacy.Api`: ASP.NET Core Web API backend.
- `ABCPharmacy.Client`: Angular frontend.

The backend stores data in JSON files under `ABCPharmacy.Api/Data`, so the project does not require a database server to run locally.

## 2. Technology Stack

### Backend

- ASP.NET Core Web API
- .NET 10
- C#
- JSON file storage
- Dependency injection
- Data annotations for request validation

### Frontend

- Angular 21
- TypeScript
- Angular signals
- Reactive forms
- Angular HTTP client
- CSS-based responsive layout

### Local Runtime Requirements

- .NET SDK 10
- Node.js 20.19+, 22.12+, or 24+
- npm

The current Angular version requires a newer Node runtime than Node 18.

## 3. How To Run The Project

Start the API from the repository root:

```powershell
dotnet run --project ABCPharmacy.Api --urls http://localhost:5178
```

Start the Angular client from a second terminal:

```powershell
cd ABCPharmacy.Client
npm install
npm run start -- --host localhost --port 4200
```

Open the app at:

```text
http://localhost:4200
```

The Angular development environment points to:

```text
http://localhost:5178/api
```

That means the API should stay on port `5178` unless the frontend environment file is also updated.

## 4. Repository Structure

```text
ABCPharmacy/
  ABCPharmacy.Api/
    Controllers/
      MedicinesController.cs
      SalesController.cs
    Contracts/
      MedicineCreateRequest.cs
      MedicineUpdateRequest.cs
      MedicineDto.cs
      SaleCreateRequest.cs
    Data/
      medicines.json
      sales.json
    Models/
      Medicine.cs
      SaleRecord.cs
    Services/
      IPharmacyRepository.cs
      JsonPharmacyRepository.cs
    Program.cs
    ABCPharmacy.Api.csproj

  ABCPharmacy.Client/
    src/
      app/
        app.ts
        app.html
        app.css
        pharmacy-api.ts
      environments/
        environment.ts
        environment.development.ts
      main.ts
    package.json
    angular.json

  README.md
  Directory.Build.props
  NuGet.Config
```

## 5. Basic Backend Explanation

The backend exposes REST endpoints under `/api`.

### Medicine Endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/medicines?search={name}` | Lists medicines, optionally filtered by medicine name. |
| `GET` | `/api/medicines/{id}` | Gets one medicine with notes. |
| `POST` | `/api/medicines` | Adds a new medicine. |
| `PUT` | `/api/medicines/{id}` | Updates an existing medicine. |
| `DELETE` | `/api/medicines/{id}` | Deletes a medicine. |

### Sales Endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/sales` | Lists sales, newest first. |
| `POST` | `/api/sales` | Records a sale and decrements inventory quantity. |

### Health Endpoint

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Returns a simple health response. |

## 6. Basic Frontend Explanation

The Angular app has one main root component in `ABCPharmacy.Client/src/app/app.ts`.

It provides these user-facing areas:

- Header with app name and stack labels.
- Inventory summary metrics.
- Searchable medicine table.
- Add/edit medicine form.
- Record sale form.
- Sales history list.

The frontend talks to the backend through `PharmacyApi` in:

```text
ABCPharmacy.Client/src/app/pharmacy-api.ts
```

This service wraps all HTTP calls and centralizes the API base URL from the Angular environment configuration.

## 7. Data Model

### Medicine

A medicine record contains:

- `id`: unique GUID.
- `fullName`: display name, such as `Paracetamol 500mg`.
- `notes`: optional internal notes.
- `expiryDate`: expiry date.
- `quantity`: current inventory count.
- `price`: unit price.
- `brand`: medicine brand.

### SaleRecord

A sale record contains:

- `id`: unique GUID.
- `medicineId`: medicine sold.
- `medicineName`: copied medicine name at sale time.
- `brand`: copied brand at sale time.
- `quantitySold`: units sold.
- `unitPrice`: copied unit price at sale time.
- `totalPrice`: unit price multiplied by quantity sold.
- `soldAt`: sale timestamp.

Copying the name, brand, and price into the sale record is useful because a sale should preserve what was sold even if the medicine is renamed or repriced later.

## 8. Advanced Backend Details

### Dependency Injection

`Program.cs` registers:

```csharp
builder.Services.AddSingleton<IPharmacyRepository, JsonPharmacyRepository>();
```

This means the entire API uses one shared repository instance while the app is running.

### JSON Persistence

`JsonPharmacyRepository` stores inventory and sales in:

```text
ABCPharmacy.Api/Data/medicines.json
ABCPharmacy.Api/Data/sales.json
```

The repository reads the full JSON file into memory for each operation, modifies the list, and writes the full file back.

This approach is simple and works well for small local datasets, but it is not ideal for large data volumes, reporting-heavy workflows, or multi-server deployments.

### File Locking

The repository uses:

```csharp
private readonly SemaphoreSlim _fileLock = new(1, 1);
```

This protects file access inside one running API process. It helps prevent two requests from writing the JSON files at the same time.

Important limitation: this lock only works inside the current process. If two API instances run against the same files, they can still conflict.

### Seed Data

When the JSON files do not exist, the repository creates starter data. This allows the app to run immediately without a database setup step.

### Validation

Request validation happens in two places:

- Data annotations on request classes, such as `[Required]`, `[StringLength]`, and `[Range]`.
- Manual validation in `MedicinesController` for trimmed required strings and two-decimal-place prices.

Sales validation checks that:

- The medicine exists.
- There is enough stock available.
- Quantity sold is at least 1.

### Error Handling

The API returns problem responses for missing medicines and failed sale attempts. The Angular client reads `detail`, `message`, or `title` from those responses and displays a user-friendly error.

## 9. Advanced Frontend Details

### Angular Signals

The app uses signals for UI state:

- `medicines`
- `sales`
- `searchTerm`
- `loading`
- `savingMedicine`
- `recordingSale`
- `editingMedicineId`
- `message`
- `error`

Computed signals derive summary metrics:

- `lowStockCount`
- `expiringSoonCount`
- `inventoryValue`
- `saleOptions`

This keeps the UI reactive without needing a larger state management library.

### Reactive Forms

The medicine and sale forms use Angular reactive forms. Client-side validation covers required fields, max lengths, minimum values, and two-decimal-place prices.

### Search Debouncing

The search input waits 300 milliseconds after typing before calling the API. This reduces unnecessary API requests while the user is still typing.

### Inventory Status Logic

The frontend calculates status labels based on expiry and quantity:

- Expired when expiry date is in the past.
- Expiring when expiry date is less than 30 days away.
- Low stock when quantity is less than 10.
- Available otherwise.

Rows are styled differently for expired, expiring, and low-stock medicines.

### API Service Layer

`PharmacyApi` is a thin wrapper over Angular `HttpClient`. It keeps endpoint paths and TypeScript interfaces out of the main component, which makes the UI easier to read and maintain.

## 10. Current Strengths

- Simple local setup with no database requirement.
- Clear separation between API and client.
- Thin API controllers with repository abstraction.
- Good starter validation on both frontend and backend.
- Sales automatically reduce stock.
- Sales preserve historical price and name details.
- Angular client has useful loading, saving, and error states.
- UI includes operational signals such as low stock, expiry, and inventory value.
- JSON storage makes the project easy to inspect and demo.

## 11. Current Limitations

- JSON files are not suitable for production-scale persistence.
- No authentication or authorization.
- No automated backend tests.
- No automated frontend tests.
- No OpenAPI/Swagger setup is currently exposed.
- No database migrations or relational data integrity.
- No audit log for inventory edits or deletes.
- Deleting a medicine does not prevent old sale records from referencing that deleted medicine.
- The API HTTP scratch file still references `/weatherforecast`, which does not match the current API.
- Search only checks medicine full name.
- Expiry and low-stock thresholds are hard-coded in the frontend.
- There is no pagination for medicines or sales.
- There is no import/export workflow.
- There is no deployment configuration.

## 12. Recommended Improvements

### High Priority

1. Add automated tests.
   - Backend: repository tests and controller/API tests.
   - Frontend: component behavior tests for forms, search, and sale recording.

2. Add Swagger/OpenAPI.
   - This would make the API easier to explore and document.
   - It would also help frontend/backend contract validation.

3. Replace JSON persistence with a database for real usage.
   - SQLite is a good first step for local or single-user deployments.
   - SQL Server or PostgreSQL would be better for multi-user production use.

4. Add authentication and roles.
   - Example roles: pharmacist, cashier, manager, admin.
   - Sensitive actions like deleting medicines should require elevated permission.

5. Improve validation consistency.
   - Share or mirror important validation rules between backend and frontend.
   - Add backend checks for expiry date rules if expired products should be blocked.

### Medium Priority

1. Add audit history.
   - Track who added, edited, deleted, or sold medicine.
   - Preserve before/after values for inventory changes.

2. Add medicine categories and suppliers.
   - This would support better filtering, ordering, and reporting.

3. Add low-stock and expiry configuration.
   - Move thresholds from hard-coded frontend values into backend settings or user preferences.

4. Add pagination and sorting.
   - Important once the medicine or sales lists become large.

5. Improve sales reporting.
   - Add daily, weekly, and monthly totals.
   - Add top-selling medicines.
   - Add revenue summaries.

6. Add barcode or SKU support.
   - This would make medicine lookup faster and more realistic for pharmacy workflows.

7. Add import/export.
   - CSV or Excel import for initial inventory.
   - CSV or PDF export for sales and stock reports.

### Lower Priority

1. Add toast notifications instead of plain inline messages.
2. Add confirmation modal components instead of `window.confirm`.
3. Add dark mode or theme support.
4. Add print-friendly reports.
5. Add richer dashboard charts.
6. Add end-to-end tests with Playwright or Cypress.

## 13. Suggested Database Evolution

If the project moves away from JSON files, a basic relational model could look like this:

```text
Medicine
  Id
  FullName
  Brand
  Notes
  ExpiryDate
  Quantity
  Price
  CreatedAt
  UpdatedAt

Sale
  Id
  MedicineId
  MedicineName
  Brand
  QuantitySold
  UnitPrice
  TotalPrice
  SoldAt

InventoryAdjustment
  Id
  MedicineId
  AdjustmentType
  QuantityChanged
  Reason
  CreatedAt
  CreatedBy
```

`InventoryAdjustment` would make stock changes auditable instead of only storing the final quantity.

## 14. Suggested API Enhancements

Possible future endpoints:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/reports/inventory-value` | Returns total inventory value. |
| `GET` | `/api/reports/low-stock` | Returns low-stock medicines. |
| `GET` | `/api/reports/expiring` | Returns medicines expiring within a configurable window. |
| `GET` | `/api/reports/sales?from=&to=` | Returns sales report for a date range. |
| `POST` | `/api/inventory-adjustments` | Records manual stock corrections. |
| `POST` | `/api/import/medicines` | Imports inventory from CSV or Excel. |
| `GET` | `/api/export/sales` | Exports sales data. |

## 15. Suggested Frontend Enhancements

The Angular app could grow into a more complete operational tool with:

- Separate pages for inventory, sales, reports, and settings.
- Filter controls for brand, stock status, expiry status, and category.
- Sortable table columns.
- Pagination.
- A dedicated medicine details view.
- A reusable form component for create/edit medicine.
- A reusable API error component.
- Dashboard charts for stock value and sales trends.
- Role-aware navigation and actions.

## 16. Testing Strategy

### Backend Tests

Recommended coverage:

- Add medicine with valid data.
- Reject medicine with missing name or brand.
- Reject medicine with invalid price precision.
- Update existing medicine.
- Return 404 for missing medicine.
- Delete existing medicine.
- Record sale and reduce quantity.
- Reject sale when stock is insufficient.
- Reject sale when medicine does not exist.

### Frontend Tests

Recommended coverage:

- Medicine form validation.
- Sale form validation.
- Search debounce behavior.
- Inventory metrics calculations.
- Expiry and low-stock status labels.
- API error display.
- Add/edit/delete workflows with mocked API calls.

### End-To-End Tests

Recommended user flows:

- Load the app and see seed medicines.
- Add a medicine.
- Search for that medicine.
- Edit that medicine.
- Record a sale.
- Confirm stock decreases.
- Delete a medicine.

## 17. Deployment Considerations

For a simple deployment, the Angular app can be built as static files and served separately from the API. For a more integrated deployment, the API can serve the built Angular assets.

Production readiness would require:

- Real database.
- HTTPS configuration.
- Authentication.
- Environment-specific API URLs.
- Structured logging.
- Error monitoring.
- Backup strategy.
- Data migration strategy.
- CI/CD pipeline.

## 18. Good Next Steps

A practical next sequence would be:

1. Add Swagger/OpenAPI to the backend.
2. Fix the stale `ABCPharmacy.Api.http` sample endpoint.
3. Add backend tests around repository behavior.
4. Add a database-backed repository using SQLite.
5. Add pagination, sorting, and better filters.
6. Add sales reports.
7. Add authentication and role-based authorization.

This keeps the project useful as a learning/demo app while steadily moving it toward a production-style architecture.
