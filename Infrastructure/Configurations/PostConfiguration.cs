using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class PostConfiguration : IEntityTypeConfiguration<Post>
    {
        public void Configure(EntityTypeBuilder<Post> builder)
        {
            builder.ToTable("Posts");

            builder.HasKey(p => p.post_id);
            
            builder.Property(p => p.post_id)
                .HasColumnName("post_id");

            builder.Property(p => p.user_id)
                .IsRequired()
                .HasColumnName("user_id");

            builder.Property(p => p.caption)
                .HasMaxLength(2200)
                .HasColumnName("caption");

            builder.Property(p => p.location)
                .HasMaxLength(255)
                .HasColumnName("location");

            builder.Property(p => p.privacy)
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnName("privacy")
                .HasDefaultValue("Public");

            builder.Property(p => p.is_visible)
                .IsRequired()
                .HasColumnName("is_visible")
                .HasDefaultValue(true);

            builder.Property(p => p.CommentsCount)
                .HasColumnName("CommentsCount")
                .HasDefaultValue(0);

            // Store DateTimeOffset as datetime2 in SQL to avoid casting issues
            builder.Property(p => p.created_at)
                .IsRequired()
                .HasColumnName("created_at")
                .HasColumnType("datetime2")
                .HasDefaultValueSql("GETDATE()")
                .HasConversion(
                    v => v.DateTime,
                    v => new DateTimeOffset(v, TimeSpan.Zero));

            // Relationships
            builder.HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.user_id)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(p => p.Media)
                .WithOne(m => m.Post)
                .HasForeignKey(m => m.post_id)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class PostMediaConfiguration : IEntityTypeConfiguration<PostMedia>
    {
        public void Configure(EntityTypeBuilder<PostMedia> builder)
        {
            builder.ToTable("PostMedia");

            builder.HasKey(m => m.media_id);

            builder.Property(m => m.media_id)
                .HasColumnName("media_id");

            builder.Property(m => m.post_id)
                .IsRequired()
                .HasColumnName("post_id");

            builder.Property(m => m.media_url)
                .IsRequired()
                .HasMaxLength(255)
                .HasColumnName("media_url");

            builder.Property(m => m.media_type)
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnName("media_type");

            builder.Property(m => m.media_order)
                .IsRequired()
                .HasColumnName("media_order")
                .HasDefaultValue(0);

            builder.Property(m => m.duration)
                .HasColumnName("duration");

            // Store DateTimeOffset as datetime2 in SQL to avoid casting issues
            builder.Property(m => m.created_at)
                .IsRequired()
                .HasColumnName("created_at")
                .HasColumnType("datetime2")
                .HasDefaultValueSql("GETDATE()")
                .HasConversion(
                    v => v.DateTime,
                    v => new DateTimeOffset(v, TimeSpan.Zero));

            // Relationships
            builder.HasOne(m => m.Post)
                .WithMany(p => p.Media)
                .HasForeignKey(m => m.post_id)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
