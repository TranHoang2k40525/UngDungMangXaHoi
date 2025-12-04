using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class ContentReportConfiguration : IEntityTypeConfiguration<ContentReport>
    {
        public void Configure(EntityTypeBuilder<ContentReport> builder)
        {
            builder.ToTable("ContentReports");
            builder.HasKey("report_id");
            builder.Property(cr => cr.report_id).HasColumnName("report_id").ValueGeneratedOnAdd();
            builder.Property(cr => cr.reporter_account_id);
            builder.Property(cr => cr.content_type).HasMaxLength(20).IsRequired();
            builder.Property(cr => cr.content_id).IsRequired();
            builder.Property(cr => cr.reason).HasMaxLength(500);
            builder.Property(cr => cr.status).HasConversion<string>().IsRequired();
            builder.Property(cr => cr.assigned_admin_id);
            builder.Property(cr => cr.created_at).HasColumnType("datetime").HasDefaultValueSql("getdate()").IsRequired();
            builder.Property(cr => cr.handled_at).HasColumnType("datetime");
            builder.Property(cr => cr.handled_notes).HasMaxLength(1000);
            builder.HasIndex(cr => cr.status);
            builder.HasOne(a => a.ReporterAccount).WithMany(cr => cr.ContentReports).HasForeignKey(c => c.reporter_account_id).OnDelete(DeleteBehavior.SetNull);
            builder.HasOne(ad => ad.AssignedAdmin).WithMany(cr => cr.ContentReports).HasForeignKey(c => c.assigned_admin_id).OnDelete(DeleteBehavior.SetNull);



        }
    }
}
