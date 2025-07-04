
import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useUser } from '../UserContext'; // To get the admin's token
import { API_BASE_URL } from '../config'; // Assuming you have a config file for your backend URL

function AdminTaskVerificationPage() {
    const [tasksToVerify, setTasksToVerify] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useUser(); // Get the admin's token from UserContext


    

    const fetchTasksForVerification = async () => {

        const url = `${API_BASE_URL}/api/admin/tasks-for-verification`;
        
        

        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTasksToVerify(response.data.tasks);
        } catch (err) {

            console.error('AdminTaskVerificationPage: Failed to fetch tasks for verification:', err.response?.data || err.message);
            setError('Failed to fetch tasks for verification. Please check console.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) { // Only fetch if admin token is available

            fetchTasksForVerification();
        } else {
            console.warn('AdminTaskVerificationPage: No token found. Admin tasks cannot be fetched.'); // --- LOG 6: No token warning ---
            setLoading(false); // Stop loading if no token
            setError('Authentication required. Please log in as an administrator.');
        }
    }, [token]);

    const handleVerifyTask = async (taskId, userId) => {
        if (!window.confirm(`Are you sure you want to approve task ${taskId} for user ${userId}? This will reward earnings.`)) {
            return;
        }


        const verifyUrl = `${API_BASE_URL}/api/admin/${taskId}/mark-task-fully-complete`;
        const payload = { userId: userId };
        
        
        


        try {
            const response = await axios.post(
                verifyUrl,
                payload, // Send the user ID whose task is being approved
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.message) {
                alert(response.data.message);

                fetchTasksForVerification();
            }
        } catch (err) {

            console.error('AdminTaskVerificationPage: Error verifying task:', err.response?.data || err.message);
            alert(`Error verifying task: ${err.response?.data?.message || err.message}`);
        }
    };

    if (loading) return <div className="p-6 text-center">Loading tasks for verification...</div>;
    if (error) return <div className="p-6 text-red-500 text-center">{error}</div>;

    return (
        <div className="admin-dashboard p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin - Tasks for Verification</h1>

            {tasksToVerify.length === 0 ? (
                <p className="text-gray-600">No tasks currently awaiting verification.</p>
            ) : (
                <div className="space-y-6">
                    {tasksToVerify.map(task => (
                        <div key={task._id} className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">Task ID: {task._id}</h2>
                            <p className="text-gray-600 mb-2">Tweet Link: <a href={task.tweetLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{task.tweetLink}</a></p>
                            <p className="text-gray-600 mb-4">Potential Earning: ${task.earningAmount / 100000} (assuming 100,000 units = $0.069)</p>

                            <h3 className="text-lg font-medium text-gray-700 mb-3">Pending User Submissions:</h3>
                            {task.completedBy.map(entry => (
                                <div key={entry._id} className="bg-gray-50 p-3 rounded-md mb-2 border border-gray-100">
                                    <p className="text-gray-700 font-semibold">User ID: {entry.userId}</p>
                                    <p className="text-sm text-gray-600">Actions Completed:
                                        {entry.isLiked && ' 👍 Like '}
                                        {entry.isRetweeted && ' 🔄 Retweet '}
                                        {entry.isCommented && ' 💬 Comment '}
                                    </p>
                                    <button
                                        onClick={() => handleVerifyTask(task._id, entry.userId)}
                                        className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                                    >
                                        Verify & Approve for this User
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AdminTaskVerificationPage;