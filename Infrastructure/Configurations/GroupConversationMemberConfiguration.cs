using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class GroupConversationMemberConfiguration : IEntityTypeConfiguration<GroupConversationMember>
    {
     public void Configure(EntityTypeBuilder<GroupConversationMember> builder)
     {
         builder.ToTable("ConversationMembers");
         builder.HasKey(cm => cm.id);
            
         builder.Property(cm => cm.conversation_id).IsRequired();
         builder.Property(cm => cm.user_id).IsRequired();
         builder.Property(cm => cm.role).HasMaxLength(20).IsRequired().HasDefaultValue("member");
         builder.Property(cm => cm.joined_at).HasColumnType("datetime");
            
         // Unique constraint: một user chỉ có một role trong một conversation
         builder.HasIndex(cm => new { cm.conversation_id, cm.user_id })
             .IsUnique();
            
         // Relationships
         builder.HasOne(cm => cm.Conversation)
             .WithMany(c => c.Members)
             .HasForeignKey(cm => cm.conversation_id)
             .OnDelete(DeleteBehavior.Cascade);
            
         builder.HasOne(cm => cm.User)
             .WithMany()
             .HasForeignKey(cm => cm.user_id)
             .OnDelete(DeleteBehavior.Restrict);
     }
    }
}
