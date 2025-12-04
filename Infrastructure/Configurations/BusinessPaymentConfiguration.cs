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
    public class BusinessPaymentConfiguration : IEntityTypeConfiguration<BusinessPayment>
    {
        public void Configure(EntityTypeBuilder<BusinessPayment> builder)
        {
            builder.ToTable("BusinessPayments");
            builder.HasKey(bp => bp.PaymentId);
            builder.Property(bp => bp.PaymentId).HasColumnName("payment_id").ValueGeneratedOnAdd();
            builder.Property(bp => bp.RequestId).HasColumnName("request_id").IsRequired();
            builder.Property(bp => bp.AccountId).HasColumnName("account_id").IsRequired();
            builder.Property(bp => bp.Amount).HasColumnName("amount").HasColumnType("decimal(18,2)").IsRequired();
            builder.Property(bp => bp.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50).IsRequired();
            builder.Property(bp => bp.QrCodeUrl).HasColumnName("qr_code_url").HasMaxLength(500).IsRequired();
            builder.Property(bp => bp.TransactionId).HasColumnName("transaction_id").HasMaxLength(100).IsRequired();
            builder.HasIndex(bp=>bp.TransactionId).IsUnique();
            builder.Property(bp => bp.Status).HasColumnName("status").HasMaxLength(20).HasConversion(v => v.ToString(),v =>Enum.Parse<PaymentStatus>(v)).IsRequired();
            builder.HasIndex(bp => bp.Status).HasDatabaseName("IX_BusinessPayments_Status");
            builder.Property(bp => bp.CreatedAt).HasColumnName("created_at").HasColumnType("datetime").HasDefaultValueSql("GETUTCDATE()").IsRequired();
            builder.Property(bp => bp.ExpiresAt).HasColumnName("expires_at").HasColumnType("datetime").IsRequired();
            builder.HasIndex(bp=>bp.ExpiresAt).HasDatabaseName("IX_BusinessPayments_ExpiresAt");
            builder.Property(bp => bp.PaidAt).HasColumnName("paid_at").HasColumnType("datetime").IsRequired(false);
            builder.HasOne(bp=> bp.Request)
                   .WithMany()
                   .HasForeignKey(bp => bp.RequestId)
                   .OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(bp => bp.Account)
                   .WithMany()
                   .HasForeignKey(bp => bp.AccountId)
                   .OnDelete(DeleteBehavior.NoAction);
            builder.HasIndex(bp=>bp.AccountId).HasDatabaseName("IX_BusinessPayments_AccountId");
           



        }
    }
}
