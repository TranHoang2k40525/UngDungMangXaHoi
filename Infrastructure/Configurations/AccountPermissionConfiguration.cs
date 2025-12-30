using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class AccountPermissionConfiguration : IEntityTypeConfiguration<AccountPermission>
    {
        public void Configure(EntityTypeBuilder<AccountPermission> builder)
        {
            builder.ToTable("AccountPermissions");
            
            builder.HasKey(ap => ap.account_permission_id);
            
            builder.Property(ap => ap.is_granted)
                   .IsRequired()
                   .HasDefaultValue(true);
            
            builder.Property(ap => ap.assigned_at)
                   .IsRequired()
                   .HasDefaultValueSql("GETUTCDATE()");
            
            builder.Property(ap => ap.expires_at)
                   .IsRequired(false);
            
            builder.Property(ap => ap.assigned_by)
                   .HasMaxLength(100);
            
            builder.Property(ap => ap.reason)
                   .HasMaxLength(500);
            
            // Relationships
            builder.HasOne(ap => ap.Account)
                   .WithMany(a => a.AccountPermissions)
                   .HasForeignKey(ap => ap.account_id)
                   .OnDelete(DeleteBehavior.Cascade);
            
            builder.HasOne(ap => ap.Permission)
                   .WithMany(p => p.AccountPermissions)
                   .HasForeignKey(ap => ap.permission_id)
                   .OnDelete(DeleteBehavior.Restrict);
            
            // Indexes
            builder.HasIndex(ap => new { ap.account_id, ap.permission_id })
                   .HasDatabaseName("IX_AccountPermissions_AccountId_PermissionId");
            
            builder.HasIndex(ap => ap.account_id)
                   .HasDatabaseName("IX_AccountPermissions_AccountId");
            
            builder.HasIndex(ap => ap.permission_id)
                   .HasDatabaseName("IX_AccountPermissions_PermissionId");
            
            builder.HasIndex(ap => ap.expires_at)
                   .HasDatabaseName("IX_AccountPermissions_ExpiresAt");
        }
    }
}
