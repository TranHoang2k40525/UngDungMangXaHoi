// ====================================================================
// TEST MODAL CLICK FUNCTIONALITY
// Mở Chrome DevTools Console và paste script này để test
// ====================================================================

console.log("🔍 Testing Entity Details Modal...");

// Test 1: Simulate clicking on a log item with entityId
console.log("\n📝 Test 1: Click vào log có EntityId");

// Find all clickable log items
const clickableItems = document.querySelectorAll(".log-item.clickable");
console.log(`✅ Tìm thấy ${clickableItems.length} log items có thể click`);

if (clickableItems.length > 0) {
    console.log("\n🖱️ Click vào log đầu tiên...");
    clickableItems[0].click();

    setTimeout(() => {
        // Check if modal opened
        const modal = document.querySelector(".entity-details-modal");
        if (modal) {
            console.log("✅ Modal đã mở!");
            console.log(
                "📊 Nội dung modal:",
                modal.innerHTML.substring(0, 200) + "..."
            );
        } else {
            console.error("❌ Modal không mở!");
        }

        // Check for errors
        const errorElements = document.querySelectorAll(
            ".error-message, .error"
        );
        if (errorElements.length > 0) {
            console.error("⚠️ Có lỗi:", errorElements[0].textContent);
        }

        // Check loading state
        const loadingElements = document.querySelectorAll(".loading");
        if (loadingElements.length > 0) {
            console.log("⏳ Đang loading...");
        }
    }, 1000);
} else {
    console.error("❌ Không tìm thấy log items có thể click!");
    console.log("🔍 Kiểm tra xem có log nào có EntityId không...");
}

// Test 2: Check API endpoint
console.log("\n📡 Test 2: Kiểm tra API endpoint");
fetch(
    "http://localhost:5297/api/admin/activity-logs/entity-details?entityType=report&entityId=1"
)
    .then((res) => res.json())
    .then((data) => {
        console.log("✅ API response:", data);
        if (data.success) {
            console.log("✅ API hoạt động tốt!");
            console.log("📊 Data:", data.data);
        } else {
            console.error("❌ API trả về lỗi:", data.message);
        }
    })
    .catch((err) => {
        console.error("❌ Lỗi khi gọi API:", err);
    });

// Test 3: Check CSS
console.log("\n🎨 Test 3: Kiểm tra CSS");
const clickableItem = document.querySelector(".log-item.clickable");
if (clickableItem) {
    const styles = window.getComputedStyle(clickableItem);
    console.log("Cursor:", styles.cursor);
    console.log("Border:", styles.border);

    if (styles.cursor === "pointer") {
        console.log("✅ CSS cursor đúng!");
    } else {
        console.error("❌ CSS cursor sai! Đang là:", styles.cursor);
    }
}

console.log("\n✅ Test hoàn tất! Kiểm tra kết quả ở trên.");
