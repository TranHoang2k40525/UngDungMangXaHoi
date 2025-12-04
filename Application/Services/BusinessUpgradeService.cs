using Azure.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.Interfaces;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Infrastructure.ExternalServices;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Application.Services
{
    public class BusinessUpgradeService : IBusinessUpgradeService
    {
        // Dependencies
        private readonly AppDbContext _context; // Database context
        private readonly IMoMoPaymentService _momoService; // MoMo API service
        private readonly ILogger<BusinessUpgradeService> _logger; // Logger
        private const decimal BUSINESS_PACKAGE_PRICE = 1000m; // 1000 VND (để test)
        private const int QR_CODE_EXPIRY_MINUTES = 5; // QR code hết hạn sau 5 phút
        private const int BUSINESS_PACKAGE_DAYS = 365;
        public BusinessUpgradeService(AppDbContext context, IMoMoPaymentService momoService, ILogger<BusinessUpgradeService> logger)
        {
            _context = context;
            _momoService = momoService;
            _logger = logger;
        }
        public async Task<(bool Success, string QrCodeUrl, int PaymentId, DateTime ExpiresAt, string Message)> RequestBusinessUpgradeAsync(int accountId)
        {
            try
            {
                _logger.LogInformation($"Bat dau nang cap tai khoan {accountId}");
                // Tạo yêu cầu xác minh doanh nghiệp
                var account = await _context.Accounts.FirstOrDefaultAsync(a => a.account_id == accountId);
                // kiem tra xem tai khoan co ton tai chua
                if (account == null)
                {
                    _logger.LogWarning($"Tai khoan {accountId} khong ton tai");
                    return (false, string.Empty, 0, DateTime.MinValue, "Account khong ton tai");
                }
                //Kiem tra xem tai khoan da la doanh nghiep chua
                if (account.account_type == AccountType.Business)
                {
                    _logger.LogWarning($"Tai khoan {accountId} da la tai khoan doanh nghiep");
                    return (false, string.Empty, 0, DateTime.MinValue, "Tai khoan da la tai khoan doanh nghiep");

                }
                //Kiem tra xem tai khoan co haot dong khong ( co bi  khoa khong)
                if (account.status != "active")
                {
                    _logger.LogWarning($"Tai khoan {accountId} khong con hoat dong");
                    return (false, string.Empty, 0, DateTime.MinValue, "Tai khoan dang bi khoa");
                }
                //Kiem tra xem tai khoan da co yeu cau nang cap dang cho xu ly chua
                var pendingPayment = await _context.BusinessPayments.Include(bp => bp.Request).Where(bp => bp.AccountId == accountId).Where(bp => bp.Status == PaymentStatus.Pending).Where(bp => bp.ExpiresAt > DateTime.UtcNow).OrderByDescending(bp => bp.CreatedAt).ToListAsync();
                if (pendingPayment.Any())
                {
                    foreach(var oldPayment in pendingPayment)
                    {
                        if (!oldPayment.IsExpired() ){
                            _logger.LogInformation($"Account {accountId} đã có payment đang chờ: {oldPayment.PaymentId}");

                            return (
                                 true,
                                 oldPayment.QrCodeUrl,
                                 oldPayment.PaymentId,
                                 oldPayment.ExpiresAt,
                                 $"Bạn đã có mã QR đang chờ thanh toán. Còn {oldPayment.GetRemainingSeconds()} giây."
                            );
                        }
                        else
                        {
                            _logger.LogInformation($"Payment {oldPayment.PaymentId} đã hết hạn, đánh dấu Failed");
                            oldPayment.MarkAsExpired();
                            if(oldPayment.Request != null)
                            {
                                oldPayment.Request.status = VerificationStatus.Expired;
                                oldPayment.Request.expires_at = DateTime.UtcNow;
                                oldPayment.Request.reviewed_notes = "QR code hết hạn, chưa thanh toán";

                            }

                        }
                    }
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Đã đánh dấu tất cả payment hết hạn cho account {accountId}");


                }
                var expiredPayments = await _context.BusinessPayments.Where(bp => bp.AccountId == accountId).Where(bp => bp.Status == PaymentStatus.Pending).Where(bp => bp.ExpiresAt <= DateTime.UtcNow).ToListAsync();
                if(expiredPayments.Any())
                {
                    _logger.LogInformation($"Tìm thấy {expiredPayments.Count} payment hết hạn, đánh dấu Expired");

                    foreach (var expiredPayment in expiredPayments)
                    {
                        expiredPayment.MarkAsExpired();
                    }

                    await _context.SaveChangesAsync();
                }
                //Tao yeu cau xac minh daonh nghiep BUSINESSVERIFICATIONREQUEST
                var verificationRequest = new BusinessVerificationRequest
                {
                    account_id = accountId,
                    submitted_at = DateTime.UtcNow,
                    status = VerificationStatus.Pending,
                };
                _context.BusinessVerificationRequests.Add(verificationRequest);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Da tao BusinessVerificationRequest {verificationRequest.request_id} cho account {accountId}");
                // Goi MoMo de tao Api
                var (success, qrCodeUrl, transactionId, momoMessage) = await _momoService.CreatePaymentQRAsync(
                   accountId,
                   verificationRequest.request_id,
                   BUSINESS_PACKAGE_PRICE
               );
                if (!success)
                {
                    _logger.LogError($"Ket noi API MoMo that bai {momoMessage}");
                    _context.BusinessVerificationRequests.Remove(verificationRequest);
                    await _context.SaveChangesAsync();
                    return (false, string.Empty, 0, DateTime.MinValue, $"Lỗi MoMo: {momoMessage}");
                }
                _logger.LogInformation("MoMo API thành công. TransactionId: {TransactionId}", transactionId);
                // Luu thong tin thanh toan
                var payment = new BusinessPayment
                {
                    RequestId = verificationRequest.request_id,
                    AccountId = accountId,
                    Amount = BUSINESS_PACKAGE_PRICE,
                    PaymentMethod = "MoMo",
                    QrCodeUrl = qrCodeUrl,
                    TransactionId = transactionId,
                    Status = PaymentStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(QR_CODE_EXPIRY_MINUTES), // Hết hạn sau 5 phút
                    PaidAt = null
                };
                _context.BusinessPayments.Add(payment);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Da tao BusinessPayment {payment.PaymentId} thanh cong.Qr het han luc {payment.ExpiresAt}");
                // tra ket qua
                return (true, qrCodeUrl, payment.PaymentId, payment.ExpiresAt, "ma Qr da tao thanh cong , vui long quet ma trong 5p");
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Lỗi database khi tạo yêu cầu nâng cấp");
                return (false, string.Empty, 0, DateTime.MinValue, "Lỗi lưu dữ liệu");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không xác định khi tạo yêu cầu nâng cấp");
                return (false, string.Empty, 0, DateTime.MinValue, $"Lỗi hệ thống: {ex.Message}");
            }

        }
        public async Task<(bool Success, string Message)> VeryfypaymentAsync(string transactionId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation($"Xác nhận thanh toán cho transaction {transactionId}");
                // TIm Payment
                var payment = await _context.BusinessPayments.Include(bp => bp.Request).Include(a => a.Account).FirstOrDefaultAsync(bp => bp.TransactionId == transactionId);
                if (payment==null){
                    _logger.LogWarning("Không tìm thấy payment với transaction {TransactionId}", transactionId);
                    return (false,"Giao dịch không tồn tại");
                }
                if (payment.Status == PaymentStatus.Completed)
                {
                    _logger.LogInformation("Payment {PaymentId} đã được xử lý trước đó", payment.PaymentId);
                    payment.MarkAsFailed();
                    await _context.SaveChangesAsync();
                    return (true, "Giao dich da duoc xy ly roi");
                }
                if(payment.Status == PaymentStatus.Failed || payment.Status == PaymentStatus.Expired)
                {
                    _logger.LogWarning("Payment {PaymentId} đã bị đánh dấu Failed trước đó", payment.PaymentId);
                    return (false, "Giao dich da bi huy");
                }
                
                if (payment.IsExpired())
                {
                    _logger.LogWarning("Payment {PaymentId} đã hết hạn", payment.PaymentId);
                    payment.MarkAsExpired();
                    if (payment.Request != null)
                    {
                        payment.Request.status = VerificationStatus.Expired;
                        payment.Request.expires_at = DateTime.UtcNow;
                        payment.Request.reviewed_notes = "QR code hết hạn, chưa thanh toán";
                    }
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();
                    return (false, "Mã QR đã hết hạn. Vui lòng tạo yêu cầu mới.");

                }
               

                // Cap nhat payment
                payment.MarkAsCompleted();
                _logger.LogInformation("Đã cập nhật payment {PaymentId} thành Completed", payment.PaymentId);

                // nang cap tai khoan khi thanh cong
                var account = payment.Account;
                account.account_type = AccountType.Business;
                account.business_verified_at = DateTime.UtcNow;
                account.business_expires_at = DateTime.UtcNow.AddDays(BUSINESS_PACKAGE_DAYS);
                _logger.LogInformation("Đã nâng cấp account {AccountId} lên Business. Hết hạn: {ExpiresAt}",
                    account.account_id, account.business_expires_at);
                // Cap nhat verification request
                var request = payment.Request;
                request.status = VerificationStatus.Approved;
                request.reviewed_at = DateTime.UtcNow;
                request.assigned_admin_id = null;

                request.reviewed_notes = "Tự động duyệt sau khi thanh toán MoMo thành công";
                _logger.LogInformation("Đã cập nhật request {RequestId} thành Approved", request.request_id);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                _logger.LogInformation($"Hoan tat nang cap len tai khoan Business cho tai khoan {payment.AccountId}");
                return (true, "Thanh toán thành công. Tài khoản đã được nâng cấp lên Business.");

            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                _logger.LogError(ex, "Lỗi khi xác nhận thanh toán {TransactionId}", transactionId);
                return (false, $"Lỗi hệ thống: {ex.Message}");
            }
        }
        //Kiem tra trang thai thanh toan
        public async Task<(bool Success, string Status, int RemainingSeconds, string Message)> CheckPaymentStatusAsync(int paymentId, int accountId)
        {
            try
            {
                // lay payment
                var payment = await _context.BusinessPayments.FirstOrDefaultAsync(bp => bp.PaymentId == paymentId);
                if(payment == null)
                {
                    _logger.LogWarning($"Khong tim thay hoa donpayment{paymentId}");
                    return (false, string.Empty,0,"Giao dich khong ton tai");
                }
                // Kiểm tra quyền sở hữu
                if (payment.AccountId != accountId)
                {
                    _logger.LogWarning("Account {AccountId} cố truy cập payment {PaymentId} của account khác",
                        accountId, paymentId);
                    return (false, string.Empty, 0, "Bạn không có quyền truy cập giao dịch này");
                }
                return (true, payment.Status.ToString(), payment.GetRemainingSeconds(), $"Trang Thai {payment.Status}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi kiểm tra trạng thái payment {PaymentId}", paymentId);
                return (false, string.Empty, 0, "Lỗi hệ thống");
            }
        }


    }
}
