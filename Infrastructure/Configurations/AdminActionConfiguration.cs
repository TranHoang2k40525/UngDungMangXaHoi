using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using static System.Collections.Specialized.BitVector32;


namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    internal class AdminActionConfiguration : IEntityTypeConfiguration<AdminAction>
    {
        public void Configure(EntityTypeBuilder<AdminAction> builder)
        {
            builder.ToTable("AdminActions");
            builder.HasKey(aa => aa.action_id);
            builder.Property(aa => aa.action).IsRequired().ValueGeneratedOnAdd();
            builder.Property(aa => aa.admin_id);
            builder.Property(aa => aa.action).HasMaxLength(100).IsRequired();
            builder.Property(aa => aa.target_type).HasMaxLength(50);
            builder.Property(aa => aa.target_id);
            builder.Property(aa => aa.reason).HasMaxLength(1000);
            builder.Property(aa => aa.created_at).HasColumnType("datetime").HasDefaultValueSql("getdate()");
            builder.HasIndex(aa => aa.admin_id);
            builder.HasOne(a => a.Admin).WithMany(aa => aa.AdminActions).HasForeignKey(k => k.admin_id).OnDelete(DeleteBehavior.Cascade);
            
        }
    }
}
