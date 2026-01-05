using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
    {
        public void Configure(EntityTypeBuilder<RolePermission> builder)
        {
            builder.ToTable("RolePermissions");
            
            builder.HasKey(rp => rp.role_permission_id);
            
            builder.Property(rp => rp.granted_at)
                   .IsRequired()
                   .HasDefaultValueSql("GETUTCDATE()");
            
            builder.Property(rp => rp.granted_by)
                   .HasMaxLength(100);
            
            // Relationships
            builder.HasOne(rp => rp.Role)
                   .WithMany(r => r.RolePermissions)
                   .HasForeignKey(rp => rp.role_id)
                   .OnDelete(DeleteBehavior.Cascade);
            
            builder.HasOne(rp => rp.Permission)
                   .WithMany(p => p.RolePermissions)
                   .HasForeignKey(rp => rp.permission_id)
                   .OnDelete(DeleteBehavior.Cascade);
            
            // Indexes
            builder.HasIndex(rp => new { rp.role_id, rp.permission_id })
                   .IsUnique()
                   .HasDatabaseName("IX_RolePermissions_RoleId_PermissionId");
            
            builder.HasIndex(rp => rp.role_id)
                   .HasDatabaseName("IX_RolePermissions_RoleId");
            
            builder.HasIndex(rp => rp.permission_id)
                   .HasDatabaseName("IX_RolePermissions_PermissionId");
        }
    }
}
