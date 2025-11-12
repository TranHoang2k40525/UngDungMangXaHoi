using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UngDungMangXaHoi.Application.DTOs;
using UngDungMangXaHoi.Domain.Interfaces;

namespace UngDungMangXaHoi.Application.Services
{
    /// <summary>
    /// Service xử lý tìm kiếm users và posts với priority ranking
    /// Priority cho users: 1=Following, 2=Messaged Before, 3=Stranger
    /// Priority cho posts: 1=From Following/Messaged, 2=From Stranger
    /// </summary>
    public class SearchService
    {
        private readonly IUserRepository _userRepository;
        private readonly IPostRepository _postRepository;

        public SearchService(IUserRepository userRepository, IPostRepository postRepository)
        {
            _userRepository = userRepository;
            _postRepository = postRepository;
        }

        // Helper an toàn để extract userId từ IEnumerable<object> (tránh lỗi runtime dynamic binder)
        private List<int> ExtractUserIds(IEnumerable<object> rawList)
        {
            var ids = new List<int>();
            if (rawList == null) return ids;
            foreach (var item in rawList)
            {
                if (item == null) continue;
                var t = item.GetType();
                // Tìm property tên userId (đúng với anonymous type trong repository)
                var prop = t.GetProperty("userId") ?? t.GetProperty("UserId");
                if (prop != null)
                {
                    var val = prop.GetValue(item);
                    if (val is int i)
                    {
                        ids.Add(i);
                        continue;
                    }
                    // Trường hợp value không phải int nhưng có thể convert
                    if (val != null && int.TryParse(val.ToString(), out var parsed))
                    {
                        ids.Add(parsed);
                    }
                }
            }
            return ids;
        }

        /// <summary>
        /// Tìm kiếm users theo username hoặc fullname
        /// Hỗ trợ tìm kiếm với @ (ví dụ: @quan)
        /// 
        /// Priority Ranking:
        /// - Priority 1: Following users
        /// - Priority 2: Users messaged before  
        /// - Priority 3: Strangers
        /// 
        /// Khi chỉ gõ "@" (không có text): hiển thị following users + messaged before users
        /// </summary>
        public async Task<SearchResultDto<SearchUserDto>> SearchUsersAsync(
            string query, 
            int? currentUserId,
            int pageNumber = 1, 
            int pageSize = 20)
        {
            // Loại bỏ @ nếu có
            var searchTerm = query.TrimStart('@').Trim();

            List<SearchUserDto> userDtos = new List<SearchUserDto>();

            // Case 1: Chỉ gõ "@" (empty search) - Hiển thị following + messaged before
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                if (currentUserId.HasValue)
                {
                    userDtos = await GetFollowingAndMessagedUsersAsync(currentUserId.Value);
                }
                else
                {
                    // Không có currentUserId, trả về empty
                    return new SearchResultDto<SearchUserDto>
                    {
                        Results = new List<SearchUserDto>(),
                        TotalCount = 0,
                        PageNumber = pageNumber,
                        PageSize = pageSize
                    };
                }
            }
            // Case 2: Gõ "@n" (có search term) - Tìm kiếm và sort theo priority
            else
            {
                // Gọi repository để tìm kiếm
                var users = await _userRepository.SearchUsersAsync(searchTerm, 1, 100); // Get more for sorting

                // Get following users và messaged before users
                HashSet<int> followingUserIds = new HashSet<int>();
                HashSet<int> messagedUserIds = new HashSet<int>();

                if (currentUserId.HasValue)
                {
                    var followingList = await _userRepository.GetFollowingListAsync(currentUserId.Value);
                    followingUserIds = new HashSet<int>(ExtractUserIds(followingList));

                    var messagedList = await _userRepository.GetUsersMessagedBeforeAsync(currentUserId.Value);
                    messagedUserIds = new HashSet<int>(messagedList);
                }

                // Build DTOs với priority
                foreach (var user in users)
                {
                    // Skip current user
                    if (currentUserId.HasValue && currentUserId.Value == user.user_id)
                        continue;

                    bool isFollowing = followingUserIds.Contains(user.user_id);
                    bool hasMessaged = messagedUserIds.Contains(user.user_id);

                    // Determine priority: 1=Following, 2=Messaged, 3=Stranger
                    int priority = 3; // Default: Stranger
                    if (isFollowing)
                        priority = 1;
                    else if (hasMessaged)
                        priority = 2;

                    var followersCount = await _userRepository.GetFollowersCountAsync(user.user_id);

                    userDtos.Add(new SearchUserDto
                    {
                        UserId = user.user_id,
                        UserName = user.username.Value,
                        FullName = user.full_name ?? string.Empty,
                        AvatarUrl = user.avatar_url?.Value,
                        Bio = user.bio,
                        IsFollowing = isFollowing,
                        HasMessagedBefore = hasMessaged,
                        Priority = priority,
                        FollowersCount = followersCount
                    });
                }

                // Sort by priority first, then by followers count
                userDtos = userDtos
                    .OrderBy(u => u.Priority)
                    .ThenByDescending(u => u.FollowersCount)
                    .ToList();
            }

            // Apply pagination
            var paginatedResults = userDtos
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return new SearchResultDto<SearchUserDto>
            {
                Results = paginatedResults,
                TotalCount = userDtos.Count,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        /// <summary>
        /// Helper method: Lấy danh sách following + messaged before users
        /// Dùng khi chỉ gõ "@" mà không có text search
        /// </summary>
        private async Task<List<SearchUserDto>> GetFollowingAndMessagedUsersAsync(int currentUserId)
        {
            var userDtos = new List<SearchUserDto>();

            // Get following users
            var followingList = await _userRepository.GetFollowingListAsync(currentUserId);
            var followingUserIds = ExtractUserIds(followingList);

            // Get messaged users
            var messagedUserIds = (await _userRepository.GetUsersMessagedBeforeAsync(currentUserId)).ToList();

            // Combine và remove duplicates
            var allUserIds = followingUserIds.Union(messagedUserIds).Distinct().ToList();

            // Get full user info
            var users = await _userRepository.GetUsersByIdsAsync(allUserIds);

            foreach (var user in users)
            {
                bool isFollowing = followingUserIds.Contains(user.user_id);
                bool hasMessaged = messagedUserIds.Contains(user.user_id);

                int priority = isFollowing ? 1 : 2; // Following=1, Messaged=2

                var followersCount = await _userRepository.GetFollowersCountAsync(user.user_id);

                userDtos.Add(new SearchUserDto
                {
                    UserId = user.user_id,
                    UserName = user.username.Value,
                    FullName = user.full_name ?? string.Empty,
                    AvatarUrl = user.avatar_url?.Value,
                    Bio = user.bio,
                    IsFollowing = isFollowing,
                    HasMessagedBefore = hasMessaged,
                    Priority = priority,
                    FollowersCount = followersCount
                });
            }

            // Sort: Following first, then Messaged
            return userDtos.OrderBy(u => u.Priority).ThenByDescending(u => u.FollowersCount).ToList();
        }        /// <summary>
        /// Tìm kiếm posts theo caption (hỗ trợ hashtags với #)
        /// Ví dụ: #travel, #food
        /// 
        /// Priority Ranking:
        /// - Priority 1: Posts from following/messaged users
        /// - Priority 2: Posts from strangers
        /// 
        /// Chỉ gõ "#" → không hiển thị gì (trả về empty)
        /// Gõ "#a" → tìm posts có caption chứa "a"
        /// </summary>
        public async Task<SearchResultDto<SearchPostDto>> SearchPostsAsync(
            string query, 
            int? currentUserId,
            int pageNumber = 1, 
            int pageSize = 20)
        {
            // Loại bỏ # nếu có
            var searchTerm = query.TrimStart('#').Trim();

            // Case 1: Chỉ gõ "#" (empty) → Không hiển thị gì
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                return new SearchResultDto<SearchPostDto>
                {
                    Results = new List<SearchPostDto>(),
                    TotalCount = 0,
                    PageNumber = pageNumber,
                    PageSize = pageSize
                };
            }

            // Case 2: Gõ "#a" → Search posts và sort theo priority
            var posts = await _postRepository.SearchPostsByCaptionAsync(searchTerm, 1, 200); // Get more for sorting

            // Get following users và messaged users - SỬ DỤNG ExtractUserIds
            HashSet<int> priorityUserIds = new HashSet<int>(); // Following + Messaged users

            if (currentUserId.HasValue)
            {
                try
                {
                    var followingList = await _userRepository.GetFollowingListAsync(currentUserId.Value);
                    var followingIds = ExtractUserIds(followingList);  // Dùng helper an toàn
                    
                    var messagedIds = await _userRepository.GetUsersMessagedBeforeAsync(currentUserId.Value);
                    
                    priorityUserIds = new HashSet<int>(followingIds.Union(messagedIds));
                }
                catch (Exception ex)
                {
                    // Log lỗi nhưng vẫn tiếp tục với priorityUserIds rỗng
                    Console.WriteLine($"[SearchService] Error getting priority users: {ex.Message}");
                }
            }

            var postDtos = new List<SearchPostDto>();

            foreach (var post in posts)
            {
                var user = await _userRepository.GetByIdAsync(post.user_id);
                if (user == null) continue;

                // Determine priority
                bool isFromPriorityUser = priorityUserIds.Contains(post.user_id);
                int priority = isFromPriorityUser ? 1 : 2;                // Lấy media đầu tiên để làm thumbnail
                var firstMedia = post.Media?.FirstOrDefault();
                
                // Build full thumbnail URL
                string? thumbnailUrl = null;
                if (firstMedia != null && !string.IsNullOrEmpty(firstMedia.media_url))
                {
                    thumbnailUrl = firstMedia.media_url;
                    // Nếu không phải URL đầy đủ, build đường dẫn đến Assets
                    if (!thumbnailUrl.StartsWith("http"))
                    {
                        if (!thumbnailUrl.StartsWith("/"))
                        {
                            // Xác định loại media để build đúng đường dẫn
                            var mediaFolder = firstMedia.media_type?.ToLower() == "video" ? "Videos" : "Images";
                            thumbnailUrl = $"/Assets/{mediaFolder}/{thumbnailUrl}";
                        }
                    }
                }

                postDtos.Add(new SearchPostDto
                {
                    PostId = post.post_id,
                    Caption = post.caption ?? string.Empty,
                    Location = post.location,
                    CreatedAt = post.created_at.DateTime,
                    LikesCount = 0, // TODO: Thêm logic đếm likes
                    CommentsCount = 0, // TODO: Thêm logic đếm comments
                    UserId = user.user_id,
                    UserName = user.username.Value,
                    FullName = user.full_name ?? string.Empty,
                    UserAvatarUrl = user.avatar_url?.Value,
                    ThumbnailUrl = thumbnailUrl,
                    MediaType = firstMedia?.media_type,
                    Priority = priority,
                    IsFromFollowing = priorityUserIds.Contains(post.user_id)
                });
            }

            // Sort by priority first, then by created date
            postDtos = postDtos
                .OrderBy(p => p.Priority)
                .ThenByDescending(p => p.CreatedAt)
                .ToList();

            // Apply pagination
            var paginatedResults = postDtos
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return new SearchResultDto<SearchPostDto>
            {
                Results = paginatedResults,
                TotalCount = postDtos.Count,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        /// <summary>
        /// Tìm kiếm cả users và posts
        /// </summary>
        public async Task<SearchAllResultDto> SearchAllAsync(string query, int? currentUserId)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return new SearchAllResultDto();
            }

            var usersTask = SearchUsersAsync(query, currentUserId, 1, 10);
            var postsTask = SearchPostsAsync(query, currentUserId, 1, 10);

            await Task.WhenAll(usersTask, postsTask);

            var usersResult = await usersTask;
            var postsResult = await postsTask;

            return new SearchAllResultDto
            {
                Users = usersResult.Results,
                Posts = postsResult.Results,
                TotalUsersCount = usersResult.TotalCount,
                TotalPostsCount = postsResult.TotalCount
            };
        }
    }
}
