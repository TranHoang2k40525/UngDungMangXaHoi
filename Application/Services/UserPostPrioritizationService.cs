using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    /// <summary>
    /// Service sắp xếp ưu tiên bài post của User dựa vào lịch sử tìm kiếm
    /// Giúp cải thiện trải nghiệm bằng cách hiển thị nội dung phù hợp với sở thích người dùng
    /// </summary>
    public class UserPostPrioritizationService
    {
        private readonly ISearchHistoryRepository _searchHistoryRepository;

        public UserPostPrioritizationService(ISearchHistoryRepository searchHistoryRepository)
        {
            _searchHistoryRepository = searchHistoryRepository;
        }

        /// <summary>
        /// Sắp xếp lại danh sách User posts dựa vào lịch sử tìm kiếm
        /// Ưu tiên: Posts có caption liên quan đến search history > Posts mặc định (theo thời gian)
        /// </summary>
        /// <param name="posts">Danh sách bài posts gốc</param>
        /// <param name="currentUserId">ID người dùng hiện tại</param>
        /// <returns>Danh sách posts đã được sắp xếp theo ưu tiên</returns>
        public async Task<List<Post>> PrioritizeUserPostsAsync(List<Post> posts, int? currentUserId)
        {
            if (posts == null || !posts.Any())
                return posts ?? new List<Post>();

            // Nếu không có user hoặc không có posts, giữ nguyên thứ tự
            if (!currentUserId.HasValue)
                return posts;

            // Lấy top keywords từ lịch sử tìm kiếm
            var searchKeywords = await _searchHistoryRepository.GetTopSearchKeywordsAsync(currentUserId.Value, 10);
            
            if (!searchKeywords.Any())
            {
                // Không có lịch sử tìm kiếm, trả về danh sách gốc
                return posts;
            }

            // Chuyển keywords thành lowercase để so sánh
            var lowerKeywords = searchKeywords.Select(k => k.ToLower()).ToList();

            // Phân loại posts thành 2 nhóm
            var relevantPosts = new List<(Post post, int matchCount)>();
            var normalPosts = new List<Post>();

            foreach (var post in posts)
            {
                if (string.IsNullOrWhiteSpace(post.caption))
                {
                    // Posts không có caption → nhóm normal
                    normalPosts.Add(post);
                    continue;
                }

                var captionLower = post.caption.ToLower();
                
                // Đếm số keywords match trong caption
                var matchCount = lowerKeywords.Count(keyword => captionLower.Contains(keyword));

                if (matchCount > 0)
                {
                    // Posts có caption liên quan → nhóm relevant
                    relevantPosts.Add((post, matchCount));
                }
                else
                {
                    // Posts không liên quan → nhóm normal
                    normalPosts.Add(post);
                }
            }

            // Sắp xếp nhóm relevant theo số lượng keywords match (giảm dần), sau đó theo thời gian
            var sortedRelevantPosts = relevantPosts
                .OrderByDescending(x => x.matchCount)
                .ThenByDescending(x => x.post.created_at)
                .Select(x => x.post)
                .ToList();

            // Sắp xếp nhóm normal theo thời gian (mặc định)
            var sortedNormalPosts = normalPosts
                .OrderByDescending(p => p.created_at)
                .ToList();

            // Merge 2 nhóm: Relevant posts trước, normal posts sau
            var prioritizedPosts = new List<Post>();
            prioritizedPosts.AddRange(sortedRelevantPosts);
            prioritizedPosts.AddRange(sortedNormalPosts);

            return prioritizedPosts;
        }

        /// <summary>
        /// Sắp xếp ưu tiên và mix posts để tránh hiển thị tất cả relevant posts liên tiếp
        /// Tạo trải nghiệm cân bằng hơn
        /// </summary>
        /// <param name="posts">Danh sách bài posts gốc</param>
        /// <param name="currentUserId">ID người dùng hiện tại</param>
        /// <returns>Danh sách posts đã được sắp xếp và mix</returns>
        public async Task<List<Post>> PrioritizeAndMixUserPostsAsync(List<Post> posts, int? currentUserId)
        {
            if (posts == null || !posts.Any())
                return posts ?? new List<Post>();

            if (!currentUserId.HasValue)
                return posts;

            var searchKeywords = await _searchHistoryRepository.GetTopSearchKeywordsAsync(currentUserId.Value, 10);
            
            if (!searchKeywords.Any())
                return posts;

            var lowerKeywords = searchKeywords.Select(k => k.ToLower()).ToList();

            // Phân loại posts
            var relevantPosts = new List<(Post post, int matchCount)>();
            var normalPosts = new List<Post>();

            foreach (var post in posts)
            {
                if (string.IsNullOrWhiteSpace(post.caption))
                {
                    normalPosts.Add(post);
                    continue;
                }

                var captionLower = post.caption.ToLower();
                var matchCount = lowerKeywords.Count(keyword => captionLower.Contains(keyword));

                if (matchCount > 0)
                {
                    relevantPosts.Add((post, matchCount));
                }
                else
                {
                    normalPosts.Add(post);
                }
            }

            // Sắp xếp cả 2 nhóm
            var sortedRelevantPosts = relevantPosts
                .OrderByDescending(x => x.matchCount)
                .ThenByDescending(x => x.post.created_at)
                .Select(x => x.post)
                .ToList();

            var sortedNormalPosts = normalPosts
                .OrderByDescending(p => p.created_at)
                .ToList();

            // Mix strategy: Cứ mỗi 2-3 relevant posts thì chèn 1-2 normal posts
            var mixedPosts = new List<Post>();
            var relevantIndex = 0;
            var normalIndex = 0;
            var random = new Random();

            while (relevantIndex < sortedRelevantPosts.Count || normalIndex < sortedNormalPosts.Count)
            {
                // Thêm 2-3 relevant posts
                var relevantBatch = random.Next(2, 4);
                for (int i = 0; i < relevantBatch && relevantIndex < sortedRelevantPosts.Count; i++)
                {
                    mixedPosts.Add(sortedRelevantPosts[relevantIndex]);
                    relevantIndex++;
                }

                // Thêm 1-2 normal posts
                var normalBatch = random.Next(1, 3);
                for (int i = 0; i < normalBatch && normalIndex < sortedNormalPosts.Count; i++)
                {
                    mixedPosts.Add(sortedNormalPosts[normalIndex]);
                    normalIndex++;
                }
            }

            return mixedPosts;
        }
    }
}
