import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5297';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Request Business Upgrade (returns QR code, payment ID, and expiry)
export const requestBusinessUpgrade = async () => {
  try {
    const token = getAuthToken();
    const response = await axios.post(
      `${API_BASE_URL}/api/Business/upgrade`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Request business upgrade error:', error);
    throw error.response?.data || error;
  }
};

// Check payment status
export const checkPaymentStatus = async (paymentId) => {
  try {
    const token = getAuthToken();
    const response = await axios.get(
      `${API_BASE_URL}/api/Business/payment-status/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Check payment status error:', error);
    throw error.response?.data || error;
  }
};
