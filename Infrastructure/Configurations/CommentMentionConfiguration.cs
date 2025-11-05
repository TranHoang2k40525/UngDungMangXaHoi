using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class CommentMentionConfiguration : IEntityTypeConfiguration<CommentMention>
    {
        public void Configure(EntityTypeBuilder<CommentMention> builder)
        {
            builder.ToTable("CommentMentions");
            
            builder.HasKey(cm => cm.Id);
            
            builder.Property(cm => cm.CreatedAt)
                .IsRequired();
            
            // Relationships
            builder.HasOne(cm => cm.Comment)
                .WithMany()
                .HasForeignKey(cm => cm.CommentId)
                .OnDelete(DeleteBehavior.Cascade);
            
            builder.HasOne(cm => cm.MentionedUser)
                .WithMany()
                .HasForeignKey(cm => cm.MentionedUserId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Indexes
            builder.HasIndex(cm => cm.CommentId);
            builder.HasIndex(cm => cm.MentionedUserId);
        }
    }
}
