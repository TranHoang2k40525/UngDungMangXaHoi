using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.HasKey(u => u.user_id);

            builder.Property(u => u.username)
                .HasConversion(
                    v => v.Value,
                    v => new UserName(v))
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(u => u.full_name)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(u => u.date_of_birth)
                .HasColumnType("date")
                .IsRequired();

            builder.Property(u => u.gender)
                .HasMaxLength(10)
                .IsRequired()
                .HasConversion(
                    v => v.ToString(),
                    v => (Gender)Enum.Parse(typeof(Gender), v));

            builder.Property(u => u.avatar_url)
                .HasConversion(
                    v => v != null ? v.Value : null,
                    v => v != null ? new ImageUrl(v) : null)
                .HasMaxLength(255);

            builder.Property(u => u.bio)
                .HasMaxLength(255);

            builder.Property(u => u.is_private)
                .IsRequired()
                .HasDefaultValue(false);

            builder.HasOne(u => u.Account)
                .WithOne(a => a.User)
                .HasForeignKey<User>(u => u.account_id)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            builder.HasIndex(u => u.username).IsUnique();
            builder.HasIndex(u => u.account_id).IsUnique();
        }
    }

    public class AccountConfiguration : IEntityTypeConfiguration<Account>
    {
        public void Configure(EntityTypeBuilder<Account> builder)
        {
            builder.HasKey(a => a.account_id);

            builder.Property(a => a.email)
                .HasConversion(
                    v => v != null ? v.Value : null,
                    v => v != null ? new Email(v) : null)
                .HasMaxLength(100);

            builder.Property(a => a.phone)
                .HasConversion(
                    v => v != null ? v.Value : null,
                    v => v != null ? new PhoneNumber(v) : null)
                .HasMaxLength(20);

            builder.Property(a => a.password_hash)
                .HasConversion(
                    v => v.Value,
                    v => new PasswordHash(v))
                .HasMaxLength(255)
                .IsRequired();

            builder.Property(a => a.account_type)
                .HasMaxLength(20)
                .IsRequired()
                .HasConversion(
                    v => v.ToString(),
                    v => (AccountType)Enum.Parse(typeof(AccountType), v));

            builder.Property(a => a.status)
                .HasMaxLength(20)
                .IsRequired()
                .HasDefaultValue("active");

            builder.Property(a => a.created_at)
                .IsRequired();

            builder.Property(a => a.updated_at)
                .IsRequired();

            // Indexes
            builder.HasIndex(a => a.email).IsUnique();
            builder.HasIndex(a => a.phone).IsUnique();
            builder.HasIndex(a => a.account_type);
        }
    }
}