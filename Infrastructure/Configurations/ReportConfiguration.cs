using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class ReportConfiguration : IEntityTypeConfiguration<Report>
    {
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.ToTable("Reports");

        builder.HasKey(r => r.ReportId);

        builder.Property(r => r.ReportId)
            .HasColumnName("report_id");

        builder.Property(r => r.ReporterId)
            .HasColumnName("reporter_id")
            .IsRequired();

        builder.Property(r => r.ReportedUserId)
            .HasColumnName("reported_user_id");

        builder.Property(r => r.ContentType)
            .HasColumnName("content_type")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(r => r.ContentId)
            .HasColumnName("content_id");

        builder.Property(r => r.Reason)
            .HasColumnName("reason")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(r => r.Description)
            .HasColumnName("description");

        builder.Property(r => r.Status)
            .HasColumnName("status")
            .HasMaxLength(50)
            .HasDefaultValue("pending");

        builder.Property(r => r.AdminNote)
            .HasColumnName("admin_note");

        builder.Property(r => r.ResolvedBy)
            .HasColumnName("resolved_by");

        builder.Property(r => r.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("GETDATE()");

        builder.Property(r => r.ResolvedAt)
            .HasColumnName("resolved_at");

        // Relationships
        builder.HasOne(r => r.Reporter)
            .WithMany()
            .HasForeignKey(r => r.ReporterId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(r => r.ReportedUser)
            .WithMany()
            .HasForeignKey(r => r.ReportedUserId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(r => r.ResolvedByAdmin)
            .WithMany()
            .HasForeignKey(r => r.ResolvedBy)
            .OnDelete(DeleteBehavior.NoAction);        // Indexes
        builder.HasIndex(r => r.Status);
        builder.HasIndex(r => r.ContentType);
        builder.HasIndex(r => r.CreatedAt);
    }
}
}
