using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
    {
        public void Configure(EntityTypeBuilder<Conversation> builder)
        {
            builder.ToTable("ConversationsNew");
            
            builder.HasKey(c => c.conversation_id);

            builder.Property(c => c.created_at)
                .HasDefaultValueSql("GETDATE()");

            builder.Property(c => c.updated_at)
                .IsRequired(false);

            // Relationships
            builder.HasOne(c => c.User1)
                .WithMany()
                .HasForeignKey(c => c.user1_id)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(c => c.User2)
                .WithMany()
                .HasForeignKey(c => c.user2_id)
                .OnDelete(DeleteBehavior.Restrict);

            // Index để tìm conversation nhanh hơn
            builder.HasIndex(c => new { c.user1_id, c.user2_id })
                .IsUnique();
        }
    }
}
