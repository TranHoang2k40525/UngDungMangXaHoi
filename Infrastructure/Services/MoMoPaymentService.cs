using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace UngDungMangXaHoi.Infrastructure.ExternalServices
{
   

    public interface IMoMoPaymentService
    {
        Task<(bool Success, string QrCodeUrl, string TransactionId, string Message)> CreatePaymentQRAsync(
            int accountId,
            int requestId,
            decimal amount);
    }

  

    public class MoMoPaymentService : IMoMoPaymentService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<MoMoPaymentService> _logger;
        private readonly string _partnerCode;
        private readonly string _accessKey;
        private readonly string _secretKey;
        private readonly string _endpoint;
        private readonly string _redirectUrl;
        private readonly string _ipnUrl;

        public MoMoPaymentService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<MoMoPaymentService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;

            _partnerCode = configuration["MoMo:PartnerCode"]
                ?? throw new ArgumentNullException("MoMo:PartnerCode");
            _accessKey = configuration["MoMo:AccessKey"]
                ?? throw new ArgumentNullException("MoMo:AccessKey");
            _secretKey = configuration["MoMo:SecretKey"]
                ?? throw new ArgumentNullException("MoMo:SecretKey");
            _endpoint = configuration["MoMo:Endpoint"]
                ?? "https://test-payment.momo.vn/v2/gateway/api/create";
            _redirectUrl = configuration["MoMo:RedirectUrl"]
                ?? "https://localhost:5001/payment/callback";
            _ipnUrl = configuration["MoMo:IpnUrl"]
                ?? "https://localhost:5001/api/payment/momo-webhook";
        }

        public async Task<(bool Success, string QrCodeUrl, string TransactionId, string Message)> CreatePaymentQRAsync(
            int accountId,
            int requestId,
            decimal amount)
        {
            try
            {
                // Tạo OrderId duy nhất
                var orderId = $"BUSINESS_{accountId}_{requestId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
                var requestIdMomo = Guid.NewGuid().ToString();
                var orderInfo = $"Nang cap tai khoan Business - Account {accountId}";
                var requestType = "captureWallet";

                // ExtraData
                var extraDataJson = JsonSerializer.Serialize(new { accountId, requestId });
                var extraData = Convert.ToBase64String(Encoding.UTF8.GetBytes(extraDataJson));

                // Tạo signature
                var rawSignature = $"accessKey={_accessKey}" +
                    $"&amount={amount}" +
                    $"&extraData={extraData}" +
                    $"&ipnUrl={_ipnUrl}" +
                    $"&orderId={orderId}" +
                    $"&orderInfo={orderInfo}" +
                    $"&partnerCode={_partnerCode}" +
                    $"&redirectUrl={_redirectUrl}" +
                    $"&requestId={requestIdMomo}" +
                    $"&requestType={requestType}";

                var signature = ComputeHmacSha256(rawSignature, _secretKey);

                // Request body
                var requestBody = new MoMoCreatePaymentRequest
                {
                    PartnerCode = _partnerCode,
                    AccessKey = _accessKey,
                    RequestId = requestIdMomo,
                    Amount = (long)amount,
                    OrderId = orderId,
                    OrderInfo = orderInfo,
                    RedirectUrl = _redirectUrl,
                    IpnUrl = _ipnUrl,
                    ExtraData = extraData,
                    RequestType = requestType,
                    Signature = signature,
                    Lang = "vi",
                    OrderExpireTime = 5
                };

                var jsonContent = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                _logger.LogInformation("Gửi request MoMo: {Json}", jsonContent);

                var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(_endpoint, httpContent);
                var responseContent = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("MoMo response: {Response}", responseContent);

                var momoResponse = JsonSerializer.Deserialize<MoMoCreatePaymentResponse>(
                    responseContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (momoResponse?.ResultCode == 0)
                {
                    return (true, momoResponse.QrCodeUrl ?? momoResponse.PayUrl ?? string.Empty, orderId, "Success");
                }

                return (false, string.Empty, string.Empty, momoResponse?.Message ?? "Unknown error");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi tạo QR MoMo");
                return (false, string.Empty, string.Empty, ex.Message);
            }
        }

        private string ComputeHmacSha256(string message, string secret)
        {
            var keyBytes = Encoding.UTF8.GetBytes(secret);
            var messageBytes = Encoding.UTF8.GetBytes(message);
            using var hmac = new HMACSHA256(keyBytes);
            var hashBytes = hmac.ComputeHash(messageBytes);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
        }
    }

    // DTO Classes
    public class MoMoCreatePaymentRequest
    {
        [JsonPropertyName("partnerCode")]
        public string PartnerCode { get; set; } = null!;

        [JsonPropertyName("accessKey")]
        public string AccessKey { get; set; } = null!;

        [JsonPropertyName("requestId")]
        public string RequestId { get; set; } = null!;

        [JsonPropertyName("amount")]
        public long Amount { get; set; }

        [JsonPropertyName("orderId")]
        public string OrderId { get; set; } = null!;

        [JsonPropertyName("orderInfo")]
        public string OrderInfo { get; set; } = null!;

        [JsonPropertyName("redirectUrl")]
        public string RedirectUrl { get; set; } = null!;

        [JsonPropertyName("ipnUrl")]
        public string IpnUrl { get; set; } = null!;

        [JsonPropertyName("extraData")]
        public string ExtraData { get; set; } = null!;

        [JsonPropertyName("requestType")]
        public string RequestType { get; set; } = null!;

        [JsonPropertyName("signature")]
        public string Signature { get; set; } = null!;

        [JsonPropertyName("lang")]
        public string Lang { get; set; } = "vi";
        [JsonPropertyName("orderExpireTime")]
        public int OrderExpireTime { get; set; } 
    }

    public class MoMoCreatePaymentResponse
    {
        [JsonPropertyName("resultCode")]
        public int ResultCode { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("qrCodeUrl")]
        public string? QrCodeUrl { get; set; }

        [JsonPropertyName("payUrl")]
        public string? PayUrl { get; set; }

        [JsonPropertyName("deeplink")]
        public string? Deeplink { get; set; }
    }
}