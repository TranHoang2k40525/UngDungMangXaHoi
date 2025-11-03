using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class OTPConfiguration : IEntityTypeConfiguration<OTP>
    {
        public void Configure(EntityTypeBuilder<OTP> builder)
        {
            builder.ToTable("OTPs");
            builder.HasKey(o => o.otp_id);

            builder.Property(o => o.otp_id)
                   .ValueGeneratedOnAdd();

            builder.Property(o => o.account_id)
                   .IsRequired();

            builder.Property(o => o.otp_hash)
                   .IsRequired()
                   .HasMaxLength(255);

            builder.Property(o => o.purpose)
                   .IsRequired()
                   .HasMaxLength(50);

            builder.Property(o => o.expires_at)
                   .IsRequired()
                   .HasConversion(
                       v => v.DateTime,
                       v => new DateTimeOffset(v, TimeSpan.Zero));

            builder.Property(o => o.used)
                   .IsRequired()
                   .HasDefaultValue(false);

            builder.Property(o => o.created_at)
                   .IsRequired()
                   .HasDefaultValueSql("GETDATE()")
                   .HasConversion(
                       v => v.DateTime,
                       v => new DateTimeOffset(v, TimeSpan.Zero));

            // Cấu hình mối quan hệ với Account
            builder.HasOne(o => o.Account)
                   .WithMany() // Account có thể có nhiều OTP
                   .HasForeignKey(o => o.account_id)
                   .OnDelete(DeleteBehavior.Cascade);

            // Index
            builder.HasIndex(o => new { o.account_id, o.otp_hash });
        }
    }
}