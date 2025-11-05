using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace UngDungMangXaHoi.Infrastructure.ExternalServices
{
    public class CloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(string cloudName, string apiKey, string apiSecret)
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
        }

        // ✅ Upload ảnh
        public async Task<string> UploadImageAsync(Stream fileStream, string fileName)
        {
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(fileName, fileStream),
                Folder = "uploads"
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            return uploadResult.SecureUrl?.ToString() ?? "";
        }

        // ✅ Upload video
        public async Task<string> UploadVideoAsync(Stream fileStream, string fileName)
        {
            var uploadParams = new VideoUploadParams
            {
                File = new FileDescription(fileName, fileStream),
                Folder = "videos"
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            return uploadResult.SecureUrl?.ToString() ?? "";
        }

        // 🆕 ✅ Upload media (tự nhận biết loại file)
        public async Task<string> UploadMediaAsync(Stream fileStream, string fileName, string mediaType)
        {
            if (mediaType == "video")
                return await UploadVideoAsync(fileStream, fileName);
            else
                return await UploadImageAsync(fileStream, fileName);
        }

        // 🆕 ✅ Xoá media theo publicId (Cloudinary trả về id khi upload)
        public async Task<bool> DeleteMediaAsync(string publicId, string mediaType)
        {
            DeletionParams delParams = new(publicId);
            DeletionResult result;

            if (mediaType == "video")
                result = await _cloudinary.DestroyAsync(new DeletionParams(publicId) { ResourceType = ResourceType.Video });
            else
                result = await _cloudinary.DestroyAsync(delParams);

            return result.Result == "ok";
        }
    }
}
