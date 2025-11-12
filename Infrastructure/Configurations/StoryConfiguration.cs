using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class StoryConfiguration : IEntityTypeConfiguration<Story>
    {
        public void Configure(EntityTypeBuilder<Story> builder)
        {
            builder.ToTable("Stories");
            builder.HasKey(s => s.story_id);

            builder.Property(s => s.story_id)
                .HasColumnName("story_id");

            builder.Property(s => s.user_id)
                .HasColumnName("user_id");

            builder.Property(s => s.media_url)
                .IsRequired()
                .HasMaxLength(500)
                .HasColumnName("media_url");

            builder.Property(s => s.media_type)
                .IsRequired()
                .HasMaxLength(10)
                .HasColumnName("media_type");

            builder.Property(s => s.privacy)
                .IsRequired()
                .HasMaxLength(20)
                .HasColumnName("privacy");

            builder.Property(s => s.created_at)
                .IsRequired()
                .HasColumnName("created_at");

            builder.Property(s => s.expires_at)
                .IsRequired()
                .HasColumnName("expires_at");

            builder.HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.user_id)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class StoryViewConfiguration : IEntityTypeConfiguration<StoryView>
    {
        public void Configure(EntityTypeBuilder<StoryView> builder)
        {
            builder.ToTable("StoryViews");
            builder.HasKey(sv => sv.view_id);

            builder.Property(sv => sv.view_id)
                .HasColumnName("view_id");

            builder.Property(sv => sv.story_id)
                .HasColumnName("story_id");

            builder.Property(sv => sv.viewer_id)
                .HasColumnName("viewer_id");

            builder.Property(sv => sv.viewed_at)
                .IsRequired()
                .HasColumnName("viewed_at");

            builder.HasOne(sv => sv.Story)
                .WithMany(s => s.Views)
                .HasForeignKey(sv => sv.story_id)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(sv => sv.Viewer)
                .WithMany()
                .HasForeignKey(s => s.viewer_id)
                .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(sv => new { sv.story_id, sv.viewer_id })
                .IsUnique()
                .HasDatabaseName("UQ_StoryViews");
        }
    }
}
