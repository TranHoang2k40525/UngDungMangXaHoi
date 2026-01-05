/**
 * Report Functionality for User Frontend
 * Add this file to: Presentation/WebApp/WebUsers/js/report.js
 *
 * Usage: Include in index.html before </body>:
 * <script src="../js/report.js"></script>
 */

// Current report target
let currentReportTarget = {
    contentId: null,
    contentType: null,
    reportedUserId: null,
};

/**
 * Initialize report functionality
 */
function initializeReportFeature() {
    // Add report menu to all posts
    addReportMenuToPosts();

    // Add event listeners
    setupReportEventListeners();

    console.log("✅ Report feature initialized");
}

/**
 * Add report menu HTML to all posts
 */
function addReportMenuToPosts() {
    const posts = document.querySelectorAll(".post");

    posts.forEach((post, index) => {
        const moreBtn = post.querySelector(".more-btn");
        if (
            !moreBtn ||
            moreBtn.nextElementSibling?.classList.contains("report-menu")
        ) {
            return; // Skip if already added
        }

        // Get post data (you need to add data-post-id attribute to posts)
        const postId = post.getAttribute("data-post-id") || index + 1;
        const userId = post.getAttribute("data-user-id") || null;

        // Create report menu
        const reportMenu = document.createElement("div");
        reportMenu.className = "report-menu";
        reportMenu.style.display = "none";
        reportMenu.innerHTML = `
      <button class="report-menu-item" onclick="openReportModal(${postId}, 'post', ${userId})">
        <i class="fas fa-flag"></i> Báo cáo vi phạm
      </button>
      <button class="report-menu-item" onclick="hideReportMenu()">
        <i class="fas fa-times"></i> Hủy
      </button>
    `;

        // Insert after more button
        moreBtn.parentNode.insertBefore(reportMenu, moreBtn.nextSibling);
    });
}

/**
 * Setup event listeners
 */
function setupReportEventListeners() {
    // Toggle report menu on 3-dot click
    document.addEventListener("click", function (e) {
        if (e.target.closest(".more-btn")) {
            e.stopPropagation();
            const btn = e.target.closest(".more-btn");
            const menu = btn.nextElementSibling;

            // Hide all other menus
            document.querySelectorAll(".report-menu").forEach((m) => {
                if (m !== menu) m.style.display = "none";
            });

            // Toggle current menu
            menu.style.display =
                menu.style.display === "none" ? "block" : "none";
        } else if (!e.target.closest(".report-menu")) {
            // Click outside - hide all menus
            hideAllReportMenus();
        }
    });

    // Close modal when clicking outside
    document.addEventListener("click", function (e) {
        const modal = document.getElementById("reportModal");
        if (e.target === modal) {
            closeReportModal();
        }
    });

    // Close modal with ESC key
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeReportModal();
        }
    });
}

/**
 * Hide all report menus
 */
function hideAllReportMenus() {
    document.querySelectorAll(".report-menu").forEach((m) => {
        m.style.display = "none";
    });
}

/**
 * Hide report menu (called from button)
 */
function hideReportMenu() {
    hideAllReportMenus();
}

/**
 * Open report modal
 * @param {number} contentId - ID of post/comment
 * @param {string} contentType - 'post' or 'comment'
 * @param {number} reportedUserId - ID of user who created the content
 */
function openReportModal(
    contentId,
    contentType = "post",
    reportedUserId = null
) {
    currentReportTarget = { contentId, contentType, reportedUserId };

    // Reset form
    document.querySelectorAll('input[name="reportReason"]').forEach((input) => {
        input.checked = false;
    });
    const descField = document.getElementById("reportDescription");
    if (descField) descField.value = "";

    // Show modal
    const modal = document.getElementById("reportModal");
    if (modal) {
        modal.style.display = "flex";
    } else {
        console.error("Report modal not found! Make sure to add modal HTML");
        createReportModal(); // Auto-create if missing
        modal.style.display = "flex";
    }

    hideAllReportMenus();
}

/**
 * Close report modal
 */
function closeReportModal() {
    const modal = document.getElementById("reportModal");
    if (modal) {
        modal.style.display = "none";
    }
}

/**
 * Submit report to backend
 */
async function submitReport() {
    const selectedReason = document.querySelector(
        'input[name="reportReason"]:checked'
    );

    if (!selectedReason) {
        showNotification("Vui lòng chọn lý do báo cáo", "warning");
        return;
    }

    const description =
        document.getElementById("reportDescription")?.value || "";
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
        showNotification("Vui lòng đăng nhập để báo cáo", "error");
        setTimeout(() => {
            window.location.href = "/login.html";
        }, 2000);
        return;
    }

    // Disable submit button
    const submitBtn = document.querySelector(".btn-submit");
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

    try {
        const response = await fetch("http://localhost:5297/api/reports", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                contentType: currentReportTarget.contentType,
                contentId: currentReportTarget.contentId,
                reportedUserId: currentReportTarget.reportedUserId,
                reason: selectedReason.value,
                description: description || null,
            }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification(
                "✅ Đã gửi báo cáo thành công! Chúng tôi sẽ xem xét trong thời gian sớm nhất.",
                "success"
            );
            closeReportModal();

            // Log for admin debugging
            console.log("Report submitted:", {
                reportId: data.reportId,
                reason: selectedReason.value,
                contentType: currentReportTarget.contentType,
                contentId: currentReportTarget.contentId,
            });
        } else {
            showNotification(
                "❌ Lỗi: " + (data.message || "Không thể gửi báo cáo"),
                "error"
            );
        }
    } catch (error) {
        console.error("Error submitting report:", error);
        showNotification(
            "❌ Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại.",
            "error"
        );
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
}

/**
 * Show notification to user
 * @param {string} message
 * @param {string} type - 'success', 'error', 'warning', 'info'
 */
function showNotification(message, type = "info") {
    // Check if alert function exists
    if (typeof alert === "function") {
        alert(message);
        return;
    }

    // Create custom notification (optional)
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${
        type === "success"
            ? "#4CAF50"
            : type === "error"
            ? "#f44336"
            : "#ff9800"
    };
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10001;
    animation: slideInRight 0.3s;
  `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = "slideOutRight 0.3s";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Create report modal dynamically if not exists
 */
function createReportModal() {
    if (document.getElementById("reportModal")) return;

    const modalHTML = `
    <div id="reportModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2><i class="fas fa-flag"></i> Báo cáo vi phạm</h2>
          <button class="close-btn" onclick="closeReportModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <p style="margin-bottom: 20px; color: #666;">
            Vui lòng chọn lý do báo cáo:
          </p>
          
          <div class="report-reasons">
            <label class="report-reason-item">
              <input type="radio" name="reportReason" value="Spam" required>
              <span>
                <strong><i class="fas fa-bullhorn"></i> Spam</strong>
                <small>Quảng cáo không mong muốn hoặc lặp đi lặp lại</small>
              </span>
            </label>
            
            <label class="report-reason-item">
              <input type="radio" name="reportReason" value="Nội dung không phù hợp">
              <span>
                <strong><i class="fas fa-exclamation-triangle"></i> Nội dung không phù hợp</strong>
                <small>Hình ảnh bạo lực, nội dung nhạy cảm</small>
              </span>
            </label>
            
            <label class="report-reason-item">
              <input type="radio" name="reportReason" value="Vi phạm bản quyền">
              <span>
                <strong><i class="fas fa-copyright"></i> Vi phạm bản quyền</strong>
                <small>Sử dụng tác phẩm mà không có quyền</small>
              </span>
            </label>
            
            <label class="report-reason-item">
              <input type="radio" name="reportReason" value="Ngôn từ thù địch">
              <span>
                <strong><i class="fas fa-comment-slash"></i> Ngôn từ thù địch</strong>
                <small>Xúc phạm, kỳ thị chủng tộc hoặc tôn giáo</small>
              </span>
            </label>
            
            <label class="report-reason-item">
              <input type="radio" name="reportReason" value="Quấy rối">
              <span>
                <strong><i class="fas fa-user-slash"></i> Quấy rối</strong>
                <small>Gây phiền nhiễu hoặc đe dọa</small>
              </span>
            </label>
            
            <label class="report-reason-item">
              <input type="radio" name="reportReason" value="Lừa đảo">
              <span>
                <strong><i class="fas fa-shield-alt"></i> Lừa đảo</strong>
                <small>Lừa đảo tài chính hoặc thông tin cá nhân</small>
              </span>
            </label>
          </div>
          
          <div style="margin-top: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">
              Mô tả chi tiết (tùy chọn):
            </label>
            <textarea 
              id="reportDescription" 
              placeholder="Nhập thêm thông tin về vi phạm..."
              style="width: 100%; min-height: 80px; padding: 10px; border: 1px solid #dbdbdb; border-radius: 8px; resize: vertical; font-family: inherit;"
            ></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeReportModal()">
            Hủy
          </button>
          <button class="btn-submit" onclick="submitReport()">
            <i class="fas fa-paper-plane"></i> Gửi báo cáo
          </button>
        </div>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    console.log("✅ Report modal created dynamically");
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeReportFeature);
} else {
    initializeReportFeature();
}
