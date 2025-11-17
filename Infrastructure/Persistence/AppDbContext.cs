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

        // DbSets for each entity
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
    public DbSet<Comment> Comments { get; set; } = null!;
    public DbSet<CommentMention> CommentMentions { get; set; } = null!;
    public DbSet<CommentReaction> CommentReactions { get; set; } = null!;
    public DbSet<CommentEditHistory> CommentEditHistories { get; set; } = null!;
    // Stories
    public DbSet<Story> Stories { get; set; }
    public DbSet<StoryView> StoryViews { get; set; }
    // Group Chat
    public DbSet<GroupConversation> Conversations { get; set; }
    public DbSet<GroupConversationMember> ConversationMembers { get; set; }
    public DbSet<GroupMessage> Messages { get; set; } // ✅ Thêm DbSet GroupMessage
    public DbSet<GroupMessageReaction> MessageReactions { get; set; }
    public DbSet<GroupMessageRead> MessageReads { get; set; }

    public DbSet<Block> Blocks { get; set; }
    public DbSet<GroupMessageRestriction> MessageRestrictions { get; set; }
 


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
            modelBuilder.ApplyConfiguration(new CommentConfiguration());
            modelBuilder.ApplyConfiguration(new CommentMentionConfiguration());
            modelBuilder.ApplyConfiguration(new CommentReactionConfiguration());
            modelBuilder.ApplyConfiguration(new CommentEditHistoryConfiguration());
            modelBuilder.ApplyConfiguration(new StoryConfiguration());
            modelBuilder.ApplyConfiguration(new StoryViewConfiguration());
            modelBuilder.ApplyConfiguration(new GroupConversationConfiguration());
            modelBuilder.ApplyConfiguration(new GroupConversationMemberConfiguration());
            modelBuilder.ApplyConfiguration(new BlockConfiguration());
            modelBuilder.ApplyConfiguration(new GroupMessageRestrictionConfiguration());

            // Configure composite keys for group message reactions and reads
            modelBuilder.Entity<GroupMessageReaction>().HasKey(r => new { r.message_id, r.user_id });
            modelBuilder.Entity<GroupMessageRead>().HasKey(r => new { r.message_id, r.user_id });

        }
    }
}
