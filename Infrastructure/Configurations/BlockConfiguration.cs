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
        }
    }
}
