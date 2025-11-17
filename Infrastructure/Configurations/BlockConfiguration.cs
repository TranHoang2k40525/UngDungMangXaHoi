using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class BlockConfiguration : IEntityTypeConfiguration<Block>
    {
        public void Configure(EntityTypeBuilder<Block> builder)
        {
            builder.ToTable("Blocks");
            builder.HasKey(b => b.block_id);
            
            builder.Property(b => b.blocker_id).IsRequired();
            builder.Property(b => b.blocked_id).IsRequired();
            builder.Property(b => b.created_at).HasColumnType("datetime");
            
            // Unique constraint: một user chỉ có thể chặn một user khác một lần
            builder.HasIndex(b => new { b.blocker_id, b.blocked_id })
                   .IsUnique();
            
            // Relationships
            builder.HasOne(b => b.Blocker)
                   .WithMany()
                   .HasForeignKey(b => b.blocker_id)
                   .OnDelete(DeleteBehavior.Restrict);
            
            builder.HasOne(b => b.Blocked)
                   .WithMany()
                   .HasForeignKey(b => b.blocked_id)
                   .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
