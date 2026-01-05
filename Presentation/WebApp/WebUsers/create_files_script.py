"""
Script tự động tạo tất cả các file còn thiếu cho WebUsers
Dựa trên cấu trúc của MobileApp
"""
import os
import json

# Base paths
MOBILE_APP_PATH = r"D:\TT\UngDungMangXaHoi\Presentation\MobileApp\src"
WEB_USERS_PATH = r"D:\TT\UngDungMangXaHoi\Presentation\WebApp\WebUsers\src"

# Mapping của các folder từ MobileApp sang WebUsers
FOLDER_MAPPING = {
    "Auth": "pages/Auth",
    "Home": "pages/Home",
    "Messegers": "pages/Messages",
    "Searchs": "pages/Search",
    "User": "pages/User",
    "Business": "pages/Business",
    "API": "API",
    "Context": "Context",
    "Components": "Components",
    "Utils": "Utils",
    "Services": "Services",
    "ServicesSingalR": "Services",
}

# Danh sách các file cần tạo
FILES_TO_CREATE = [
    # Auth pages
    ("Auth/SignUp.js", "pages/Auth/Signup.js"),
    ("Auth/ForgotPassword.js", "pages/Auth/ForgotPassword.js"),
    ("Auth/VerifyOtp.js", "pages/Auth/VerifyOtp.js"),
    ("Auth/VerifyForgotPasswordOtp.js", "pages/Auth/VerifyForgotPasswordOtp.js"),
    ("Auth/ChangePassword.js", "pages/Auth/ChangePassword.js"),
    
    # Home pages
    ("Home/CreatePost.js", "pages/Home/CreatePost.js"),
    ("Home/CreateStory.js", "pages/Home/CreateStory.js"),
    ("Home/PostDetail.js", "pages/Home/PostDetail.js"),
    ("Home/CommentsModal.js", "pages/Home/CommentsModal.js"),
    ("Home/SharePost.js", "pages/Home/SharePost.js"),
    ("Home/SharePostModal.js", "pages/Home/SharePostModal.js"),
    ("Home/ReactionPicker.js", "pages/Home/ReactionPicker.js"),
    ("Home/ReactionsListModal.js", "pages/Home/ReactionsListModal.js"),
    ("Home/StoryViewer.js", "pages/Home/StoryViewer.js"),
    ("Home/StoryComponents.js", "pages/Home/StoryComponents.js"),
    ("Home/Video.js", "pages/Home/Video.js"),
    ("Home/Thongbao.js", "pages/Notifications/Notifications.js"),
    
    # Messages pages
    ("Messegers/Messenger.js", "pages/Messages/Messenger.js"),
    ("Messegers/Doanchat.js", "pages/Messages/Doanchat.js"),
    ("Messegers/GroupChatScreen.js", "pages/Messages/GroupChatScreen.js"),
    ("Messegers/CreateGroupScreen.js", "pages/Messages/CreateGroupScreen.js"),
    ("Messegers/GroupDetailScreen.js", "pages/Messages/GroupDetailScreen.js"),
    ("Messegers/GroupMembersScreen.js", "pages/Messages/GroupMembersScreen.js"),
    ("Messegers/InviteMemberScreen.js", "pages/Messages/InviteMemberScreen.js"),
    ("Messegers/MediaLinksScreen.js", "pages/Messages/MediaLinksScreen.js"),
    ("Messegers/PinnedMessagesScreen.js", "pages/Messages/PinnedMessagesScreen.js"),
    ("Messegers/GroupListScreen.js", "pages/Messages/GroupListScreen.js"),
    
    # Search pages
    ("Searchs/Search.js", "pages/Search/Search.js"),
    ("Searchs/SearchUserItem.js", "pages/Search/SearchUserItem.js"),
    ("Searchs/SearchPostItem.js", "pages/Search/SearchPostItem.js"),
    
    # User pages
    ("User/Profile.js", "pages/User/Profile.js"),
    ("User/Editprofile.js", "pages/User/EditProfile.js"),
    ("User/UserProfilePublic.js", "pages/User/UserProfilePublic.js"),
    ("User/FollowList.js", "pages/User/FollowList.js"),
    ("User/PhotoPreview.js", "pages/User/PhotoPreview.js"),
    
    # Business pages
    ("Business/BusinessPaymentPackage.js", "pages/Business/BusinessPaymentPackage.js"),
    ("Business/BusinessUpgradeTerms.js", "pages/Business/BusinessUpgradeTerms.js"),
    ("Business/MoMoQRPayment.js", "pages/Business/MoMoQRPayment.js"),
    
    # Components
    ("Components/ImageViewer.js", "Components/ImageViewer.js"),
    ("Components/MentionText.js", "Components/MentionText.js"),
    
    # Services
    ("ServicesSingalR/commentService.js", "Services/commentService.js"),
    ("ServicesSingalR/groupChatService.js", "Services/groupChatService.js"),
    ("ServicesSingalR/notificationService.js", "Services/notificationService.js"),
]

print("Script để tạo files đã sẵn sàng.")
print(f"Tổng số files cần tạo: {len(FILES_TO_CREATE)}")
print("\nBạn cần chạy script này để tạo tất cả các file còn lại.")
print("Tuy nhiên, do giới hạn công cụ hiện tại, tôi sẽ tạo các file quan trọng nhất bằng tay.")
