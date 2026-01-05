using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations;

public class GroupMessageConfiguration : IEntityTypeConfiguration<GroupMessage>
{
    public void Configure(EntityTypeBuilder<GroupMessage> builder)
    {
        builder.ToTable("GroupMessages");

        builder.HasKey(m => m.message_id);

        builder.Property(m => m.message_id)
            .HasColumnName("message_id")
            .ValueGeneratedOnAdd();

        builder.Property(m => m.conversation_id)
            .HasColumnName("conversation_id")
            .IsRequired();

        builder.Property(m => m.user_id)
            .HasColumnName("sender_id")
            .IsRequired();

        builder.Property(m => m.content)
            .HasColumnName("content")
            .HasColumnType("NVARCHAR(1000)");

        builder.Property(m => m.message_type)
            .HasColumnName("message_type")
            .HasMaxLength(20)
            .IsRequired()
            .HasDefaultValue("text");

        builder.Property(m => m.file_url)
            .HasColumnName("media_url")
            .HasMaxLength(255);

        builder.Property(m => m.created_at)
            .HasColumnName("created_at")
            .IsRequired()
            .HasDefaultValueSql("GETDATE()");

        builder.Property(m => m.is_deleted)
            .HasColumnName("is_deleted")
            .HasDefaultValue(false);

        builder.Property(m => m.reply_to_message_id)
            .HasColumnName("reply_to");

        // Relationships
        builder.HasOne<GroupConversation>()
            .WithMany()
            .HasForeignKey(m => m.conversation_id)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(m => m.user_id)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<GroupMessage>()
            .WithMany()
            .HasForeignKey(m => m.reply_to_message_id)
            .OnDelete(DeleteBehavior.NoAction);

        // Indexes
        builder.HasIndex(m => m.conversation_id);
        builder.HasIndex(m => m.user_id);
        builder.HasIndex(m => m.created_at);
        builder.HasIndex(m => m.reply_to_message_id);
    }
}
