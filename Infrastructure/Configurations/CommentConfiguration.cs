using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class CommentConfiguration : IEntityTypeConfiguration<Comment>
    {
        public void Configure(EntityTypeBuilder<Comment> builder)
        {
            builder.HasKey(c => c.Id);

            builder.Property(c => c.PostId)
                .IsRequired();

            builder.Property(c => c.AuthorId)
                .IsRequired();

            builder.Property(c => c.Content)
                .HasMaxLength(500)
                .IsRequired();

            builder.Property(c => c.CreatedAt)
                .IsRequired();

            builder.Property(c => c.UpdatedAt)
                .IsRequired();

            builder.Property(c => c.IsDeleted)
                .IsRequired()
                .HasDefaultValue(false);

            builder.Property(c => c.LikeCount)
                .IsRequired()
                .HasDefaultValue(0);

            // Indexes
            builder.HasIndex(c => c.PostId);
            builder.HasIndex(c => c.AuthorId);
            builder.HasIndex(c => c.ParentCommentId);
            builder.HasIndex(c => c.CreatedAt);
            builder.HasIndex(c => c.IsDeleted);

            // Relationships
            builder.HasOne(c => c.Post)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(c => c.Author)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.AuthorId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(c => c.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentCommentId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(c => c.Likes)
                .WithOne(cl => cl.Comment)
                .HasForeignKey(cl => cl.CommentId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}

