using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class ShareConfiguration : IEntityTypeConfiguration<Share>
    {
        public void Configure(EntityTypeBuilder<Share> builder)
        {
            builder.ToTable("Shares");

            builder.HasKey(s => s.share_id);

            builder.Property(s => s.share_id)
                .HasColumnName("share_id");

            builder.Property(s => s.post_id)
                .IsRequired()
                .HasColumnName("post_id");

            builder.Property(s => s.user_id)
                .IsRequired()
                .HasColumnName("user_id");

            builder.Property(s => s.caption)
                .HasMaxLength(2200)
                .HasColumnName("caption");

            builder.Property(s => s.privacy)
                .IsRequired()
                .HasMaxLength(50)
                .HasColumnName("privacy")
                .HasDefaultValue("public");

            builder.Property(s => s.created_at)
                .IsRequired()
                .HasColumnName("created_at")
                .HasColumnType("datetime2")
                .HasDefaultValueSql("GETDATE()")
                .HasConversion(
                    v => v.DateTime,
                    v => new DateTimeOffset(v, TimeSpan.Zero));

            // Relationships
            builder.HasOne(s => s.Post)
                .WithMany()
                .HasForeignKey(s => s.post_id)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.user_id)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
