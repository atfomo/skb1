import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../../UserContext'; // To get the admin's token
import { API_BASE_URL } from '../../config'; // Assuming you have this for your backend URL

const AdminBannerController = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentBanner, setCurrentBanner] = useState(null); // For editing
    const [newBannerImage, setNewBannerImage] = useState(null); // For new image upload

    const { token } = useUser();

    useEffect(() => {
        if (token) {
            fetchBanners();
        }
    }, [token]);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${API_BASE_URL}/api/admin/banners`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBanners(response.data);
        } catch (err) {
            console.error("Error fetching banners:", err.response?.data || err.message);
            setError("Failed to load banners. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setNewBannerImage(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', e.target.title.value);
        formData.append('link', e.target.link.value);
        formData.append('order', e.target.order.value);
        formData.append('isActive', e.target.isActive.checked);

        if (newBannerImage) {
            formData.append('bannerImage', newBannerImage);
        }

        try {
            let response;
            if (currentBanner) {
                // Update existing banner
                response = await axios.put(`${API_BASE_URL}/api/admin/banners/${currentBanner._id}`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data' // Important for file uploads
                    }
                });
                alert('Banner updated successfully!');
            } else {
                // Create new banner
                response = await axios.post(`${API_BASE_URL}/api/admin/banners`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data' // Important for file uploads
                    }
                });
                alert('Banner created successfully!');
            }
            setIsModalOpen(false);
            setCurrentBanner(null);
            setNewBannerImage(null); // Clear file input
            fetchBanners(); // Re-fetch to update list
        } catch (err) {
            console.error("Error saving banner:", err.response?.data || err.message);
            alert(`Error saving banner: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleDelete = async (bannerId) => {
        if (!window.confirm("Are you sure you want to delete this banner?")) {
            return;
        }
        try {
            await axios.delete(`${API_BASE_URL}/api/admin/banners/${bannerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Banner deleted successfully!');
            fetchBanners(); // Re-fetch to update list
        } catch (err) {
            console.error("Error deleting banner:", err.response?.data || err.message);
            alert(`Error deleting banner: ${err.response?.data?.message || err.message}`);
        }
    };

    const openCreateModal = () => {
        setCurrentBanner(null);
        setNewBannerImage(null); // Clear image when opening for create
        setIsModalOpen(true);
    };

    const openEditModal = (banner) => {
        setCurrentBanner(banner);
        setNewBannerImage(null); // Clear image when opening for edit, user can choose new one
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-6 text-center">Loading banners...</div>;
    if (error) return <div className="p-6 text-red-500 text-center">{error}</div>;

    return (
        <div className="admin-banner-controller p-6 max-w-6xl mx-auto bg-white shadow-md rounded-lg mt-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">Admin - Banner Controller</h1>

            <button
                onClick={openCreateModal}
                className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
            >
                Add New Banner
            </button>

            {banners.length === 0 ? (
                <p className="text-gray-600 text-center">No banners found. Add one to get started!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banners.map((banner) => (
                        <div key={banner._id} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <img
                                src={banner.imageUrl ? `${API_BASE_URL}${banner.imageUrl}` : 'https://via.placeholder.com/576x320?text=No+Image'}
                                alt={banner.title}
                                className="w-full h-40 object-cover"
                            />
                            <div className="p-4">
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">{banner.title}</h3>
                                <p className="text-sm text-gray-600 mb-1">Link: <a href={banner.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">{banner.link}</a></p>
                                <p className="text-sm text-gray-600 mb-1">Order: {banner.order}</p>
                                <p className={`text-sm font-medium ${banner.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                    Status: {banner.isActive ? 'Active' : 'Inactive'}
                                </p>
                                <div className="flex space-x-2 mt-4">
                                    <button
                                        onClick={() => openEditModal(banner)}
                                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-200 flex-1"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(banner._id)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 flex-1"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for Add/Edit Banner */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">
                            {currentBanner ? 'Edit Banner' : 'Add New Banner'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    defaultValue={currentBanner?.title || ''}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="link" className="block text-sm font-medium text-gray-700">Link URL</label>
                                <input
                                    type="url"
                                    id="link"
                                    name="link"
                                    defaultValue={currentBanner?.link || ''}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="order" className="block text-sm font-medium text-gray-700">Order (lower number means earlier display)</label>
                                <input
                                    type="number"
                                    id="order"
                                    name="order"
                                    defaultValue={currentBanner?.order || 0}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    name="isActive"
                                    defaultChecked={currentBanner ? currentBanner.isActive : true}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-gray-700">Active</label>
                            </div>
                            <div>
                                <label htmlFor="bannerImage" className="block text-sm font-medium text-gray-700">Banner Image</label>
                                <input
                                    type="file"
                                    id="bannerImage"
                                    name="bannerImage"
                                    onChange={handleFileChange}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    accept="image/*"
                                    required={!currentBanner}
                                />
                                {currentBanner?.imageUrl && !newBannerImage && (
                                    <p className="text-xs text-gray-500 mt-1">Current image: <a href={`${API_BASE_URL}${currentBanner.imageUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">view</a> (Upload a new one to replace)</p>
                                )}
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    {currentBanner ? 'Update Banner' : 'Create Banner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBannerController;