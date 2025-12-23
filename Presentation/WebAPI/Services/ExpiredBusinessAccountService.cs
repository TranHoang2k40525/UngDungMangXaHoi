using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.WebAPI.Services
{
    /// <summary>
    /// Background service to automatically downgrade expired Business accounts back to User accounts
    /// Runs every 1 hour to check for expired Business subscriptions
    /// </summary>
    public class ExpiredBusinessAccountService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ExpiredBusinessAccountService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromHours(1); // Check every 1 hour

        public ExpiredBusinessAccountService(
            IServiceScopeFactory scopeFactory, 
            ILogger<ExpiredBusinessAccountService> logger)
        {
            _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "[ExpiredBusinessAccountService] Started. Will check every {Interval}", 
                _interval);

            // Wait a bit before first run to avoid startup load
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndDowngradeExpiredBusinessAccounts(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, 
                        "[ExpiredBusinessAccountService] Error during expired business account check");
                }

                try
                {
                    await Task.Delay(_interval, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    // Service is stopping
                    break;
                }
            }

            _logger.LogInformation("[ExpiredBusinessAccountService] Stopped");
        }

        private async Task CheckAndDowngradeExpiredBusinessAccounts(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            try
            {
                var now = DateTime.UtcNow;
                
                // Find all Business accounts that have expired
                var expiredAccounts = await context.Accounts
                    .Where(a => a.account_type == AccountType.Business)
                    .Where(a => a.business_expires_at.HasValue)
                    .Where(a => a.business_expires_at!.Value <= now)
                    .ToListAsync(cancellationToken);

                if (expiredAccounts.Any())
                {
                    _logger.LogInformation(
                        "[ExpiredBusinessAccountService] Found {Count} expired Business accounts", 
                        expiredAccounts.Count);

                    foreach (var account in expiredAccounts)
                    {
                        try
                        {
                            _logger.LogInformation(
                                "[ExpiredBusinessAccountService] Downgrading account {AccountId} from Business to User. " +
                                "Expired at: {ExpiresAt}", 
                                account.account_id, 
                                account.business_expires_at);

                            // Downgrade to User account
                            account.account_type = AccountType.User;
                            account.business_verified_at = null;
                            // Keep business_expires_at for history/audit purposes
                            account.updated_at = DateTimeOffset.UtcNow;

                            await context.SaveChangesAsync(cancellationToken);

                            _logger.LogInformation(
                                "[ExpiredBusinessAccountService] Successfully downgraded account {AccountId} to User", 
                                account.account_id);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, 
                                "[ExpiredBusinessAccountService] Failed to downgrade account {AccountId}", 
                                account.account_id);
                        }
                    }

                    _logger.LogInformation(
                        "[ExpiredBusinessAccountService] Completed processing {Count} expired Business accounts", 
                        expiredAccounts.Count);
                }
                else
                {
                    _logger.LogDebug(
                        "[ExpiredBusinessAccountService] No expired Business accounts found");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, 
                    "[ExpiredBusinessAccountService] Error querying expired business accounts");
                throw;
            }
        }
    }
}
