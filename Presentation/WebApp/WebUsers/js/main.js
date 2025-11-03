// main.js - File chính để load tất cả các module
class WebApp {
  constructor() {
    this.init();
  }

  init() {
    this.loadScripts();
    this.setupGlobalErrorHandling();
  }

  loadScripts() {
    // Load các script theo thứ tự
    const scripts = [
      'js/utils/DateUtils.js',
      'js/utils/ValidationUtils.js',
      'js/utils/UIUtils.js',
      'js/services/AuthService.js'
    ];

    this.loadScriptsSequentially(scripts, () => {
      // Load page-specific script sau khi load xong các script cơ bản
      this.loadPageScript();
    });
  }

  loadScriptsSequentially(scripts, callback) {
    let loadedCount = 0;
    
    scripts.forEach((script, index) => {
      const scriptElement = document.createElement('script');
      scriptElement.src = script;
      scriptElement.onload = () => {
        loadedCount++;
        if (loadedCount === scripts.length) {
          callback();
        }
      };
      scriptElement.onerror = () => {
        console.error(`Failed to load script: ${script}`);
        loadedCount++;
        if (loadedCount === scripts.length) {
          callback();
        }
      };
      document.head.appendChild(scriptElement);
    });
  }

  loadPageScript() {
    const currentPage = this.getCurrentPage();
    const pageScripts = {
      'login': 'js/pages/LoginPage.js',
      'signup': 'js/pages/SignupPage.js',
      'verify-otp': 'js/pages/VerifyOtpPage.js',
      'forgot-password': 'js/pages/ForgotPasswordPage.js',
      'reset-password': 'js/pages/ResetPasswordPage.js',
      'change-password': 'js/pages/ChangePasswordPage.js',
      'change-password-otp': 'js/pages/ChangePasswordPage.js',
      'home': 'js/pages/HomePage.js',
      'profile': 'js/pages/ProfilePage.js',
      'create-post': 'js/pages/CreatePostPage.js',
  'reels': 'js/pages/ReelsPage.js',
  'edit-profile': 'js/pages/EditProfilePage.js'
    };

    const scriptPath = pageScripts[currentPage];
    if (scriptPath) {
      const scriptElement = document.createElement('script');
      scriptElement.src = scriptPath;
      scriptElement.onload = () => {
        console.log(`Loaded page script: ${scriptPath}`);
      };
      scriptElement.onerror = () => {
        console.error(`Failed to load page script: ${scriptPath}`);
      };
      document.head.appendChild(scriptElement);
    }
  }

  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().split('.')[0];
    
    // Map filename to page name
    const pageMap = {
      'login': 'login',
      'signup': 'signup',
      'verify-otp': 'verify-otp',
      'forgot-password': 'forgot-password',
      'forgot-password-otp': 'forgot-password',
      'verify-forgot-password-otp': 'forgot-password',
      'reset-password': 'reset-password',
      'change-password': 'change-password',
      'change-password-otp': 'change-password',
      'index': 'home',
      'profile': 'profile',
      'create-post': 'create-post',
      'reels': 'reels',
      'edit-profile': 'edit-profile'
    };

    return pageMap[filename] || 'home';
  }

  setupGlobalErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }
}

// Khởi tạo app
document.addEventListener('DOMContentLoaded', () => {
  new WebApp();
});
