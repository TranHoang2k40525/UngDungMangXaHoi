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
            builder.ToTable("Users");
            builder.HasKey(u => u.user_id);

            builder.Property(u => u.user_id)
                   .ValueGeneratedOnAdd();

            builder.OwnsOne(u => u.username, ub =>
            {
                ub.Property(un => un.Value)
                  .HasColumnName("username")
                  .HasMaxLength(50)
                  .IsRequired();
                ub.HasIndex(un => un.Value).IsUnique();
            });

            builder.Property(u => u.full_name)
                   .HasMaxLength(100)
                   .IsRequired();

            builder.Property(u => u.date_of_birth)
                   .HasColumnType("date")
                   .IsRequired()
                   .HasConversion(
                       v => v.Date,
                       v => new DateTimeOffset(v, TimeSpan.Zero));

            builder.Property(u => u.gender)
                   .HasMaxLength(10)
                   .IsRequired()
                   .HasConversion(v => v.ToString(), v => (Gender)Enum.Parse(typeof(Gender), v));

            builder.OwnsOne(u => u.avatar_url, aub =>
            {
                aub.Property(au => au.Value)
                   .HasColumnName("avatar_url")
                   .HasMaxLength(255);
            });

            builder.Property(u => u.bio)
                   .HasMaxLength(255);

            builder.Property(u => u.is_private)
                   .IsRequired()
                   .HasDefaultValue(false);

            builder.Property(u => u.address)
                   .HasMaxLength(255);

            builder.Property(u => u.hometown)
                   .HasMaxLength(255);

            builder.Property(u => u.job)
                   .HasMaxLength(255);

            builder.Property(u => u.website)
                   .HasMaxLength(255);

            builder.HasOne(u => u.Account)
                   .WithOne(a => a.User)
                   .HasForeignKey<User>(u => u.account_id)
                   .IsRequired()
                   .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(u => u.account_id).IsUnique();
        }
    }

}
