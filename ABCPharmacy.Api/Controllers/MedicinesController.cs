using ABCPharmacy.Api.Contracts;
using ABCPharmacy.Api.Models;
using ABCPharmacy.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ABCPharmacy.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class MedicinesController(IPharmacyRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MedicineListItemDto>>> GetMedicines([FromQuery] string? search)
    {
        var medicines = await repository.GetMedicinesAsync(search);
        return Ok(medicines.Select(ToListItem));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MedicineDto>> GetMedicine(Guid id)
    {
        var medicine = await repository.GetMedicineAsync(id);

        if (medicine is null)
        {
            return NotFound();
        }

        return Ok(ToDto(medicine));
    }

    [HttpPost]
    public async Task<ActionResult<MedicineDto>> AddMedicine(MedicineCreateRequest request)
    {
        if (decimal.Round(request.Price, 2, MidpointRounding.AwayFromZero) != request.Price)
        {
            ModelState.AddModelError(nameof(request.Price), "Price must use no more than 2 decimal places.");
            return ValidationProblem(ModelState);
        }

        var medicine = await repository.AddMedicineAsync(request);
        return CreatedAtAction(nameof(GetMedicine), new { id = medicine.Id }, ToDto(medicine));
    }

    private static MedicineListItemDto ToListItem(Medicine medicine) =>
        new(
            medicine.Id,
            medicine.FullName,
            medicine.ExpiryDate,
            medicine.Quantity,
            medicine.Price,
            medicine.Brand);

    private static MedicineDto ToDto(Medicine medicine) =>
        new(
            medicine.Id,
            medicine.FullName,
            medicine.Notes,
            medicine.ExpiryDate,
            medicine.Quantity,
            medicine.Price,
            medicine.Brand);
}
