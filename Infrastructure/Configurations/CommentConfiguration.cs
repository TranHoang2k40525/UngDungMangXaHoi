using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations;

public class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> builder)
    {
        builder.ToTable("Comments");
        
        // Map to snake_case column names matching your database
        builder.HasKey(c => c.CommentId);
        builder.Property(c => c.CommentId).HasColumnName("comment_id");
        builder.Property(c => c.PostId).HasColumnName("post_id");
        builder.Property(c => c.UserId).HasColumnName("user_id");
        builder.Property(c => c.ParentCommentId).HasColumnName("parent_comment_id");
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at");
        builder.Property(c => c.IsDeleted).HasColumnName("is_deleted");
        builder.Property(c => c.IsVisible).HasColumnName("is_visible");
        builder.Property(c => c.IsEdited).HasColumnName("is_edited");
        builder.Property(c => c.LikesCount).HasColumnName("likes_count");
        builder.Property(c => c.RepliesCount).HasColumnName("replies_count");
        builder.Property(c => c.MentionedUserIds).HasColumnName("mentioned_user_ids");
        
        builder.Property(c => c.Content)
            .HasColumnName("content")
            .IsRequired()
            .HasMaxLength(5000);
        
        builder.Property(c => c.Hashtags)
            .HasColumnName("hashtags")
            .HasMaxLength(1000);
        
        builder.Property(c => c.CreatedAt)
            .IsRequired();
        
        builder.Property(c => c.IsDeleted)
            .HasDefaultValue(false);
        
        builder.Property(c => c.IsVisible)
            .HasDefaultValue(true);
        
        builder.Property(c => c.IsEdited)
            .HasDefaultValue(false);
        
        // Relationship with Post
        builder.HasOne(c => c.Post)
            .WithMany(p => p.Comments)
            .HasForeignKey(c => c.PostId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Relationship with User (Author)
        builder.HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.NoAction);
        
        // Self-referencing relationship for replies
        builder.HasOne(c => c.ParentComment)
            .WithMany(c => c.Replies)
            .HasForeignKey(c => c.ParentCommentId)
            .OnDelete(DeleteBehavior.NoAction);
        
        // Index for performance
        builder.HasIndex(c => c.PostId);
        builder.HasIndex(c => c.UserId);
        builder.HasIndex(c => c.ParentCommentId);
        builder.HasIndex(c => c.CreatedAt);
    }
}
