using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class LoginHistoryConfiguration : IEntityTypeConfiguration<LoginHistory>
    {
        public void Configure(EntityTypeBuilder<LoginHistory> builder)
        {
            builder.ToTable("LoginHistory");
            builder.HasKey(h => h.history_id);

            builder.Property(h => h.history_id)
                   .ValueGeneratedOnAdd();

            builder.Property(h => h.account_id)
                   .IsRequired();

            builder.Property(h => h.ip_address)
                   .HasMaxLength(50);

            builder.Property(h => h.device_info)
                   .HasMaxLength(500);

            builder.Property(h => h.login_time)
                   .IsRequired()
                   .HasDefaultValueSql("GETDATE()")
                   .HasConversion(
                       v => v.DateTime,
                       v => new DateTimeOffset(v, TimeSpan.Zero));

            // Cấu hình mối quan hệ với Account
            builder.HasOne(h => h.Account)
                   .WithMany()
                   .HasForeignKey(h => h.account_id)
                   .OnDelete(DeleteBehavior.Cascade);
        }
    }
}