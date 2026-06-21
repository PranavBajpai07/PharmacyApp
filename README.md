# PharmacyApp

A full-stack pharmacy inventory and sales tracking app built to practise clean API design and Angular component architecture.

## What it does

- Lists, adds, edits, and deletes medicines with brand, expiry date, quantity, price, and stock status
- Records sales and auto-decrements inventory
- Dashboard metrics: total medicines, low stock alerts, expiring-soon count, and total inventory value
- JSON flat-file persistence — no database required to run locally

## Tech stack

| Layer    | Technology                         |
|----------|------------------------------------|
| Backend  | ASP.NET Core Web API · .NET 10     |
| Frontend | Angular 21                         |
| Storage  | JSON files in `ABCPharmacy.Api/Data` |

## Run locally

**Backend** — start the API:

```powershell
dotnet run --project ABCPharmacy.Api --urls http://localhost:5178
```

**Frontend** — in a second terminal:

```powershell
cd ABCPharmacy.Client
npm install
npm run start -- --host localhost --port 4200
```

Then open `http://localhost:4200`.

> Angular 21 requires Node.js 20.19+, 22.12+, or 24+.  
> Run `node --version` and switch to a compatible runtime if needed.

## API reference

| Method | Route                         | Description                      |
|--------|-------------------------------|----------------------------------|
| GET    | `/api/health`                 | Health check                     |
| GET    | `/api/medicines?search={name}`| List / search medicines          |
| GET    | `/api/medicines/{id}`         | Single medicine with notes       |
| POST   | `/api/medicines`              | Add a medicine record            |
| PUT    | `/api/medicines/{id}`         | Update a medicine record         |
| DELETE | `/api/medicines/{id}`         | Remove a medicine from inventory |
| GET    | `/api/sales`                  | List sales records               |
| POST   | `/api/sales`                  | Record a sale, decrement stock   |

## Client configuration

The Angular API base URL is configured in `ABCPharmacy.Client/src/environments`.

- Development builds call `http://localhost:5178/api`
- Production builds use `/api`

## Known limitations

<<<<<<< HEAD
- No unit tests yet
- JSON file storage is not suitable for production use
=======
- `GET /api/medicines?search={name}` lists medicines without notes for the grid.
- `GET /api/medicines/{id}` returns one medicine with notes.
- `POST /api/medicines` adds medicine details.
- `PUT /api/medicines/{id}` updates medicine details.
- `DELETE /api/medicines/{id}` removes a medicine from inventory.
- `GET /api/sales` lists sales records.
- `POST /api/sales` records a sale and decrements stock.

## Client configuration

The Angular API base URL is configured in `ABCPharmacy.Client/src/environments`.
Development builds call `http://localhost:5178/api`; production builds use `/api`.
>>>>>>> Improve pharmacy inventory management
