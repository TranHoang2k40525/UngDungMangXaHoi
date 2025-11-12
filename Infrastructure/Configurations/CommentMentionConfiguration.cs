using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations;

public class CommentMentionConfiguration : IEntityTypeConfiguration<CommentMention>
{
    public void Configure(EntityTypeBuilder<CommentMention> builder)
    {
        builder.ToTable("CommentMentions");
        
        builder.HasKey(cm => cm.CommentMentionId);
        builder.Property(cm => cm.CommentMentionId).HasColumnName("comment_mention_id");
        builder.Property(cm => cm.CommentId).HasColumnName("comment_id");
        builder.Property(cm => cm.MentionedAccountId).HasColumnName("mentioned_account_id");
        builder.Property(cm => cm.StartPosition).HasColumnName("start_position");
        builder.Property(cm => cm.Length).HasColumnName("length");
        builder.Property(cm => cm.CreatedAt).HasColumnName("created_at");
        
        // Relationships
        builder.HasOne(cm => cm.Comment)
            .WithMany(c => c.Mentions)
            .HasForeignKey(cm => cm.CommentId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(cm => cm.MentionedAccount)
            .WithMany()
            .HasForeignKey(cm => cm.MentionedAccountId)
            .OnDelete(DeleteBehavior.NoAction);
        
        // Indexes
        builder.HasIndex(cm => cm.CommentId);
        builder.HasIndex(cm => cm.MentionedAccountId);
    }
}
