using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class PostLikeConfiguration : IEntityTypeConfiguration<PostLike>
    {
        public void Configure(EntityTypeBuilder<PostLike> builder)
        {
            builder.HasKey(pl => pl.Id);

            builder.Property(pl => pl.PostId)
                .IsRequired();

            builder.Property(pl => pl.UserId)
                .IsRequired();

            builder.Property(pl => pl.CreatedAt)
                .IsRequired();

            // Indexes
            builder.HasIndex(pl => pl.PostId);
            builder.HasIndex(pl => pl.UserId);
            builder.HasIndex(pl => new { pl.PostId, pl.UserId }).IsUnique();

            // Relationships
            builder.HasOne(pl => pl.Post)
                .WithMany(p => p.Likes)
                .HasForeignKey(pl => pl.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(pl => pl.User)
                .WithMany()
                .HasForeignKey(pl => pl.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}

