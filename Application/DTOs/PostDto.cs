using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace UngDungMangXaHoi.Application.DTOs
{
    public class CreatePostForm
    {
        public string? Caption { get; set; }
        public string? Location { get; set; }
        public string Privacy { get; set; } = "public"; // public | private | followers
        public List<IFormFile>? Images { get; set; }
        public IFormFile? Video { get; set; }
        // Optional JSON arrays encoded as strings, e.g. "[1,2,3]"
        public string? Mentions { get; set; }
        public string? Tags { get; set; }
    }

    public class UpdatePrivacyDto
    {
        public string Privacy { get; set; } = "public"; // public | private | followers
    }

    public class UpdateCaptionDto
    {
        public string Caption { get; set; } = string.Empty;
    }

    public class UpdateTagsDto
    {
        // array of user ids
        public int[]? Tags { get; set; }
    }
}
