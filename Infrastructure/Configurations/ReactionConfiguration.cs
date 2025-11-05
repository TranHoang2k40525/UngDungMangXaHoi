using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class ReactionConfiguration : IEntityTypeConfiguration<Reaction>
    {
        public void Configure(EntityTypeBuilder<Reaction> builder)
        {
            builder.ToTable("Reactions");

            builder.HasKey(r => r.reaction_id);

            builder.Property(r => r.reaction_id)
                .HasColumnName("reaction_id");

            builder.Property(r => r.post_id)
                .IsRequired()
                .HasColumnName("post_id");

            builder.Property(r => r.user_id)
                .IsRequired()
                .HasColumnName("user_id");

            builder.Property(r => r.reaction_type)
                .IsRequired()
                .HasColumnName("reaction_type")
                .HasConversion<int>();

            builder.Property(r => r.created_at)
                .IsRequired()
                .HasColumnName("created_at")
                .HasColumnType("datetime2")
                .HasDefaultValueSql("GETDATE()")
                .HasConversion(
                    v => v.DateTime,
                    v => new DateTimeOffset(v, TimeSpan.Zero));

            // Unique constraint: Một user chỉ có thể react 1 lần trên 1 post
            builder.HasIndex(r => new { r.post_id, r.user_id })
                .IsUnique()
                .HasDatabaseName("UQ_Reaction_Post_User");

            // Relationships
            builder.HasOne(r => r.Post)
                .WithMany()
                .HasForeignKey(r => r.post_id)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.user_id)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
