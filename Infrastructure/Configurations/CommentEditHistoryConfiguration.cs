using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class CommentEditHistoryConfiguration : IEntityTypeConfiguration<CommentEditHistory>
    {
        public void Configure(EntityTypeBuilder<CommentEditHistory> builder)
        {
            builder.ToTable("CommentEditHistories");
            
            builder.HasKey(ceh => ceh.Id);
            
            builder.Property(ceh => ceh.OldContent)
                .IsRequired()
                .HasMaxLength(5000);
            
            builder.Property(ceh => ceh.NewContent)
                .IsRequired()
                .HasMaxLength(5000);
            
            builder.Property(ceh => ceh.EditedAt)
                .IsRequired();
            
            // Relationships
            builder.HasOne(ceh => ceh.Comment)
                .WithMany()
                .HasForeignKey(ceh => ceh.CommentId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Indexes
            builder.HasIndex(ceh => ceh.CommentId);
            builder.HasIndex(ceh => ceh.EditedAt);
        }
    }
}
