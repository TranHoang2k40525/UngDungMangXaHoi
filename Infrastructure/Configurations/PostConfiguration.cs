using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class PostConfiguration : IEntityTypeConfiguration<Post>
    {
        public void Configure(EntityTypeBuilder<Post> builder)
        {
            builder.HasKey(p => p.Id);

            builder.Property(p => p.AuthorId)
                .IsRequired();

            builder.Property(p => p.Content)
                .HasMaxLength(2000)
                .IsRequired();

            builder.Property(p => p.CreatedAt)
                .IsRequired();

            builder.Property(p => p.UpdatedAt)
                .IsRequired();

            builder.Property(p => p.IsDeleted)
                .IsRequired()
                .HasDefaultValue(false);

            builder.Property(p => p.LikeCount)
                .IsRequired()
                .HasDefaultValue(0);

            builder.Property(p => p.CommentCount)
                .IsRequired()
                .HasDefaultValue(0);

            builder.Property(p => p.ShareCount)
                .IsRequired()
                .HasDefaultValue(0);

            // Configure ImageUrls as JSON
            builder.Property(p => p.ImageUrls)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions)null),
                    v => System.Text.Json.JsonSerializer.Deserialize<List<Domain.ValueObjects.ImageUrl>>(v, (System.Text.Json.JsonSerializerOptions)null) ?? new List<Domain.ValueObjects.ImageUrl>())
                .HasColumnType("nvarchar(max)");

            // Configure VideoUrls as JSON
            builder.Property(p => p.VideoUrls)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions)null),
                    v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");

            // Indexes
            builder.HasIndex(p => p.AuthorId);
            builder.HasIndex(p => p.CreatedAt);
            builder.HasIndex(p => p.IsDeleted);

            // Relationships
            builder.HasOne(p => p.Author)
                .WithMany(u => u.Posts)
                .HasForeignKey(p => p.AuthorId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(p => p.Comments)
                .WithOne(c => c.Post)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(p => p.Likes)
                .WithOne(pl => pl.Post)
                .HasForeignKey(pl => pl.PostId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}

