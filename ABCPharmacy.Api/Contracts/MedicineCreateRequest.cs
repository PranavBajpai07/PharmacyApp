using System.ComponentModel.DataAnnotations;

namespace ABCPharmacy.Api.Contracts;

public sealed class MedicineCreateRequest
{
    [Required]
    [StringLength(160)]
    public string FullName { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Notes { get; set; }

    [Required]
    public DateOnly ExpiryDate { get; set; }

    [Range(0, int.MaxValue)]
    public int Quantity { get; set; }

    [Range(typeof(decimal), "0.01", "999999999.99")]
    public decimal Price { get; set; }

    [Required]
    [StringLength(120)]
    public string Brand { get; set; } = string.Empty;
}
