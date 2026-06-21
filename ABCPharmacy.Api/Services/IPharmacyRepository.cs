using ABCPharmacy.Api.Contracts;
using ABCPharmacy.Api.Models;

namespace ABCPharmacy.Api.Services;

public interface IPharmacyRepository
{
    Task<IReadOnlyList<Medicine>> GetMedicinesAsync(string? searchTerm);

    Task<Medicine?> GetMedicineAsync(Guid id);

    Task<Medicine> AddMedicineAsync(MedicineCreateRequest request);

    Task<Medicine?> UpdateMedicineAsync(Guid id, MedicineUpdateRequest request);

    Task<bool> DeleteMedicineAsync(Guid id);

    Task<IReadOnlyList<SaleRecord>> GetSalesAsync();

    Task<SaleResult> RecordSaleAsync(SaleCreateRequest request);
}

public sealed record SaleResult(SaleRecord? Sale, string? Error);
