using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
    {
        public void Configure(EntityTypeBuilder<Permission> builder)
        {
            builder.ToTable("Permissions");
            
            builder.HasKey(p => p.permission_id);
            
            builder.Property(p => p.permission_name)
                   .IsRequired()
                   .HasMaxLength(100);
            
            builder.Property(p => p.display_name)
                   .IsRequired()
                   .HasMaxLength(200);
            
            builder.Property(p => p.module)
                   .IsRequired()
                   .HasMaxLength(50);
            
            builder.Property(p => p.description)
                   .HasMaxLength(500);
            
            builder.Property(p => p.created_at)
                   .IsRequired()
                   .HasDefaultValueSql("GETUTCDATE()");
            
            builder.Property(p => p.updated_at)
                   .IsRequired()
                   .HasDefaultValueSql("GETUTCDATE()");
            
            // Indexes
            builder.HasIndex(p => p.permission_name)
                   .IsUnique()
                   .HasDatabaseName("IX_Permissions_PermissionName");
            
            builder.HasIndex(p => p.module)
                   .HasDatabaseName("IX_Permissions_Module");
        }
    }
}
