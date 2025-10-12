using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class AccountConfiguration : IEntityTypeConfiguration<Account>
    {
        public void Configure(EntityTypeBuilder<Account> builder)
        {
            builder.ToTable("Accounts");
            builder.HasKey(a => a.account_id);

            builder.Property(a => a.account_id)
                   .ValueGeneratedOnAdd();

            builder.OwnsOne(a => a.email, eb =>
            {
                eb.Property(e => e.Value)
                  .HasColumnName("email")
                  .HasMaxLength(100);
                eb.HasIndex(e => e.Value).IsUnique();
            });

            builder.OwnsOne(a => a.phone, pb =>
            {
                pb.Property(p => p.Value)
                  .HasColumnName("phone")
                  .HasMaxLength(20);
                pb.HasIndex(p => p.Value).IsUnique();
            });

            builder.OwnsOne(a => a.password_hash, phb =>
            {
                phb.Property(ph => ph.Value)
                   .HasColumnName("password_hash")
                   .HasMaxLength(255)
                   .IsRequired();
            });

            builder.Property(a => a.account_type)
                   .HasMaxLength(20)
                   .IsRequired()
                   .HasConversion(v => v.ToString(), v => (AccountType)Enum.Parse(typeof(AccountType), v));

            builder.Property(a => a.status)
                   .HasMaxLength(20)
                   .IsRequired()
                   .HasDefaultValue("active");

            builder.Property(a => a.created_at)
                   .IsRequired()
                   .HasDefaultValueSql("GETDATE()")
                   .HasConversion(
                       v => v.DateTime,
                       v => new DateTimeOffset(v, TimeSpan.Zero));

            builder.Property(a => a.updated_at)
                   .IsRequired()
                   .HasDefaultValueSql("GETDATE()")
                   .HasConversion(
                       v => v.DateTime,
                       v => new DateTimeOffset(v, TimeSpan.Zero));

            builder.HasOne(a => a.Admin)
                   .WithOne(a => a.Account)
                   .HasForeignKey<Admin>(a => a.account_id)
                   .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(a => a.account_type);
        }
    }
}
