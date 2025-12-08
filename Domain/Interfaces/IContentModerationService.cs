namespace UngDungMangXaHoi.Domain.Interfaces;

public interface IContentModerationService
{
    /// <summary>
    /// Kiểm tra nội dung có toxic/harmful không
    /// </summary>
    /// <param name="text">Nội dung cần kiểm tra</param>
    /// <returns>Kết quả moderation</returns>
    Task<ModerationResult> AnalyzeTextAsync(string text);
}

public class ModerationResult
{
    /// <summary>
    /// Nội dung có an toàn không
    /// </summary>
    public bool IsSafe { get; set; }
    
    /// <summary>
    /// Loại nội dung (safe, toxic, hate, violence, nsfw, suicide)
    /// </summary>
    public string Label { get; set; } = string.Empty;
    
    /// <summary>
    /// Độ tin cậy (0-1)
    /// </summary>
    public double Confidence { get; set; }
    
    /// <summary>
    /// Mức độ rủi ro (no_risk, low_risk, medium_risk, high_risk)
    /// </summary>
    public string RiskLevel { get; set; } = string.Empty;
    
    /// <summary>
    /// Tổng điểm tiêu cực
    /// </summary>
    public double CumulativeNegative { get; set; }
    
    /// <summary>
    /// Điểm chi tiết cho từng label
    /// </summary>
    public Dictionary<string, double> AllScores { get; set; } = new();
}
