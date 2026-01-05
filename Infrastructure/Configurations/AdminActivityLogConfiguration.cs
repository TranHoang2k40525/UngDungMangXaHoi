using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations;

public class AdminActivityLogConfiguration : IEntityTypeConfiguration<AdminActivityLog>
{
    public void Configure(EntityTypeBuilder<AdminActivityLog> builder)
    {
        builder.ToTable("AdminActivityLogs");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.AdminAccountId)
            .IsRequired();

        builder.Property(a => a.AdminName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.AdminEmail)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.Action)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(a => a.EntityType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(a => a.EntityId);

        builder.Property(a => a.Details)
            .HasMaxLength(4000);

        builder.Property(a => a.IpAddress)
            .HasMaxLength(45);

        builder.Property(a => a.Timestamp)
            .IsRequired()
            .HasDefaultValueSql("SYSDATETIMEOFFSET()");

        builder.HasIndex(a => a.AdminAccountId);
        builder.HasIndex(a => a.Action);
        builder.HasIndex(a => a.Timestamp);
    }
}
