using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class AdminConfiguration : IEntityTypeConfiguration<Admin>
    {
        public void Configure(EntityTypeBuilder<Admin> builder)
        {
            builder.ToTable("Admins");
            builder.HasKey(a => a.admin_id);

            builder.Property(a => a.admin_id)
                   .ValueGeneratedOnAdd();

            builder.Property(a => a.account_id)
                   .IsRequired();

            builder.Property(a => a.full_name)
                   .HasMaxLength(100);

            builder.Property(a => a.gender)
                   .HasMaxLength(10)
                   .HasConversion(v => v.ToString(), v => (Gender)Enum.Parse(typeof(Gender), v));

            builder.Property(a => a.bio)
                   .HasMaxLength(255);

            builder.OwnsOne(a => a.avatar_url, aub =>
            {
                aub.Property(au => au.Value)
                   .HasColumnName("avatar_url")
                   .HasColumnType("NVARCHAR(MAX)"); // Hỗ trợ Base64 image (dài)
            });

            builder.Property(a => a.is_private)
                   .IsRequired()
                   .HasDefaultValue(false);

            builder.Property(a => a.date_of_birth)
                   .HasColumnType("date")
                   .HasConversion(
                       v => v.Date,
                       v => new DateTimeOffset(v, TimeSpan.Zero));

            builder.Property(a => a.address)
                   .HasMaxLength(255);

            builder.Property(a => a.hometown)
                   .HasMaxLength(255);

            builder.Property(a => a.job)
                   .HasMaxLength(255);

            builder.Property(a => a.website)
                   .HasMaxLength(255);

            builder.Property(a => a.admin_level)
                   .IsRequired()
                   .HasMaxLength(20)
                   .HasDefaultValue("moderator");

            // Indexes
            builder.HasIndex(a => a.account_id).IsUnique();
        }
    }
}