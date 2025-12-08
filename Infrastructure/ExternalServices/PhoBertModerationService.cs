using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Infrastructure.ExternalServices;

public class PhoBertModerationService : IContentModerationService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiUrl;

    public PhoBertModerationService(HttpClient httpClient, string apiUrl = "http://127.0.0.1:8000")
    {
        _httpClient = httpClient;
        _apiUrl = apiUrl;
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<ModerationResult> AnalyzeTextAsync(string text)
    {
        try
        {
            var request = new { text };
            var jsonContent = JsonSerializer.Serialize(request);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_apiUrl}/moderate", content);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ModerationApiResponse>(responseJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result == null)
                throw new Exception("Failed to parse moderation response");

            return new ModerationResult
            {
                IsSafe = result.IsSafe,
                Label = result.Label,
                Confidence = result.Confidence,
                RiskLevel = result.RiskLevel,
                CumulativeNegative = result.CumulativeNegative,
                AllScores = result.AllScores
            };
        }
        catch (HttpRequestException ex)
        {
            // ML Service không khả dụng - log và cho phép nội dung đi qua
            Console.WriteLine($"ML Service unavailable: {ex.Message}");
            return new ModerationResult
            {
                IsSafe = true,
                Label = "safe",
                Confidence = 0.0,
                RiskLevel = "no_risk",
                CumulativeNegative = 0.0,
                AllScores = new Dictionary<string, double>()
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Moderation error: {ex.Message}");
            throw;
        }
    }

    // Helper class for API response
    private class ModerationApiResponse
    {
        [JsonPropertyName("is_safe")]
        public bool IsSafe { get; set; }
        
        [JsonPropertyName("label")]
        public string Label { get; set; } = string.Empty;
        
        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }
        
        [JsonPropertyName("risk_level")]
        public string RiskLevel { get; set; } = string.Empty;
        
        [JsonPropertyName("cumulative_negative")]
        public double CumulativeNegative { get; set; }
        
        [JsonPropertyName("all_scores")]
        public Dictionary<string, double> AllScores { get; set; } = new();
    }
}
