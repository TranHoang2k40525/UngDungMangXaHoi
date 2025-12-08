import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.js';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <Outlet />
      </div>
    </div>
  );
}
