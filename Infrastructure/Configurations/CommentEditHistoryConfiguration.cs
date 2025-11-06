using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations;

public class CommentEditHistoryConfiguration : IEntityTypeConfiguration<CommentEditHistory>
{
    public void Configure(EntityTypeBuilder<CommentEditHistory> builder)
    {
        builder.ToTable("CommentEditHistories");
        
        builder.HasKey(ceh => ceh.CommentEditHistoryId);
        builder.Property(ceh => ceh.CommentEditHistoryId).HasColumnName("comment_edit_history_id");
        builder.Property(ceh => ceh.CommentId).HasColumnName("comment_id");
        builder.Property(ceh => ceh.OldContent).HasColumnName("old_content").HasMaxLength(5000);
        builder.Property(ceh => ceh.EditedAt).HasColumnName("edited_at");
        
        // Relationships
        builder.HasOne(ceh => ceh.Comment)
            .WithMany(c => c.EditHistory)
            .HasForeignKey(ceh => ceh.CommentId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Indexes
        builder.HasIndex(ceh => ceh.CommentId);
        builder.HasIndex(ceh => ceh.EditedAt);
    }
}
