using System.Globalization;

namespace Graphing.Server.Services
{
    public sealed class SceneThumbnailStorageService
    {
        private readonly IWebHostEnvironment _environment;

        public SceneThumbnailStorageService(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        public async Task<string?> SaveThumbnailAsync(string sceneId, string? dataUrl, string? previousRelativePath = null)
        {
            if (string.IsNullOrWhiteSpace(dataUrl))
            {
                return previousRelativePath;
            }

            byte[] bytes;

            try
            {
                bytes = DecodeImageBytes(dataUrl);
            }
            catch (FormatException)
            {
                return previousRelativePath;
            }
            catch (ArgumentException)
            {
                return previousRelativePath;
            }

            if (bytes.Length == 0)
            {
                return previousRelativePath;
            }

            var webRootPath = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
            var relativeDirectory = Path.Combine("uploads", "scenes", sceneId);
            var fileName = $"thumbnail-{DateTime.UtcNow.ToString("yyyyMMddHHmmssfff", CultureInfo.InvariantCulture)}.png";
            var relativePath = Path.Combine(relativeDirectory, fileName);
            var physicalPath = Path.Combine(webRootPath, relativePath);

            Directory.CreateDirectory(Path.GetDirectoryName(physicalPath) ?? webRootPath);
            if (!string.IsNullOrWhiteSpace(previousRelativePath))
            {
                DeleteThumbnail(previousRelativePath);
            }

            await File.WriteAllBytesAsync(physicalPath, bytes);

            return "/" + relativePath.Replace('\\', '/');
        }

        public void DeleteThumbnail(string? relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return;
            }

            var webRootPath = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
            var trimmed = relativePath.TrimStart('/', '\\').Replace('/', Path.DirectorySeparatorChar);
            var physicalPath = Path.Combine(webRootPath, trimmed);

            if (File.Exists(physicalPath))
            {
                File.Delete(physicalPath);
            }
        }

        private static byte[] DecodeImageBytes(string dataUrl)
        {
            var commaIndex = dataUrl.IndexOf(',');
            var base64Part = commaIndex >= 0 ? dataUrl[(commaIndex + 1)..] : dataUrl;
            return Convert.FromBase64String(base64Part);
        }
    }
}
