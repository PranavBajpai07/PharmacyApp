namespace ABCPharmacy.Api.Contracts;

public sealed record MedicineDto(
    Guid Id,
    string FullName,
    string? Notes,
    DateOnly ExpiryDate,
    int Quantity,
    decimal Price,
    string Brand);

public sealed record MedicineListItemDto(
    Guid Id,
    string FullName,
    DateOnly ExpiryDate,
    int Quantity,
    decimal Price,
    string Brand);
