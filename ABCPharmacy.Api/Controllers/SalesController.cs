using ABCPharmacy.Api.Contracts;
using ABCPharmacy.Api.Models;
using ABCPharmacy.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ABCPharmacy.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SalesController(IPharmacyRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SaleRecord>>> GetSales()
    {
        var sales = await repository.GetSalesAsync();
        return Ok(sales);
    }

    [HttpPost]
    public async Task<ActionResult<SaleRecord>> RecordSale(SaleCreateRequest request)
    {
        var result = await repository.RecordSaleAsync(request);

        if (result.Sale is null)
        {
            return BadRequest(new { message = result.Error });
        }

        return CreatedAtAction(nameof(GetSales), new { id = result.Sale.Id }, result.Sale);
    }
}
