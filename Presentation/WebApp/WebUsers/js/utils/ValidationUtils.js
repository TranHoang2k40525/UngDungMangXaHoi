// ValidationUtils.js - Xử lý validation
class ValidationUtils {
  // Validate email
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate phone number
  static validatePhone(phone) {
    const phoneRegex = /^(\+84|84|0)[1-9][0-9]{8,9}$/;
    return phoneRegex.test(phone);
  }

  // Validate password
  static validatePassword(password) {
    return password.length >= 8;
  }

  // Validate username
  static validateUsername(username) {
    const usernameRegex = /^[\p{L}\p{N}_]{3,20}$/u;
    return usernameRegex.test(username);
  }

  // Validate OTP
  static validateOtp(otp) {
    const otpRegex = /^\d{6}$/;
    return otpRegex.test(otp);
  }

  // Validate form data
  static validateSignupForm(formData) {
    const errors = [];

    if (!formData.Username || !this.validateUsername(formData.Username)) {
      errors.push('Username phải có 3-20 ký tự và chỉ chứa chữ cái, số, dấu gạch dưới');
    }

    if (!formData.FullName || formData.FullName.trim().length < 2) {
      errors.push('Họ tên phải có ít nhất 2 ký tự');
    }

    if (!formData.Email || !this.validateEmail(formData.Email)) {
      errors.push('Email không hợp lệ');
    }

    if (!formData.Phone || !this.validatePhone(formData.Phone)) {
      errors.push('Số điện thoại không hợp lệ');
    }

    if (!formData.Password || !this.validatePassword(formData.Password)) {
      errors.push('Mật khẩu phải có ít nhất 8 ký tự');
    }

    if (!formData.DateOfBirth) {
      errors.push('Ngày sinh không được để trống');
    }

    if (!formData.Gender && formData.Gender !== 0) {
      errors.push('Vui lòng chọn giới tính');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Validate login form
  static validateLoginForm(formData) {
    const errors = [];

    if ((!formData.Email && !formData.Phone) || (formData.Email && formData.Email.trim().length === 0) || (formData.Phone && formData.Phone.trim().length === 0)) {
      errors.push('Vui lòng nhập email hoặc số điện thoại');
    }

    if (!formData.Password || formData.Password.length === 0) {
      errors.push('Vui lòng nhập mật khẩu');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Validate OTP form
  static validateOtpForm(otp) {
    const errors = [];

    if (!otp || !this.validateOtp(otp)) {
      errors.push('Mã OTP phải có 6 chữ số');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Validate password form
  static validatePasswordForm(formData) {
    const errors = [];

    if (!formData.password || !this.validatePassword(formData.password)) {
      errors.push('Mật khẩu phải có ít nhất 8 ký tự');
    }

    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.push('Mật khẩu xác nhận không khớp');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

// Export cho sử dụng
window.ValidationUtils = ValidationUtils;
