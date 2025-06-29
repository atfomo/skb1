// client/src/pages/AdminDashboard.jsx (New component)
import React from 'react';
import { Link, Outlet } from 'react-router-dom'; // Outlet for nested routes

const AdminDashboard = () => {
    return (
        <div className="flex">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-gray-800 text-white p-4 min-h-screen">
                <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>
                <nav>
                    <ul>
                        <li className="mb-2">
                            <Link to="/admin/task-verification" className="block p-2 rounded hover:bg-gray-700">Task Verification</Link>
                        </li>
                        <li className="mb-2">
                            <Link to="/admin/boost-volume/campaigns" className="block p-2 rounded hover:bg-gray-700">Boost Volume Campaigns</Link>
                        </li>
                        <li className="mb-2">
                            <Link to="/admin/banner-controller" className="block p-2 rounded hover:bg-gray-700">Banner Control</Link>
                        </li>
                        {/* Add more admin links here */}
                    </ul>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6">
                <Outlet /> {/* This will render the nested admin routes */}
            </main>
        </div>
    );
};

export default AdminDashboard;