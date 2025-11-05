using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class CommentConfiguration : IEntityTypeConfiguration<Comment>
    {
        public void Configure(EntityTypeBuilder<Comment> builder)
        {
            builder.ToTable("Comments");
            
            // Primary Key
            builder.HasKey(c => c.Id);
            builder.Property(c => c.Id).HasColumnName("comment_id");
            
            // Column Mappings (PascalCase → snake_case)
            builder.Property(c => c.Content)
                .HasColumnName("content")
                .IsRequired()
                .HasMaxLength(2000);
            
            builder.Property(c => c.PostId).HasColumnName("post_id");
            builder.Property(c => c.UserId).HasColumnName("user_id");
            builder.Property(c => c.ParentCommentId).HasColumnName("parent_comment_id");
            
            builder.Property(c => c.MentionedUserIds)
                .HasColumnName("mentioned_user_ids")
                .HasMaxLength(500);
            
            builder.Property(c => c.Hashtags)
                .HasColumnName("hashtags")
                .HasMaxLength(500);
            
            builder.Property(c => c.LikesCount)
                .HasColumnName("likes_count")
                .HasDefaultValue(0);
            
            builder.Property(c => c.RepliesCount)
                .HasColumnName("replies_count")
                .HasDefaultValue(0);
            
            builder.Property(c => c.IsDeleted)
                .HasColumnName("is_deleted")
                .HasDefaultValue(false);
            
            builder.Property(c => c.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();
            
            builder.Property(c => c.UpdatedAt)
                .HasColumnName("updated_at");
            
            // Ignore shadow properties that EF might auto-generate
            builder.Ignore("IsEdited");
            builder.Ignore("EditedAt");
            
            // Relationships
            builder.HasOne(c => c.Post)
                .WithMany()
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);
            
            builder.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            
            builder.HasOne(c => c.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentCommentId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Indexes
            builder.HasIndex(c => c.PostId);
            builder.HasIndex(c => c.UserId);
            builder.HasIndex(c => c.ParentCommentId);
            builder.HasIndex(c => c.CreatedAt);
        }
    }

    public class CommentLikeConfiguration : IEntityTypeConfiguration<CommentLike>
    {
        public void Configure(EntityTypeBuilder<CommentLike> builder)
        {
            builder.ToTable("CommentLikes");
            
            // Primary Key - Map to like_id (snake_case)
            builder.HasKey(cl => cl.LikeId);
            builder.Property(cl => cl.LikeId).HasColumnName("like_id");
            
            // Column Mappings - Map to snake_case
            builder.Property(cl => cl.CommentId).HasColumnName("comment_id");
            builder.Property(cl => cl.UserId).HasColumnName("user_id");
            
            builder.Property(cl => cl.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();
            
            // Relationships
            builder.HasOne(cl => cl.Comment)
                .WithMany(c => c.CommentLikes)
                .HasForeignKey(cl => cl.CommentId)
                .OnDelete(DeleteBehavior.Cascade);
            
            builder.HasOne(cl => cl.User)
                .WithMany()
                .HasForeignKey(cl => cl.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Unique constraint: one user can only like a comment once
            builder.HasIndex(cl => new { cl.CommentId, cl.UserId })
                .IsUnique();
        }
    }
}
