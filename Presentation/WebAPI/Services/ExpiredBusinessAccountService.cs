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
                
                // ✅ Find all accounts with Business role that have expired
                var businessRoleId = await context.Roles
                    .Where(r => r.role_name == "Business")
                    .Select(r => r.role_id)
                    .FirstOrDefaultAsync(cancellationToken);

                var expiredBusinessRoles = await context.AccountRoles
                    .Where(ar => ar.role_id == businessRoleId)
                    .Where(ar => ar.is_active)
                    .Where(ar => ar.expires_at.HasValue && ar.expires_at.Value <= now)
                    .Include(ar => ar.Account)
                    .ToListAsync(cancellationToken);

                if (expiredBusinessRoles.Any())
                {
                    _logger.LogInformation(
                        "[ExpiredBusinessAccountService] Found {Count} expired Business roles", 
                        expiredBusinessRoles.Count);

                    foreach (var accountRole in expiredBusinessRoles)
                    {
                        try
                        {
                            _logger.LogInformation(
                                "[ExpiredBusinessAccountService] Deactivating Business role for account {AccountId}. " +
                                "Expired at: {expires_at}", 
                                accountRole.account_id, 
                                accountRole.expires_at);

                            // ✅ Deactivate Business role (RBAC way)
                            accountRole.is_active = false;
                            accountRole.Account.business_verified_at = null;
                            accountRole.Account.updated_at = DateTimeOffset.UtcNow;

                            await context.SaveChangesAsync(cancellationToken);

                            _logger.LogInformation(
                                "[ExpiredBusinessAccountService] Successfully deactivated Business role for account {AccountId}", 
                                accountRole.account_id);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, 
                                "[ExpiredBusinessAccountService] Failed to downgrade account {AccountId}", 
                                accountRole.account_id);
                        }
                    }

                    _logger.LogInformation(
                        "[ExpiredBusinessAccountService] Completed processing {Count} expired Business accounts", 
                        expiredBusinessRoles.Count);
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
