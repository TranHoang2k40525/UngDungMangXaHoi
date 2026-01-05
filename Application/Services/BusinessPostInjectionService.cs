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
        /// Chèn bài Business vào feed với tần suất linh hoạt
        /// - Nếu có User posts: Chèn mỗi 4-5 bài User
        /// - Nếu ít User posts hoặc hết User posts: Vẫn chèn Business posts để đảm bảo hiển thị
        /// Ưu tiên: Business đang follow > Business liên quan lịch sử tìm kiếm > Business ngẫu nhiên
        /// </summary>
        /// <param name="normalPosts">Danh sách User posts (CHỈ account_type == User)</param>
        /// <param name="currentUserId">ID người dùng hiện tại</param>
        /// <returns>Danh sách posts đã được chèn bài Business</returns>
        public async Task<List<Post>> InjectBusinessPostsIntoFeedAsync(
            List<Post> normalPosts, 
            int? currentUserId)
        {
            // Lấy các bài Business theo thứ tự ưu tiên
            var businessPosts = await GetPrioritizedBusinessPostsAsync(currentUserId);
            
            // Nếu không có Business posts, trả về normalPosts
            if (!businessPosts.Any())
                return normalPosts ?? new List<Post>();

            // Nếu không có User posts, trả về chỉ Business posts
            if (normalPosts == null || !normalPosts.Any())
                return businessPosts.Take(20).ToList(); // Giới hạn 20 Business posts

            // Chèn bài Business vào feed
            var mergedFeed = new List<Post>();
            var businessIndex = 0;
            var random = new Random();
            var nextInterval = random.Next(2, 4); // Interval ngẫu nhiên 2-3 bài

            // Track đã thêm business post IDs để tránh duplicate
            var addedBusinessPostIds = new HashSet<int>();
            
            // Chèn Business posts xen kẽ với User posts
            for (int i = 0; i < normalPosts.Count; i++)
            {
                mergedFeed.Add(normalPosts[i]);

                // Sau mỗi 2-3 bài User thì chèn 1 bài Business
                if ((i + 1) >= nextInterval && businessIndex < businessPosts.Count)
                {
                    var businessPost = businessPosts[businessIndex];
                    
                    // Tránh trùng lặp
                    if (!mergedFeed.Any(p => p.post_id == businessPost.post_id) && 
                        !addedBusinessPostIds.Contains(businessPost.post_id))
                    {
                        mergedFeed.Add(businessPost);
                        addedBusinessPostIds.Add(businessPost.post_id);
                        businessIndex++;
                        
                        // Interval tiếp theo ngẫu nhiên 2-3
                        nextInterval = mergedFeed.Count + random.Next(2, 4);
                    }
                    else
                    {
                        // Bỏ qua business post trùng, thử post tiếp theo
                        businessIndex++;
                        i--; // Retry lại vị trí hiện tại với business post khác
                    }
                }
            }

            // QUAN TRỌNG: Nếu còn Business posts chưa chèn, thêm vào cuối feed
            // Đảm bảo tất cả Business posts đều có cơ hội hiển thị, không bị giới hạn bởi số lượng User posts
            while (businessIndex < businessPosts.Count && businessIndex < 3) // Giới hạn thêm tối đa 3 Business posts ở cuối
            {
                var businessPost = businessPosts[businessIndex];
                
                if (!mergedFeed.Any(p => p.post_id == businessPost.post_id) && 
                    !addedBusinessPostIds.Contains(businessPost.post_id))
                {
                    mergedFeed.Add(businessPost);
                    addedBusinessPostIds.Add(businessPost.post_id);
                }
                
                businessIndex++;
            }

            return mergedFeed;
        }

        /// <summary>
        /// Lấy danh sách bài Business theo thứ tự ưu tiên:
        /// 1. Business mà user đang follow (CHỈ 1 bài mới nhất từ mỗi account)
        /// 2. Business liên quan đến lịch sử tìm kiếm
        /// 3. TẤT CẢ Business public còn lại (ngẫu nhiên)
        /// Follow chỉ là ưu tiên, KHÔNG giới hạn chỉ followed Business
        /// </summary>
        private async Task<List<Post>> GetPrioritizedBusinessPostsAsync(int? currentUserId)
        {
            var businessPosts = new List<Post>();

            if (currentUserId.HasValue)
            {
                // 1. Ưu tiên: 1 bài mới nhất từ mỗi Business account đang follow
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

        /// <summary>
        /// Chèn Business VIDEO posts vào reels với tần suất hợp lý (mỗi 4-5 video)
        /// - Ưu tiên: Business đang follow > Business liên quan > Business public
        /// - CHỈ chèn VIDEO POSTS (không chèn ảnh vào reels)
        /// </summary>
        /// <param name="normalVideoPosts">Danh sách User video posts (CHỈ account_type == User VÀ có video)</param>
        /// <param name="currentUserId">ID người dùng hiện tại</param>
        /// <returns>Danh sách video posts đã được chèn Business video ads</returns>
        public async Task<List<Post>> InjectBusinessVideoPostsIntoReelsAsync(
            List<Post> normalVideoPosts, 
            int? currentUserId)
        {
            // Lấy các Business VIDEO posts theo thứ tự ưu tiên
            var businessVideoPosts = await GetPrioritizedBusinessVideoPostsAsync(currentUserId);
            
            // Nếu không có Business video posts, trả về normalVideoPosts
            if (!businessVideoPosts.Any())
                return normalVideoPosts ?? new List<Post>();

            // Nếu không có User video posts, trả về chỉ Business video posts
            if (normalVideoPosts == null || !normalVideoPosts.Any())
                return businessVideoPosts.Take(20).ToList();

            // Chèn Business VIDEO vào reels với interval 2-3 video (cùng tần suất như feed)
            var mergedReels = new List<Post>();
            var businessIndex = 0;
            var random = new Random();
            var nextInterval = random.Next(2, 4); // Interval 2-3 video

            var addedBusinessPostIds = new HashSet<int>();
            
            // Chèn Business video posts xen kẽ với User video posts
            for (int i = 0; i < normalVideoPosts.Count; i++)
            {
                mergedReels.Add(normalVideoPosts[i]);

                // Sau mỗi 2-3 video User thì chèn 1 Business video (cùng tần suất như feed)
                if ((i + 1) >= nextInterval && businessIndex < businessVideoPosts.Count)
                {
                    var businessPost = businessVideoPosts[businessIndex];
                    
                    if (!mergedReels.Any(p => p.post_id == businessPost.post_id) && 
                        !addedBusinessPostIds.Contains(businessPost.post_id))
                    {
                        mergedReels.Add(businessPost);
                        addedBusinessPostIds.Add(businessPost.post_id);
                        businessIndex++;
                        
                        // Interval tiếp theo 2-3 video
                        nextInterval = mergedReels.Count + random.Next(2, 4);
                    }
                    else
                    {
                        businessIndex++;
                        i--;
                    }
                }
            }

            // Thêm Business video posts còn lại vào cuối (max 5)
            while (businessIndex < businessVideoPosts.Count && businessIndex < 5)
            {
                var businessPost = businessVideoPosts[businessIndex];
                
                if (!mergedReels.Any(p => p.post_id == businessPost.post_id) && 
                    !addedBusinessPostIds.Contains(businessPost.post_id))
                {
                    mergedReels.Add(businessPost);
                    addedBusinessPostIds.Add(businessPost.post_id);
                }
                
                businessIndex++;
            }

            return mergedReels;
        }

        /// <summary>
        /// Lấy danh sách Business VIDEO posts theo thứ tự ưu tiên
        /// 1. Business videos từ followed accounts (CHỈ 1 video mới nhất từ mỗi account)
        /// 2. Business videos liên quan search keywords
        /// 3. TẤT CẢ Business videos public còn lại
        /// CHỈ lấy posts có video, không lấy ảnh
        /// </summary>
        private async Task<List<Post>> GetPrioritizedBusinessVideoPostsAsync(int? currentUserId)
        {
            var businessVideoPosts = new List<Post>();

            if (currentUserId.HasValue)
            {
                // 1. Ưu tiên: 1 video mới nhất từ mỗi Business account đang follow
                var followedBusinessVideos = await _postRepository.GetFollowedBusinessVideoPostsAsync(currentUserId.Value);
                businessVideoPosts.AddRange(followedBusinessVideos);

                // 2. Ưu tiên: Business VIDEO liên quan lịch sử tìm kiếm
                var searchKeywords = await _searchHistoryRepository.GetTopSearchKeywordsAsync(currentUserId.Value, 10);
                if (searchKeywords.Any())
                {
                    var relevantBusinessVideos = await _postRepository.GetRelevantBusinessVideoPostsByKeywordsAsync(
                        searchKeywords, 
                        currentUserId, 
                        30);
                    
                    foreach (var post in relevantBusinessVideos)
                    {
                        if (!businessVideoPosts.Any(p => p.post_id == post.post_id))
                            businessVideoPosts.Add(post);
                    }
                }
            }

            // 3. Bổ sung: Business VIDEO posts public (TẤT CẢ, không chỉ followed)
            var allBusinessVideos = await _postRepository.GetPublicBusinessVideoPostsAsync(currentUserId);
            foreach (var post in allBusinessVideos)
            {
                if (!businessVideoPosts.Any(p => p.post_id == post.post_id))
                    businessVideoPosts.Add(post);
            }

            return businessVideoPosts;
        }
    }
}
