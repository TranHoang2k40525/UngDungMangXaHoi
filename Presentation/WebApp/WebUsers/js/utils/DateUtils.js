// DateUtils.js - Xử lý ngày tháng
class DateUtils {
  // Parse date từ input date (YYYY-MM-DD) thành Date object
  static parseDateOfBirth(dateStr) {
    if (!dateStr) return new Date();
    return new Date(dateStr);
  }

  // Format date thành string hiển thị
  static formatDate(date, format = 'DD/MM/YYYY') {
    if (!date) return '';
    
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }

  // Kiểm tra ngày có hợp lệ không
  static isValidDate(dateStr) {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  }

  // Kiểm tra ngày có trong quá khứ không
  static isPastDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  // Tính tuổi từ ngày sinh
  static calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Lấy ngày hiện tại theo format
  static getCurrentDate(format = 'YYYY-MM-DD') {
    const today = new Date();
    return this.formatDate(today, format);
  }

  // Lấy ngày tối đa cho input date (hôm nay)
  static getMaxDate() {
    return this.getCurrentDate('YYYY-MM-DD');
  }

  // Lấy ngày tối thiểu cho input date (100 năm trước)
  static getMinDate() {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    return this.formatDate(minDate, 'YYYY-MM-DD');
  }
}

// Export cho sử dụng
window.DateUtils = DateUtils;
