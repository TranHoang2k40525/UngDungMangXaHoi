using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    /// <summary>
    /// Service chịu trách nhiệm chèn bài Business (quảng cáo) vào feed theo tần suất và ưu tiên
    /// </summary>
    public class BusinessPostInjectionService
    {
        private readonly IPostRepository _postRepository;
        private readonly ISearchHistoryRepository _searchHistoryRepository;

        public BusinessPostInjectionService(
            IPostRepository postRepository,
            ISearchHistoryRepository searchHistoryRepository)
        {
            _postRepository = postRepository;
            _searchHistoryRepository = searchHistoryRepository;
        }

        /// <summary>
        /// Chèn bài Business vào feed với tần suất 4-5 bài
        /// Ưu tiên: Business đang follow > Business liên quan lịch sử tìm kiếm > Business ngẫu nhiên
        /// </summary>
        /// <param name="normalPosts">Danh sách bài post thường (User posts)</param>
        /// <param name="currentUserId">ID người dùng hiện tại</param>
        /// <returns>Danh sách posts đã được chèn bài Business</returns>
        public async Task<List<Post>> InjectBusinessPostsIntoFeedAsync(
            List<Post> normalPosts, 
            int? currentUserId)
        {
            if (normalPosts == null || !normalPosts.Any())
                return normalPosts ?? new List<Post>();

            // Lấy các bài Business theo thứ tự ưu tiên
            var businessPosts = await GetPrioritizedBusinessPostsAsync(currentUserId);
            
            if (!businessPosts.Any())
                return normalPosts;

            // Chèn bài Business vào feed
            var mergedFeed = new List<Post>();
            var businessIndex = 0;
            var random = new Random();
            var nextInterval = random.Next(4, 6); // Interval ngẫu nhiên 4-5 bài

            for (int i = 0; i < normalPosts.Count; i++)
            {
                mergedFeed.Add(normalPosts[i]);

                // Sau mỗi 4-5 bài thì chèn 1 bài Business
                if ((i + 1) >= nextInterval && businessIndex < businessPosts.Count)
                {
                    var businessPost = businessPosts[businessIndex];
                    
                    // Tránh trùng lặp
                    if (!mergedFeed.Any(p => p.post_id == businessPost.post_id))
                    {
                        mergedFeed.Add(businessPost);
                        businessIndex++;
                        
                        // Interval tiếp theo ngẫu nhiên 4-5
                        nextInterval = mergedFeed.Count + random.Next(4, 6);
                    }
                }
            }

            return mergedFeed;
        }

        /// <summary>
        /// Lấy danh sách bài Business theo thứ tự ưu tiên:
        /// 1. Business mà user đang follow
        /// 2. Business liên quan đến lịch sử tìm kiếm
        /// 3. Business public ngẫu nhiên
        /// </summary>
        private async Task<List<Post>> GetPrioritizedBusinessPostsAsync(int? currentUserId)
        {
            var businessPosts = new List<Post>();

            if (currentUserId.HasValue)
            {
                // 1. Ưu tiên: Business mà user đang follow
                var followedBusinessPosts = await _postRepository.GetFollowedBusinessPostsAsync(currentUserId.Value);
                businessPosts.AddRange(followedBusinessPosts);

                // 2. Ưu tiên: Business liên quan đến lịch sử tìm kiếm
                var searchKeywords = await _searchHistoryRepository.GetTopSearchKeywordsAsync(currentUserId.Value, 10);
                if (searchKeywords.Any())
                {
                    var relevantBusinessPosts = await _postRepository.GetRelevantBusinessPostsByKeywordsAsync(
                        searchKeywords, 
                        currentUserId, 
                        30);
                    
                    // Thêm các bài chưa có trong list
                    foreach (var post in relevantBusinessPosts)
                    {
                        if (!businessPosts.Any(p => p.post_id == post.post_id))
                            businessPosts.Add(post);
                    }
                }
            }

            // 3. Bổ sung: Business posts ngẫu nhiên (public)
            var allBusinessPosts = await _postRepository.GetPublicBusinessPostsAsync(currentUserId);
            foreach (var post in allBusinessPosts)
            {
                if (!businessPosts.Any(p => p.post_id == post.post_id))
                    businessPosts.Add(post);
            }

            return businessPosts;
        }
    }
}
