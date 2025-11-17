using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class GroupConversationConfiguration : IEntityTypeConfiguration<GroupConversation>
    {
        public void Configure(EntityTypeBuilder<GroupConversation> builder)
        {
            builder.ToTable("Conversations");
            builder.HasKey(c => c.conversation_id);
            
            builder.Property(c => c.is_group).IsRequired();
            builder.Property(c => c.name).HasMaxLength(100);
            builder.Property(c => c.avatar_url).HasMaxLength(255);
            builder.Property(c => c.created_at).HasColumnType("datetime");
            builder.Property(c => c.invite_permission).HasMaxLength(20).IsRequired().HasDefaultValue("all");
            builder.Property(c => c.max_members).IsRequired(false);
            
            // Relationship
            builder.HasMany(c => c.Members)
                   .WithOne(m => m.Conversation)
                   .HasForeignKey(m => m.conversation_id)
                   .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
