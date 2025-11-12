using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class MessageConfiguration : IEntityTypeConfiguration<Message>
    {
        public void Configure(EntityTypeBuilder<Message> builder)
        {
            builder.ToTable("MessagesNew");
            
            builder.HasKey(m => m.message_id);

            builder.Property(m => m.content)
                .IsRequired()
                .HasMaxLength(5000);

            builder.Property(m => m.message_type)
                .HasConversion<string>()
                .HasMaxLength(20);

            builder.Property(m => m.status)
                .HasConversion<string>()
                .HasMaxLength(20);

            builder.Property(m => m.media_url)
                .HasMaxLength(500);

            builder.Property(m => m.thumbnail_url)
                .HasMaxLength(500);

            builder.Property(m => m.is_deleted)
                .HasDefaultValue(false);

            builder.Property(m => m.created_at)
                .HasDefaultValueSql("GETDATE()");

            builder.Property(m => m.updated_at)
                .IsRequired(false);

            builder.Property(m => m.read_at)
                .IsRequired(false);

            // Relationships
            builder.HasOne(m => m.Conversation)
                .WithMany()
                .HasForeignKey(m => m.conversation_id)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.sender_id)
                .OnDelete(DeleteBehavior.Restrict);

            // Index để query nhanh hơn
            builder.HasIndex(m => m.conversation_id);
            builder.HasIndex(m => m.sender_id);
            builder.HasIndex(m => m.created_at);
        }
    }
}
