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
        if (!ValidateMedicineDetails(request.FullName, request.Brand, request.Price))
        {
            return ValidationProblem(ModelState);
        }

        var medicine = await repository.AddMedicineAsync(request);
        return CreatedAtAction(nameof(GetMedicine), new { id = medicine.Id }, ToDto(medicine));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MedicineDto>> UpdateMedicine(Guid id, MedicineUpdateRequest request)
    {
        if (!ValidateMedicineDetails(request.FullName, request.Brand, request.Price))
        {
            return ValidationProblem(ModelState);
        }

        var medicine = await repository.UpdateMedicineAsync(id, request);

        if (medicine is null)
        {
            return MedicineNotFound(id);
        }

        return Ok(ToDto(medicine));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteMedicine(Guid id)
    {
        var deleted = await repository.DeleteMedicineAsync(id);

        if (!deleted)
        {
            return MedicineNotFound(id);
        }

        return NoContent();
    }

    private bool ValidateMedicineDetails(string fullName, string brand, decimal price)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            ModelState.AddModelError(nameof(MedicineCreateRequest.FullName), "Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(brand))
        {
            ModelState.AddModelError(nameof(MedicineCreateRequest.Brand), "Brand is required.");
        }

        if (decimal.Round(price, 2, MidpointRounding.AwayFromZero) != price)
        {
            ModelState.AddModelError(nameof(MedicineCreateRequest.Price), "Price must use no more than 2 decimal places.");
        }

        return ModelState.IsValid;
    }

    private ObjectResult MedicineNotFound(Guid id) =>
        Problem(
            title: "Medicine not found",
            detail: $"No medicine exists with id '{id}'.",
            statusCode: StatusCodes.Status404NotFound);

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
