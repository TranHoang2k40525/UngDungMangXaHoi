using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class SearchHistoryConfiguration : IEntityTypeConfiguration<SearchHistory>
    {
        public void Configure(EntityTypeBuilder<SearchHistory> builder)
        {
            builder.ToTable("SearchHistory");

            builder.HasKey(sh => sh.id);

            builder.Property(sh => sh.keyword)
                .HasMaxLength(100);

            builder.Property(sh => sh.searched_at)
                .HasDefaultValueSql("GETDATE()");

            // Relationship with User
            builder.HasOne(sh => sh.User)
                .WithMany()
                .HasForeignKey(sh => sh.user_id)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
