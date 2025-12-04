using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class BusinessVerificationRequestConfiguration:IEntityTypeConfiguration<BusinessVerificationRequest>
    {
        public void Configure(EntityTypeBuilder<BusinessVerificationRequest> builder)
        {
            builder.ToTable("BusinessVerificationRequests");
            builder.HasKey("request_id");
            builder.Property(bvr => bvr.request_id).HasColumnName("request_id").ValueGeneratedOnAdd().IsRequired();
            builder.Property(bvr => bvr.account_id).HasColumnName("account_id").IsRequired();
            builder.Property(bvr => bvr.submitted_at).HasColumnName("submitted_at").HasColumnType("datetime").HasDefaultValueSql("GETDATE()").IsRequired();
            builder.Property(bvr => bvr.status).HasColumnName("status").HasMaxLength(20).HasConversion<string>().IsRequired();
            builder.Property(bvr => bvr.documents_url).HasColumnName("documents_url").HasMaxLength(2000);
            builder.Property(bvr => bvr.assigned_admin_id).HasColumnName("assigned_admin_id");
            builder.Property(bvr => bvr.reviewed_at).HasColumnName("reviewed_at").HasColumnType("datetime");
            builder.Property(bvr => bvr.reviewed_notes).HasColumnName("reviewed_notes").HasMaxLength(1000);
            builder.Property(bvr => bvr.expires_at).HasColumnName("expires_at").HasColumnType("datetime");
            builder.HasIndex(bvr => bvr.status);
            builder.HasOne(a => a.Accounts).WithMany(bvr => bvr.BusinessVerificationRequests).HasForeignKey(a => a.account_id).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(ac => ac.AssignedAdmin).WithMany(bvr => bvr.BusinessVerificationRequestsReviewed).HasForeignKey(ac => ac.assigned_admin_id).OnDelete(DeleteBehavior.SetNull);

        }
    }
}
