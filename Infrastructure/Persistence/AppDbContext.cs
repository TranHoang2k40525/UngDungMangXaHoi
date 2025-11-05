using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Infrastructure.Configurations;

namespace UngDungMangXaHoi.Infrastructure.Persistence
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // DbSets
    public DbSet<Account> Accounts { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Admin> Admins { get; set; } = null!;
    public DbSet<OTP> OTPs { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
    public DbSet<LoginHistory> LoginHistory { get; set; } = null!;
    public DbSet<Post> Posts { get; set; } = null!;
    public DbSet<PostMedia> PostMedia { get; set; } = null!;
    public DbSet<Follow> Follows { get; set; } = null!;
    public DbSet<Reaction> Reactions { get; set; } = null!;
    public DbSet<Share> Shares { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Apply configurations
            modelBuilder.ApplyConfiguration(new AccountConfiguration());
            modelBuilder.ApplyConfiguration(new UserConfiguration());
            modelBuilder.ApplyConfiguration(new AdminConfiguration());
            modelBuilder.ApplyConfiguration(new OTPConfiguration());
            modelBuilder.ApplyConfiguration(new RefreshTokenConfiguration());
            modelBuilder.ApplyConfiguration(new LoginHistoryConfiguration());
            modelBuilder.ApplyConfiguration(new PostConfiguration());
            modelBuilder.ApplyConfiguration(new PostMediaConfiguration());
            modelBuilder.ApplyConfiguration(new FollowConfiguration());
            modelBuilder.ApplyConfiguration(new ReactionConfiguration());
            modelBuilder.ApplyConfiguration(new ShareConfiguration());
            modelBuilder.ApplyConfiguration(new NotificationConfiguration());
        }
    }
}
