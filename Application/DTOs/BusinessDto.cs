using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class BusinessDto
    {
        public class RequestUpgradeResponse
        {
            public bool Success { get; set; }
            public string Message { get; set; } = null!;
            public PaymentData? Data { get; set; }
        }

        public class PaymentData
        {
            public int PaymentId { get; set; }
            public string QrCodeUrl { get; set; } = null!;
            public decimal Amount { get; set; }
            public DateTime ExpiresAt { get; set; }
            public int RemainingSeconds { get; set; }
        }

        /// <summary>
        /// Request body từ MoMo webhook
        /// </summary>
        public class MoMoWebhookRequest
        {
            public string OrderId { get; set; } = null!;
            public int ResultCode { get; set; }
            public string Message { get; set; } = null!;
            public long Amount { get; set; }
            public string? Signature { get; set; }
            public string? ExtraData { get; set; }
        }

        /// <summary>
        /// Response cho endpoint payment-status
        /// </summary>
        public class PaymentStatusResponse
        {
            public bool Success { get; set; }
            public string Status { get; set; } = null!;
            public int RemainingSeconds { get; set; }
            public string Message { get; set; } = null!;
        }

        /// <summary>
        /// Response khi lỗi
        /// </summary>
        public class ErrorResponse
        {
            public bool Success { get; set; }
            public string Message { get; set; } = null!;
        }
    
}
}
