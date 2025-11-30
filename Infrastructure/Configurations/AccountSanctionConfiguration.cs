using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;
namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class AccountSanctionConfiguration : IEntityTypeConfiguration<AccountSanction>
    {
        public void Configure(EntityTypeBuilder<AccountSanction> builder)
        {
            builder.ToTable("AccountSanctions");
                 builder.HasKey(acs => acs.sanction_id);
                 builder.Property(acs => acs.sanction_id)
                     .HasColumnName("sanction_id")
                     .ValueGeneratedOnAdd();

                 builder.Property(acs => acs.account_id)
                     .HasColumnName("account_id")
                     .IsRequired();

                 builder.Property(acs => acs.admin_id)
                     .HasColumnName("admin_id");

                 builder.Property(acs => acs.action_type)
                     .HasColumnName("action_type")
                     .HasMaxLength(50)
                     .IsRequired();

                 builder.Property(acs => acs.reason)
                     .HasColumnName("reason")
                     .HasMaxLength(1000);

                 // Use SQL default expression (not a string value)
                 builder.Property(acs => acs.start_at)
                     .HasColumnName("start_at")
                     .HasColumnType("datetime")
                     .HasDefaultValueSql("GETDATE()")
                     .IsRequired();

                 // end_at is nullable in schema
                 builder.Property(acs => acs.end_at)
                     .HasColumnName("end_at")
                     .HasColumnType("datetime")
                     .IsRequired(false);

                 builder.Property(acs => acs.is_active)
                     .HasColumnName("is_active")
                     .HasColumnType("bit")
                     .HasDefaultValue(true);

                 builder.HasIndex(acs => acs.account_id);

                 // admin_id is nullable; when admin deleted SQL uses SET NULL in some places — reflect that
                 builder.HasOne(acs => acs.Admin)
                     .WithMany(a => a.AccountSanctions)
                     .HasForeignKey(acs => acs.admin_id)
                     .OnDelete(DeleteBehavior.SetNull);

                 builder.HasOne(acs => acs.Account)
                     .WithMany(a => a.AccountSanctions)
                     .HasForeignKey(acs => acs.account_id)
                     .OnDelete(DeleteBehavior.Cascade);

        }
    }
}
