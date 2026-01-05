import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.js";
import { AdminProvider } from "./contexts/AdminContext.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import Layout from "./components/Layout.js";
import Login from "./pages/auth/Login.js";
import Register from "./pages/auth/Register.js";
import ForgotPassword from "./pages/auth/ForgotPassword.js";
import Dashboard from "./pages/home/Dashboard.js";
import Users from "./pages/users/Users.js";
import Moderation from "./pages/moderation/Moderation.js";
import AIModeration from "./pages/moderation/AIModeration.js";
import Reports from "./pages/reports/Reports.js";
import Analytics from "./pages/analytics/Analytics.js";
import Settings from "./pages/settings/Settings.js";
import BusinessRequests from "./pages/business/BusinessRequests.js";
import AdminActionsLog from "./pages/logs/AdminActionsLog.js";

function App() {
    return (
        <AuthProvider>
            <AdminProvider>
                <BrowserRouter
                    future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true,
                    }}
                >
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                            path="/forgot-password"
                            element={<ForgotPassword />}
                        />
                        {/* Protected Routes */}
                        <Route
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/users" element={<Users />} />
                            <Route
                                path="/moderation"
                                element={<Moderation />}
                            />
                            <Route
                                path="/ai-moderation"
                                element={<AIModeration />}
                            />
                            <Route path="/reports" element={<Reports />} />
                            <Route
                                path="/business-requests"
                                element={<BusinessRequests />}
                            />
                            <Route
                                path="/admin-logs"
                                element={<AdminActionsLog />}
                            />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/settings" element={<Settings />} />
                        </Route>

                        {/* Redirect */}
                        <Route
                            path="/"
                            element={<Navigate to="/dashboard" replace />}
                        />
                        <Route
                            path="*"
                            element={<Navigate to="/dashboard" replace />}
                        />
                    </Routes>
                </BrowserRouter>
            </AdminProvider>
        </AuthProvider>
    );
}

export default App;
