using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class RoleConfiguration : IEntityTypeConfiguration<Role>
    {
        public void Configure(EntityTypeBuilder<Role> builder)
        {
            builder.ToTable("Roles");
            
            builder.HasKey(r => r.role_id);
            
            builder.Property(r => r.role_name)
                   .IsRequired()
                   .HasMaxLength(50);
            
            builder.Property(r => r.description)
                   .HasMaxLength(500);
            
            builder.Property(r => r.is_assignable)
                   .IsRequired()
                   .HasDefaultValue(true);
            
            builder.Property(r => r.priority)
                   .IsRequired()
                   .HasDefaultValue(0);
            
            builder.Property(r => r.created_at)
                   .IsRequired()
                   .HasDefaultValueSql("GETUTCDATE()");
            
            builder.Property(r => r.updated_at)
                   .IsRequired()
                   .HasDefaultValueSql("GETUTCDATE()");
            
            // Indexes
            builder.HasIndex(r => r.role_name)
                   .IsUnique()
                   .HasDatabaseName("IX_Roles_RoleName");
            
            builder.HasIndex(r => r.priority)
                   .HasDatabaseName("IX_Roles_Priority");
        }
    }
}
