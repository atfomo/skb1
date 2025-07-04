
import React, { useState, useEffect } from 'react';
import TaskCard from '../../components/TaskCard/TaskCard';
import './AvailableTasksPage.css';

const AvailableTasksPage = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTasks = async () => {
            setLoading(true);
            setError(null); // Clear previous errors



            const token = localStorage.getItem('jwtToken');

            if (!token) {
                setError('User not authenticated. Please log in to see tasks.');
                setLoading(false);
                return;
            }

            try {

                const response = await fetch('https://atfomo-beta.onrender.com/api/boost-volume/active', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // Send the JWT token
                    },
                });

                if (!response.ok) {

                    if (response.status === 401) {
                        throw new Error('Unauthorized: Your session has expired. Please log in again.');
                    }
                    throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                setTasks(data);

            } catch (err) {
                setError(err.message);
                console.error("Error fetching available tasks:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, []); // Empty dependency array means this runs once on component mount

    if (loading) {
        return <div className="available-tasks-container loading-message">Loading available tasks...</div>;
    }

    if (error) {
        return <div className="available-tasks-container error-message">Error: {error}</div>;
    }

    return (
        <div className="available-tasks-container">
            <h2 className="page-title">Find Your Next Task!</h2>
            <p className="page-subtitle">Choose from the available campaigns below to start earning rewards.</p>

            {tasks.length === 0 ? (
                <div className="no-tasks-message">
                    <p>No tasks are available at the moment. Please check back later!</p>
                </div>
            ) : (
                <div className="tasks-grid">
                    {tasks.map(task => (

                        <TaskCard key={task._id} campaign={task} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AvailableTasksPage;