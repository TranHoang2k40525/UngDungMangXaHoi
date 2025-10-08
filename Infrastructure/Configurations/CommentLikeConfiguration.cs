using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class CommentLikeConfiguration : IEntityTypeConfiguration<CommentLike>
    {
        public void Configure(EntityTypeBuilder<CommentLike> builder)
        {
            builder.HasKey(cl => cl.Id);

            builder.Property(cl => cl.CommentId)
                .IsRequired();

            builder.Property(cl => cl.UserId)
                .IsRequired();

            builder.Property(cl => cl.CreatedAt)
                .IsRequired();

            // Indexes
            builder.HasIndex(cl => cl.CommentId);
            builder.HasIndex(cl => cl.UserId);
            builder.HasIndex(cl => new { cl.CommentId, cl.UserId }).IsUnique();

            // Relationships
            builder.HasOne(cl => cl.Comment)
                .WithMany(c => c.Likes)
                .HasForeignKey(cl => cl.CommentId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(cl => cl.User)
                .WithMany()
                .HasForeignKey(cl => cl.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
