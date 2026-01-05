using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class AccountRoleConfiguration : IEntityTypeConfiguration<AccountRole>
    {
        public void Configure(EntityTypeBuilder<AccountRole> builder)
        {
            builder.ToTable("AccountRoles");
            
            builder.HasKey(ar => ar.account_role_id);
            
            builder.Property(ar => ar.assigned_at)
                   .IsRequired()
                   .HasDefaultValueSql("GETUTCDATE()");
            
            builder.Property(ar => ar.expires_at)
                   .IsRequired(false);
            
            builder.Property(ar => ar.is_active)
                   .IsRequired()
                   .HasDefaultValue(true);
            
            builder.Property(ar => ar.assigned_by)
                   .HasMaxLength(100);
            
            // Relationships
            builder.HasOne(ar => ar.Account)
                   .WithMany(a => a.AccountRoles)
                   .HasForeignKey(ar => ar.account_id)
                   .OnDelete(DeleteBehavior.Cascade);
            
            builder.HasOne(ar => ar.Role)
                   .WithMany(r => r.AccountRoles)
                   .HasForeignKey(ar => ar.role_id)
                   .OnDelete(DeleteBehavior.Restrict);
            
            // Indexes
            builder.HasIndex(ar => new { ar.account_id, ar.role_id })
                   .HasDatabaseName("IX_AccountRoles_AccountId_RoleId");
            
            builder.HasIndex(ar => ar.account_id)
                   .HasDatabaseName("IX_AccountRoles_AccountId");
            
            builder.HasIndex(ar => ar.role_id)
                   .HasDatabaseName("IX_AccountRoles_RoleId");
            
            builder.HasIndex(ar => ar.expires_at)
                   .HasDatabaseName("IX_AccountRoles_ExpiresAt");
        }
    }
}
