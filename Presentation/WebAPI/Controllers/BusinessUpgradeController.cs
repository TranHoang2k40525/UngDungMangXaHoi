using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Application.Interfaces;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Infrastructure.Persistence;
using static UngDungMangXaHoi.Application.DTOs.BusinessDto;



namespace UngDungMangXaHoi.WebAPI.Controllers
{
    [ApiController]
    [Route("api/Business")]
    [Authorize] // All authenticated users
    public class BusinessUpgradeController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IBusinessUpgradeService _businessUpgradeService;
        private readonly ILogger<BusinessUpgradeController> _logger;
        public BusinessUpgradeController(AppDbContext context,IBusinessUpgradeService businessUpgradeService, ILogger<BusinessUpgradeController> logger)
        {
            _context = context;
            _businessUpgradeService = businessUpgradeService;
            _logger = logger;
        }
       
        [HttpPost("upgrade")]
        [Authorize] // Yêu cầu đăng nhập (có JWT token)
        [ProducesResponseType(typeof(RequestUpgradeResponse), 200)]
        [ProducesResponseType(typeof(ErrorResponse), 400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> RequestUpgrade()
        {
            //Lay accountId từ JWT token
            var accountIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdClaim) || !int.TryParse(accountIdClaim, out var accountId))
                { 

            _logger.LogWarning("Token khong chua account_id hop le");
                return Unauthorized(new ErrorResponse
                {
                    Success = false,
                    Message = "Token không hợp lệ"
                });

            }
            _logger.LogInformation("User {AccountId} yêu cầu nâng cấp Business", accountId);
             var (success, qrCodeUrl, paymentId, expiresAt, message) = await _businessUpgradeService.RequestBusinessUpgradeAsync(accountId);
            if(!success)
            {
                _logger.LogWarning("Yeu cau nang cap Business cua User {AccountId} khong thanh cong: {Message}", accountId, message);
                return BadRequest(new ErrorResponse
                {
                    Success = false,
                    Message = message
                });
            }
            var remainingSeconds = (int)(expiresAt - DateTime.UtcNow).TotalSeconds;
            return Ok(new RequestUpgradeResponse
            {

                Success = true,
                Message = message,
                Data = new PaymentData
                {
                    QrCodeUrl =  qrCodeUrl,
                    PaymentId = paymentId,
                    RemainingSeconds = remainingSeconds
                }

            });
        }
        [HttpPost("momo-webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> MoMoWebHook([FromBody] MoMoWebhookRequest request)
        {
            _logger.LogInformation($"Nhan webhook tu MoMo: OrderId={request.OrderId}, ResultCode={request.ResultCode}, Amount={request.Amount}");

            if(request.ResultCode != 0)
            {
                _logger.LogWarning($"Thanh toan MoMo khong thanh cong cho OrderId={request.OrderId}, ResultCode={request.ResultCode}");
                var failedPayment = await _context.BusinessPayments
            .FirstOrDefaultAsync(bp => bp.TransactionId == request.OrderId);

                if (failedPayment != null && failedPayment.Status == PaymentStatus.Pending)
                {
                    failedPayment.MarkAsFailed($"MoMo ResultCode: {request.ResultCode}, Message: {request.Message}");
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Đã đánh dấu payment {PaymentId} là Failed", failedPayment.PaymentId);
                }

                return Ok(new { message = "Acknowledged", success = false, resultCode = request.ResultCode });
            }
           //Xac nhan thanh toan
            var (success, message) = await _businessUpgradeService.VeryfypaymentAsync(request.OrderId);
            if(!success)
            {
                _logger.LogWarning($"Xac nhan thanh toan khong thanh cong cho OrderId={request.OrderId}: {message}");
                return Ok("Xac nhan thanh toan that bai");
            }
            _logger.LogInformation($"Xac nhan thanh toan thanh cong cho OrderId={request.OrderId}");
            return Ok(new {message =" Dc cong nhan,  good chop kaka",success = success,
                details = message});
        }
        [HttpGet("payment-status/{paymentId}")]
        [Authorize]
        [ProducesResponseType(typeof(PaymentStatusResponse), 200)]
        public async Task<IActionResult> CheckPaymentStatus([FromRoute] int paymentId)
        {
            _logger.LogInformation("Nhận request check payment status với paymentId={PaymentId}", paymentId);
            
            var accountIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
            {
                return Unauthorized(new { message = "Token không hợp lệ!" });
            }
            
            _logger.LogInformation("AccountId từ token: {AccountId}", accountId);
            
            var (Success,  Status,  RemainingSeconds,  Message) = await _businessUpgradeService.CheckPaymentStatusAsync(paymentId, accountId);
            if(!Success)
            {
                _logger.LogWarning("Kiem tra trang thai thanh toan khong thanh cong cho PaymentId={PaymentId}: {Message}", paymentId, Message);
                return BadRequest( new PaymentStatusResponse
                {
                    Success = false,
                    Status = Status,
                    RemainingSeconds = RemainingSeconds,
                    Message = Message
                });
            }
            _logger.LogInformation("Kiem tra trang thai thanh toan thanh cong cho PaymentId={PaymentId}: {Status}", paymentId, Status);
            return Ok( new PaymentStatusResponse
            {
                Success = true,
                Status = Status,
                RemainingSeconds = RemainingSeconds,
                Message = Message
            });
        }

    }
}
