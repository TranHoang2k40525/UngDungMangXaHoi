using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

namespace UngDungMangXaHoi.Infrastructure.Services
{
    /// <summary>
    /// Best-effort video normalizer using FFmpeg to improve compatibility across Android/iOS devices.
    /// Converts input to H.264 (Main profile, level 3.1), yuv420p, AAC audio, with faststart for streaming.
    /// If FFmpeg is not available or transcoding fails, returns null and the original will be used.
    /// </summary>
    public class VideoTranscodeService
    {
        private readonly string _ffmpegPath;

        public VideoTranscodeService()
        {
            _ffmpegPath = Environment.GetEnvironmentVariable("FFMPEG_PATH") ?? "ffmpeg";
        }

        public async Task<string?> TryNormalizeAsync(string inputPath, string? outputDirectory = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(inputPath) || !File.Exists(inputPath)) return null;

                var ext = Path.GetExtension(inputPath).ToLowerInvariant();
                // Only handle common containers; output will be mp4
                if (ext != ".mp4" && ext != ".mov" && ext != ".mkv" && ext != ".webm" && ext != ".m4v")
                {
                    return null;
                }

                var dir = outputDirectory ?? Path.GetDirectoryName(inputPath)!;
                var baseName = Path.GetFileNameWithoutExtension(inputPath);
                var outName = baseName + "_compat.mp4";
                var outputPath = Path.Combine(dir, outName);

                // ffmpeg args:
                // -y overwrite, -i input, video h264 main@3.1 yuv420p, audio aac 128k, faststart, keep original dimensions, set SAR 1:1
                var args = $"-y -i \"{inputPath}\" -c:v libx264 -profile:v main -level 3.1 -pix_fmt yuv420p -movflags +faststart -vf \"scale=iw:ih:flags=bicubic,setsar=1\" -c:a aac -b:a 128k \"{outputPath}\"";

                var psi = new ProcessStartInfo
                {
                    FileName = _ffmpegPath,
                    Arguments = args,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                };

                using var proc = new Process { StartInfo = psi };
                var tcs = new TaskCompletionSource<int>();
                proc.EnableRaisingEvents = true;
                proc.Exited += (s, e) =>
                {
                    try { tcs.TrySetResult(proc.ExitCode); }
                    catch { }
                };

                if (!proc.Start()) return null;
                // Read streams to avoid deadlocks
                _ = proc.StandardOutput.ReadToEndAsync();
                _ = proc.StandardError.ReadToEndAsync();

                var exit = await tcs.Task.ConfigureAwait(false);
                if (exit == 0 && File.Exists(outputPath) && new FileInfo(outputPath).Length > 0)
                {
                    return outputPath;
                }
                return null;
            }
            catch
            {
                return null;
            }
        }
    }
}
