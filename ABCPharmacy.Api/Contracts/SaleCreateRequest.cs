using System.ComponentModel.DataAnnotations;

namespace ABCPharmacy.Api.Contracts;

public sealed class SaleCreateRequest
{
    [Required]
    public Guid MedicineId { get; set; }

    [Range(1, int.MaxValue)]
    public int QuantitySold { get; set; }

    public DateTimeOffset? SoldAt { get; set; }
}
