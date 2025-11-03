using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class FollowConfiguration : IEntityTypeConfiguration<Follow>
    {
        public void Configure(EntityTypeBuilder<Follow> builder)
        {
            builder.ToTable("Follows");
            builder.HasKey(f => f.follow_id);
            builder.Property(f => f.follower_id).IsRequired();
            builder.Property(f => f.following_id).IsRequired();
            builder.Property(f => f.created_at).HasColumnType("datetime");
        }
    }
}
