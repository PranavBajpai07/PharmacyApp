using System.Text.Json;
using ABCPharmacy.Api.Contracts;
using ABCPharmacy.Api.Models;

namespace ABCPharmacy.Api.Services;

public sealed class JsonPharmacyRepository(IHostEnvironment environment) : IPharmacyRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly string _dataDirectory = Path.Combine(environment.ContentRootPath, "Data");
    private readonly SemaphoreSlim _fileLock = new(1, 1);

    private string MedicinesPath => Path.Combine(_dataDirectory, "medicines.json");

    private string SalesPath => Path.Combine(_dataDirectory, "sales.json");

    public async Task<IReadOnlyList<Medicine>> GetMedicinesAsync(string? searchTerm)
    {
        await _fileLock.WaitAsync();
        try
        {
            await EnsureSeedDataAsync();
            var medicines = await ReadJsonAsync<List<Medicine>>(MedicinesPath);

            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                return medicines
                    .OrderBy(medicine => medicine.FullName)
                    .ToList();
            }

            return medicines
                .Where(medicine => medicine.FullName.Contains(searchTerm, StringComparison.OrdinalIgnoreCase))
                .OrderBy(medicine => medicine.FullName)
                .ToList();
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task<Medicine?> GetMedicineAsync(Guid id)
    {
        await _fileLock.WaitAsync();
        try
        {
            await EnsureSeedDataAsync();
            var medicines = await ReadJsonAsync<List<Medicine>>(MedicinesPath);
            return medicines.SingleOrDefault(medicine => medicine.Id == id);
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task<Medicine> AddMedicineAsync(MedicineCreateRequest request)
    {
        await _fileLock.WaitAsync();
        try
        {
            await EnsureSeedDataAsync();
            var medicines = await ReadJsonAsync<List<Medicine>>(MedicinesPath);
            var medicine = new Medicine
            {
                Id = Guid.NewGuid(),
                FullName = request.FullName.Trim(),
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
                ExpiryDate = request.ExpiryDate,
                Quantity = request.Quantity,
                Price = decimal.Round(request.Price, 2, MidpointRounding.AwayFromZero),
                Brand = request.Brand.Trim()
            };

            medicines.Add(medicine);
            await WriteJsonAsync(MedicinesPath, medicines);

            return medicine;
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task<Medicine?> UpdateMedicineAsync(Guid id, MedicineUpdateRequest request)
    {
        await _fileLock.WaitAsync();
        try
        {
            await EnsureSeedDataAsync();
            var medicines = await ReadJsonAsync<List<Medicine>>(MedicinesPath);
            var medicine = medicines.SingleOrDefault(item => item.Id == id);

            if (medicine is null)
            {
                return null;
            }

            medicine.FullName = request.FullName.Trim();
            medicine.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
            medicine.ExpiryDate = request.ExpiryDate;
            medicine.Quantity = request.Quantity;
            medicine.Price = decimal.Round(request.Price, 2, MidpointRounding.AwayFromZero);
            medicine.Brand = request.Brand.Trim();

            await WriteJsonAsync(MedicinesPath, medicines);

            return medicine;
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task<bool> DeleteMedicineAsync(Guid id)
    {
        await _fileLock.WaitAsync();
        try
        {
            await EnsureSeedDataAsync();
            var medicines = await ReadJsonAsync<List<Medicine>>(MedicinesPath);
            var removedCount = medicines.RemoveAll(item => item.Id == id);

            if (removedCount == 0)
            {
                return false;
            }

            await WriteJsonAsync(MedicinesPath, medicines);

            return true;
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task<IReadOnlyList<SaleRecord>> GetSalesAsync()
    {
        await _fileLock.WaitAsync();
        try
        {
            await EnsureSeedDataAsync();
            var sales = await ReadJsonAsync<List<SaleRecord>>(SalesPath);
            return sales
                .OrderByDescending(sale => sale.SoldAt)
                .ToList();
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task<SaleResult> RecordSaleAsync(SaleCreateRequest request)
    {
        await _fileLock.WaitAsync();
        try
        {
            await EnsureSeedDataAsync();
            var medicines = await ReadJsonAsync<List<Medicine>>(MedicinesPath);
            var medicine = medicines.SingleOrDefault(item => item.Id == request.MedicineId);

            if (medicine is null)
            {
                return new SaleResult(null, "Medicine was not found.");
            }

            if (medicine.Quantity < request.QuantitySold)
            {
                return new SaleResult(null, $"Only {medicine.Quantity} unit(s) are available in stock.");
            }

            medicine.Quantity -= request.QuantitySold;

            var sale = new SaleRecord
            {
                Id = Guid.NewGuid(),
                MedicineId = medicine.Id,
                MedicineName = medicine.FullName,
                Brand = medicine.Brand,
                QuantitySold = request.QuantitySold,
                UnitPrice = decimal.Round(medicine.Price, 2, MidpointRounding.AwayFromZero),
                TotalPrice = decimal.Round(medicine.Price * request.QuantitySold, 2, MidpointRounding.AwayFromZero),
                SoldAt = request.SoldAt ?? DateTimeOffset.UtcNow
            };

            var sales = await ReadJsonAsync<List<SaleRecord>>(SalesPath);
            sales.Add(sale);

            await WriteJsonAsync(MedicinesPath, medicines);
            await WriteJsonAsync(SalesPath, sales);

            return new SaleResult(sale, null);
        }
        finally
        {
            _fileLock.Release();
        }
    }

    private async Task EnsureSeedDataAsync()
    {
        Directory.CreateDirectory(_dataDirectory);

        if (!File.Exists(MedicinesPath))
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var medicines = new List<Medicine>
            {
                new()
                {
                    FullName = "Paracetamol 500mg",
                    Notes = "Common pain relief and fever medicine.",
                    ExpiryDate = today.AddDays(18),
                    Quantity = 42,
                    Price = 2.50m,
                    Brand = "ABC Health"
                },
                new()
                {
                    FullName = "Amoxicillin 250mg",
                    Notes = "Prescription antibiotic. Dispense as directed.",
                    ExpiryDate = today.AddMonths(7),
                    Quantity = 7,
                    Price = 8.75m,
                    Brand = "CarePlus"
                },
                new()
                {
                    FullName = "Cetirizine 10mg",
                    Notes = "Antihistamine tablets.",
                    ExpiryDate = today.AddMonths(12),
                    Quantity = 30,
                    Price = 3.20m,
                    Brand = "ReliefLabs"
                }
            };

            await WriteJsonAsync(MedicinesPath, medicines);
        }

        if (!File.Exists(SalesPath))
        {
            await WriteJsonAsync(SalesPath, new List<SaleRecord>());
        }
    }

    private static async Task<T> ReadJsonAsync<T>(string path)
        where T : new()
    {
        if (!File.Exists(path))
        {
            return new T();
        }

        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions) ?? new T();
    }

    private static async Task WriteJsonAsync<T>(string path, T value)
    {
        await using var stream = File.Create(path);
        await JsonSerializer.SerializeAsync(stream, value, JsonOptions);
    }
}
