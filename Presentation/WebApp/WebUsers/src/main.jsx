import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { UserProvider } from './context/UserContext.jsx';
import { FollowProvider } from './Context/FollowContext.js';
import './styles/global.css';

console.log('🚀 main.jsx loaded');

const rootElement = document.getElementById('root');
console.log('📦 Root element:', rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <BrowserRouter>
          <UserProvider>
            <FollowProvider>
              <App />
            </FollowProvider>
          </UserProvider>
        </BrowserRouter>
      </React.StrictMode>
    );
    console.log('✅ React app rendered');
  } catch (error) {
    console.error('❌ Error rendering app:', error);
  }
}
