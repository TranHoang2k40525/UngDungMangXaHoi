using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Infrastructure.ExternalServices;

namespace UngDungMangXaHoi.Application.Interfaces
{
    public interface IBusinessUpgradeService
    {
        Task<(bool Success, string QrCodeUrl, int PaymentId, DateTime ExpiresAt, string Message)> RequestBusinessUpgradeAsync(int accountId);
        Task<(bool Success, string Message)> VeryfypaymentAsync(string transactionId);
        Task<(bool Success, string Status, int RemainingSeconds, string Message)> CheckPaymentStatusAsync(int paymentId, int accountId);
    }
}
