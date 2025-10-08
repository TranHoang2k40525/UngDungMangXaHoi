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
        public DbSet<User> Users { get; set; }
        public DbSet<Post> Posts { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Friendship> Friendships { get; set; }
        public DbSet<PostLike> PostLikes { get; set; }
        public DbSet<CommentLike> CommentLikes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Apply configurations
            modelBuilder.ApplyConfiguration(new UserConfiguration());
            modelBuilder.ApplyConfiguration(new PostConfiguration());
            modelBuilder.ApplyConfiguration(new CommentConfiguration());
            modelBuilder.ApplyConfiguration(new FriendshipConfiguration());
            modelBuilder.ApplyConfiguration(new PostLikeConfiguration());
            modelBuilder.ApplyConfiguration(new CommentLikeConfiguration());
        }
    }
}
