using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.HasKey(u => u.Id);

            builder.Property(u => u.UserName)
                .HasConversion(
                    v => v.Value,
                    v => new Domain.ValueObjects.UserName(v))
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(u => u.Email)
                .HasConversion(
                    v => v.Value,
                    v => new Domain.ValueObjects.Email(v))
                .HasMaxLength(255)
                .IsRequired();

            builder.Property(u => u.PasswordHash)
                .HasConversion(
                    v => v.Value,
                    v => new Domain.ValueObjects.PasswordHash(v))
                .HasMaxLength(255)
                .IsRequired();

            builder.Property(u => u.FirstName)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(u => u.LastName)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(u => u.ProfileImageUrl)
                .HasConversion(
                    v => v != null ? v.Value : null,
                    v => v != null ? new Domain.ValueObjects.ImageUrl(v) : null)
                .HasMaxLength(500);

            builder.Property(u => u.CoverImageUrl)
                .HasConversion(
                    v => v != null ? v.Value : null,
                    v => v != null ? new Domain.ValueObjects.ImageUrl(v) : null)
                .HasMaxLength(500);

            builder.Property(u => u.Bio)
                .HasMaxLength(500);

            builder.Property(u => u.CreatedAt)
                .IsRequired();

            builder.Property(u => u.UpdatedAt)
                .IsRequired();

            builder.Property(u => u.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            // Indexes
            builder.HasIndex(u => u.Email).IsUnique();
            builder.HasIndex(u => u.UserName).IsUnique();
            builder.HasIndex(u => u.CreatedAt);

            // Relationships
            builder.HasMany(u => u.Posts)
                .WithOne(p => p.Author)
                .HasForeignKey(p => p.AuthorId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(u => u.Comments)
                .WithOne(c => c.Author)
                .HasForeignKey(c => c.AuthorId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(u => u.SentFriendRequests)
                .WithOne(f => f.Requester)
                .HasForeignKey(f => f.RequesterId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(u => u.ReceivedFriendRequests)
                .WithOne(f => f.Addressee)
                .HasForeignKey(f => f.AddresseeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}

