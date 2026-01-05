import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './context/UserContext.jsx';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ForgotPassword from './pages/Auth/ForgotPassword';
import VerifyOtp from './pages/Auth/VerifyOtp';
import VerifyForgotPasswordOtp from './pages/Auth/VerifyForgotPasswordOtp';
import ResetPassword from './pages/Auth/ResetPassword';
import ChangePassword from './pages/Auth/ChangePassword';
import SearchPage from './pages/Search/Search';
import ProfilePage from './pages/Profile/Profile';
import NotificationsPage from './pages/Notifications/Notifications';
import Video from './pages/Video/Video';

// Story pages
import CreateStory from './pages/Home/CreateStory';
import StoryViewer from './pages/Home/StoryViewer';

// Post pages  
import CreatePost from './pages/Home/CreatePost';
import PostDetail from './pages/Home/PostDetail';
import SharePost from './pages/Home/SharePost';

// Messenger pages
import Messenger from './pages/Messenger/Messenger';
import Doanchat from './pages/Messenger/Doanchat';
import CreateGroupScreen from './pages/Messenger/CreateGroupScreen';
import GroupChatScreen from './pages/Messenger/GroupChatScreen';
import GroupDetailScreen from './pages/Messenger/GroupDetailScreen';
import GroupMembersScreen from './pages/Messenger/GroupMembersScreen';
import InviteMemberScreen from './pages/Messenger/InviteMemberScreen';
import MediaLinksScreen from './pages/Messenger/MediaLinksScreen';
import PinnedMessagesScreen from './pages/Messenger/PinnedMessagesScreen';

// Profile pages
import EditProfile from './pages/Profile/EditProfile';
import FollowList from './pages/Profile/FollowList';
import UserProfilePublic from './pages/Profile/UserProfilePublic';

import './styles/global.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <p>Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Home */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      
      {/* Video Route */}
      <Route
        path="/video"
        element={
          <ProtectedRoute>
            <Video />
          </ProtectedRoute>
        }
      />
      
      {/* Story Routes */}
      <Route
        path="/create-story"
        element={
          <ProtectedRoute>
            <CreateStory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/story-viewer"
        element={
          <ProtectedRoute>
            <StoryViewer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/story/:userId"
        element={
          <ProtectedRoute>
            <StoryViewer />
          </ProtectedRoute>
        }
      />
      
      {/* Post Routes */}
      <Route
        path="/create-post"
        element={
          <ProtectedRoute>
            <CreatePost />
          </ProtectedRoute>
        }
      />
      <Route
        path="/post/:postId"
        element={
          <ProtectedRoute>
            <PostDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/share-post/:postId"
        element={
          <ProtectedRoute>
            <SharePost />
          </ProtectedRoute>
        }
      />
      
      {/* Messenger Routes */}
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messenger />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messenger"
        element={
          <ProtectedRoute>
            <Messenger />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messenger/chat/:conversationId"
        element={
          <ProtectedRoute>
            <Doanchat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messenger/create-group"
        element={
          <ProtectedRoute>
            <CreateGroupScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messenger/group-chat/:conversationId"
        element={
          <ProtectedRoute>
            <GroupChatScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messenger/group/:conversationId"
        element={
          <ProtectedRoute>
            <GroupDetailScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messenger/group/:conversationId/members"
        element={
          <ProtectedRoute>
            <GroupMembersScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messenger/group/:conversationId/invite"
        element={
          <ProtectedRoute>
            <InviteMemberScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messenger/group/:conversationId/media"
        element={
          <ProtectedRoute>
            <MediaLinksScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messenger/group/:conversationId/pinned"
        element={
          <ProtectedRoute>
            <PinnedMessagesScreen />
          </ProtectedRoute>
        }
      />
      
      {/* Search Routes */}
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      
      {/* Profile Routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:type/:userId"
        element={
          <ProtectedRoute>
            <FollowList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:userId"
        element={
          <ProtectedRoute>
            <UserProfilePublic />
          </ProtectedRoute>
        }
      />
      
      {/* Notifications */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route
        path="/verify-forgot-password-otp"
        element={<VerifyForgotPasswordOtp />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
