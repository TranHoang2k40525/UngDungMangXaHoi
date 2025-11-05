using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
    {
        public void Configure(EntityTypeBuilder<Notification> builder)
        {
            builder.ToTable("Notifications");

            builder.HasKey(n => n.notification_id);

            builder.Property(n => n.notification_id)
                .HasColumnName("notification_id");

            builder.Property(n => n.user_id)
                .IsRequired()
                .HasColumnName("user_id");

            builder.Property(n => n.sender_id)
                .HasColumnName("sender_id");

            builder.Property(n => n.type)
                .IsRequired()
                .HasColumnName("type")
                .HasConversion<int>();

            builder.Property(n => n.post_id)
                .HasColumnName("post_id");

            builder.Property(n => n.content)
                .IsRequired()
                .HasMaxLength(500)
                .HasColumnName("content");

            builder.Property(n => n.is_read)
                .IsRequired()
                .HasColumnName("is_read")
                .HasDefaultValue(false);

            builder.Property(n => n.created_at)
                .IsRequired()
                .HasColumnName("created_at")
                .HasColumnType("datetime2")
                .HasDefaultValueSql("GETDATE()")
                .HasConversion(
                    v => v.DateTime,
                    v => new DateTimeOffset(v, TimeSpan.Zero));

            // Index cho query nhanh
            builder.HasIndex(n => new { n.user_id, n.is_read, n.created_at })
                .HasDatabaseName("IX_Notification_UserId_IsRead_CreatedAt");

            // Relationships
            builder.HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.user_id)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(n => n.Sender)
                .WithMany()
                .HasForeignKey(n => n.sender_id)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasOne(n => n.Post)
                .WithMany()
                .HasForeignKey(n => n.post_id)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
