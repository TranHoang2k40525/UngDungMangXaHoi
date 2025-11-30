using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class ModerationLogConfiguration : IEntityTypeConfiguration<ModerationLog>
    {
        public void Configure(EntityTypeBuilder<ModerationLog> builder)
        {
            builder.ToTable("ModerationLogs");
            builder.HasKey(ml => ml.LogID);
            builder.Property(ml => ml.LogID).ValueGeneratedOnAdd();
            builder.Property(ml => ml.ModerationID).IsRequired();
            builder.Property(ml => ml.ActionTaken).IsRequired().HasMaxLength(50);
            builder.Property(ml => ml.AdminID);
            builder.Property(ml => ml.ActionAt).HasColumnType("datetime").HasDefaultValueSql("getdate()").IsRequired();
            builder.Property(ml => ml.Note).HasMaxLength(255);
           builder.HasOne(ml => ml.ContentModeration)
                   .WithMany(cm => cm.ModerationLogs)
                   .HasForeignKey(ml => ml.ModerationID)
                   .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(ml => ml.Admin).WithMany(a => a.ModerationLogs)
                   .HasForeignKey(ml => ml.AdminID)
                   .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
