using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations;

public class CommentReactionConfiguration : IEntityTypeConfiguration<CommentReaction>
{
    public void Configure(EntityTypeBuilder<CommentReaction> builder)
    {
        builder.ToTable("CommentReactions");
        
        builder.HasKey(cr => cr.CommentReactionId);
        builder.Property(cr => cr.CommentReactionId).HasColumnName("comment_reaction_id");
        builder.Property(cr => cr.CommentId).HasColumnName("comment_id");
        builder.Property(cr => cr.AccountId).HasColumnName("account_id");
        builder.Property(cr => cr.ReactionType).HasColumnName("reaction_type").HasMaxLength(20);
        builder.Property(cr => cr.CreatedAt).HasColumnName("created_at");
        
        // Relationships
        builder.HasOne(cr => cr.Comment)
            .WithMany(c => c.Reactions)
            .HasForeignKey(cr => cr.CommentId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(cr => cr.Account)
            .WithMany()
            .HasForeignKey(cr => cr.AccountId)
            .OnDelete(DeleteBehavior.NoAction);
        
        // Unique constraint: one reaction per account per comment
        builder.HasIndex(cr => new { cr.CommentId, cr.AccountId }).IsUnique();
        
        // Indexes
        builder.HasIndex(cr => cr.CommentId);
        builder.HasIndex(cr => cr.AccountId);
    }
}
