using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.WebAPI.Services
{
    /// <summary>
    /// Background service để tự động xóa các tài khoản User ở trạng thái "pending" quá hạn.
    /// Chạy mỗi 1 giờ để dọn dẹp các tài khoản chưa hoàn tất verify OTP.
    /// </summary>
    public class ExpiredPendingAccountsCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ExpiredPendingAccountsCleanupService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromHours(1); // Chạy mỗi 1 giờ
        private readonly TimeSpan _expirationTime = TimeSpan.FromHours(24); // Tài khoản pending quá 24h sẽ bị xóa

        public ExpiredPendingAccountsCleanupService(
            IServiceScopeFactory scopeFactory,
            ILogger<ExpiredPendingAccountsCleanupService> logger)
        {
            _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "[ExpiredPendingAccountsCleanup] Service started. " +
                "Interval: {Interval}, Expiration: {Expiration}",
                _interval, _expirationTime);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupExpiredPendingAccountsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[ExpiredPendingAccountsCleanup] Error during cleanup");
                }

                try
                {
                    await Task.Delay(_interval, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    // Service đang dừng
                }
            }

            _logger.LogInformation("[ExpiredPendingAccountsCleanup] Service stopping");
        }

        private async Task CleanupExpiredPendingAccountsAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var now = DateTimeOffset.UtcNow;
            var cutoffTime = now - _expirationTime;

            _logger.LogInformation(
                "[ExpiredPendingAccountsCleanup] Checking for pending accounts created before {CutoffTime}",
                cutoffTime);

            // Tìm tất cả tài khoản User có status = "pending" và đã quá hạn
            var expiredAccounts = await context.Accounts
                .Where(a => a.status == "pending")
                .Where(a => a.account_type == Domain.Entities.AccountType.User)
                .Where(a => a.created_at <= cutoffTime)
                .Include(a => a.User) // Bao gồm User để có thể xóa
                .ToListAsync(cancellationToken);

            if (!expiredAccounts.Any())
            {
                _logger.LogInformation("[ExpiredPendingAccountsCleanup] No expired pending accounts found");
                return;
            }

            _logger.LogInformation(
                "[ExpiredPendingAccountsCleanup] Found {Count} expired pending accounts to delete",
                expiredAccounts.Count);

            foreach (var account in expiredAccounts)
            {
                try
                {
                    var email = account.email?.Value ?? "N/A";
                    var phone = account.phone?.Value ?? "N/A";
                    var createdAt = account.created_at;
                    var age = now - createdAt;

                    _logger.LogInformation(
                        "[ExpiredPendingAccountsCleanup] Deleting pending account: " +
                        "ID={AccountId}, Email={Email}, Phone={Phone}, Age={Age}",
                        account.account_id, email, phone, age);

                    // Xóa User entity trước (nếu có)
                    if (account.User != null)
                    {
                        context.Users.Remove(account.User);
                    }

                    // Xóa OTP liên quan (nếu có)
                    var otps = await context.OTPs
                        .Where(o => o.account_id == account.account_id)
                        .ToListAsync(cancellationToken);
                    
                    if (otps.Any())
                    {
                        context.OTPs.RemoveRange(otps);
                    }

                    // Xóa Account
                    context.Accounts.Remove(account);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "[ExpiredPendingAccountsCleanup] Error deleting account {AccountId}",
                        account.account_id);
                }
            }

            var deletedCount = await context.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation(
                "[ExpiredPendingAccountsCleanup] Successfully deleted {Count} pending accounts",
                expiredAccounts.Count);
        }
    }
}
