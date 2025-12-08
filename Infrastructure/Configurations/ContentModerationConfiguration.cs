using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    internal class ContentModerationConfiguration: IEntityTypeConfiguration<ContentModeration>
    {
        public void Configure(EntityTypeBuilder<ContentModeration> builder)
        {
            builder.ToTable("ContentModeration");
            builder.HasKey("ModerationID");
            builder.Property(cm => cm.ModerationID).HasColumnName("ModerationID").ValueGeneratedOnAdd();
            builder.Property(cm => cm.ContentType).HasMaxLength(20).IsRequired();
            builder.Property(cm => cm.ContentID).IsRequired();
            builder.Property(cm => cm.AccountId).HasColumnName("account_id").IsRequired();
            builder.Property(cm => cm.PostId).HasColumnName("post_id");
            builder.Property(cm => cm.CommentId).HasColumnName("comment_id");
            builder.Property(cm => cm.AIConfidence).IsRequired();
            builder.Property(cm => cm.ToxicLabel).HasMaxLength(50).IsRequired();
            builder.Property(cm => cm.Status).HasMaxLength(20);
            builder.Property(cm => cm.CreatedAt).HasColumnType("datetime").HasDefaultValueSql("getdate()");
            builder.HasOne(p => p.Post).WithMany(cm => cm.ContentModerations).HasForeignKey(c => c.PostId).OnDelete(DeleteBehavior.SetNull);
            builder.HasOne(com => com.Comment).WithMany(cm => cm.ContentModerations).HasForeignKey(c => c.CommentId).OnDelete(DeleteBehavior.SetNull);
            builder.HasOne(a => a.Account).WithMany(cm => cm.ContentModerations).HasForeignKey(c => c.AccountId).OnDelete(DeleteBehavior.Cascade);

        }
    }
}
