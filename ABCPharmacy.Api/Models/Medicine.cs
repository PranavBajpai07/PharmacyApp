namespace ABCPharmacy.Api.Models;

public sealed class Medicine
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string FullName { get; set; } = string.Empty;

    public string? Notes { get; set; }

    public DateOnly ExpiryDate { get; set; }

    public int Quantity { get; set; }

    public decimal Price { get; set; }

    public string Brand { get; set; } = string.Empty;
}
