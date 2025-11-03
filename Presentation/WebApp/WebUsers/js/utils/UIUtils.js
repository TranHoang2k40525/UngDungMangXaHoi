// UIUtils.js - Xử lý UI và DOM
class UIUtils {
  // Hiển thị loading state
  static showLoading(button, loadingText = 'Đang xử lý...') {
    if (button) {
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
      button.disabled = true;
    }
  }

  // Ẩn loading state
  static hideLoading(button) {
    if (button && button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      button.disabled = false;
      delete button.dataset.originalText;
    }
  }

  // Hiển thị thông báo lỗi
  static showError(messageElement, message) {
    if (messageElement) {
      messageElement.textContent = message;
      messageElement.style.color = 'red';
      messageElement.style.display = 'block';
    }
  }

  // Hiển thị thông báo thành công
  static showSuccess(messageElement, message) {
    if (messageElement) {
      messageElement.textContent = message;
      messageElement.style.color = 'green';
      messageElement.style.display = 'block';
    }
  }

  // Ẩn thông báo
  static hideMessage(messageElement) {
    if (messageElement) {
      messageElement.textContent = '';
      messageElement.style.display = 'none';
    }
  }

  // Hiển thị alert
  static showAlert(message, type = 'info') {
    alert(message);
  }

  // Hiển thị confirm
  static showConfirm(message) {
    return confirm(message);
  }

  // Chuyển hướng trang
  static redirect(url) {
    window.location.href = url;
  }

  // Chuyển hướng với delay
  static redirectWithDelay(url, delay = 2000) {
    setTimeout(() => {
      this.redirect(url);
    }, delay);
  }

  // Lấy giá trị form
  static getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  }

  // Set giá trị form
  static setFormData(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;

    Object.keys(data).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = data[key];
      }
    });
  }

  // Clear form
  static clearForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.reset();
  }

  // Toggle password visibility
  static togglePasswordVisibility(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    
    if (input && toggle) {
      if (input.type === 'password') {
        input.type = 'text';
        toggle.textContent = '👁️';
      } else {
        input.type = 'password';
        toggle.textContent = '👁️';
      }
    }
  }

  // Validate và highlight input
  static validateInput(input, isValid, errorMessage = '') {
    if (isValid) {
      input.style.borderColor = '#28a745';
      input.style.borderWidth = '2px';
    } else {
      input.style.borderColor = '#dc3545';
      input.style.borderWidth = '2px';
    }
    
    // Hiển thị error message nếu có
    let errorElement = input.parentNode.querySelector('.error-message');
    if (errorMessage && !isValid) {
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.style.color = '#dc3545';
        errorElement.style.fontSize = '12px';
        errorElement.style.marginTop = '4px';
        input.parentNode.appendChild(errorElement);
      }
      errorElement.textContent = errorMessage;
    } else if (errorElement) {
      errorElement.remove();
    }
  }

  // Smooth scroll to element
  static scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Debounce function
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Export cho sử dụng
window.UIUtils = UIUtils;
