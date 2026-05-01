# ABC Pharmacy

Standalone medicine inventory and sales tracking app.

## Stack

- Backend: ASP.NET Core Web API on .NET 10
- Frontend: Angular 21
- Storage: JSON files in `ABCPharmacy.Api/Data`

## Run locally

Start the API:

```powershell
dotnet run --project ABCPharmacy.Api --urls http://localhost:5178
```

Start the Angular app from a second terminal:

```powershell
cd ABCPharmacy.Client
npm install
npm run start -- --host localhost --port 4200
```

Open:

```text
http://localhost:4200
```

Angular 21 requires Node.js 20.19+, 22.12+, or 24+. If your global `node --version` is lower, switch to a newer Node runtime before running the client commands.

## API

- `GET /api/medicines?search={name}` lists medicines without notes for the grid.
- `GET /api/medicines/{id}` returns one medicine with notes.
- `POST /api/medicines` adds medicine details.
- `GET /api/sales` lists sales records.
- `POST /api/sales` records a sale and decrements stock.
