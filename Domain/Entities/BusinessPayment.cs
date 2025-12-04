using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

namespace UngDungMangXaHoi.Domain.Entities
{
    public enum PaymentStatus
    {
        Pending,
        Completed,
        Expired,
        Failed
    }
    public class     BusinessPayment
    {
       

        public int PaymentId { get; set; }
        public int RequestId { get; set; }
        public int AccountId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = null!;
        public string QrCodeUrl { get; set; } = null!;
        public string TransactionId { get; set; } = null!;
        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? PaidAt { get; set; }
        public BusinessVerificationRequest Request { get; set; } = null!;
        public Account Account { get; set; } = null!;
        public bool IsExpired() => DateTime.UtcNow > ExpiresAt;
        public bool IsCompleted() => Status == PaymentStatus.Completed;
        public bool CanBePaid() => Status == PaymentStatus.Pending && !IsExpired();
        public int GetRemainingSeconds()
        {
            var remaining = (ExpiresAt - DateTime.UtcNow).TotalSeconds;
            return remaining > 0 ? (int)remaining : 0;
        }
        public void MarkAsCompleted()
        {
            if (Status != PaymentStatus.Pending)
            {
                throw new InvalidOperationException($"Không thể chuyển từ {Status} sang Completed");
            }

            if (IsExpired())
            {
                throw new InvalidOperationException("QR code đã hết hạn, không thể thanh toán");
            }

            Status = PaymentStatus.Completed;
            PaidAt = DateTime.UtcNow;
        }
        public void MarkAsExpired()
        {
            if (Status == PaymentStatus.Completed)
            {
                throw new InvalidOperationException("Payment đã Completed, không thể chuyển sang Expired");
            }

            Status = PaymentStatus.Expired;
        }
        public void MarkAsFailed(string reason = "")
        {
            if (Status == PaymentStatus.Completed)
            {
                throw new InvalidOperationException("Payment đã Completed, không thể chuyển sang Failed");
            }

            Status = PaymentStatus.Failed;
            // Có thể thêm field FailureReason nếu cần
        }



    }
}
