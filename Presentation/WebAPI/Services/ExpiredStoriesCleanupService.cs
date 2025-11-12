using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using UngDungMangXaHoi.Application.Services;

namespace UngDungMangXaHoi.WebAPI.Services
{
    public class ExpiredStoriesCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ExpiredStoriesCleanupService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromMinutes(10); // run every 10 minutes

        public ExpiredStoriesCleanupService(IServiceScopeFactory scopeFactory, ILogger<ExpiredStoriesCleanupService> logger)
        {
            _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ExpiredStoriesCleanupService started, interval {Interval}", _interval);
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var storyService = scope.ServiceProvider.GetRequiredService<StoryService>();
                        var deleted = await storyService.DeleteExpiredStoriesAsync();
                        if (deleted > 0)
                        {
                            _logger.LogInformation("ExpiredStoriesCleanupService deleted {Count} expired stories", deleted);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "ExpiredStoriesCleanupService failed during cleanup");
                }

                try
                {
                    await Task.Delay(_interval, stoppingToken);
                }
                catch (TaskCanceledException) { }
            }
            _logger.LogInformation("ExpiredStoriesCleanupService stopping");
        }
    }
}
