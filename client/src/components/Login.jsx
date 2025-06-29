import React, { useState, useEffect } from 'react'; // Added useEffect for consistency, though not strictly used here
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../UserContext';
import { useDialog } from '../context/DialogContext';
import '../pages/AuthForms.css'; // Assuming this CSS file now contains shared styles
import { jwtDecode } from 'jwt-decode'; // Keep if you still need to decode for any pre-login checks
import { API_BASE_URL } from '../config';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); // Keep local error state for immediate form feedback
    const navigate = useNavigate();
    const { login } = useUser();
    const { showAlertDialog } = useDialog();

    // The handleSubmit logic remains largely the same
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors

        try {
            console.log('Login.jsx: Attempting to send login request...');
            const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });

            console.log('Login.jsx: Login request successful. Response data:', res.data);
            const { token } = res.data;

            if (!token) {
                console.error('Login.jsx: No token received in login response!');
                showAlertDialog('Login Error', 'Authentication token not provided by server. Please try again.');
                return;
            }

            // You no longer need to decode JWT here if UserContext fetches full user data
            // But keeping it for sanity check / initial user data for context's `login` if it needs it.
            const decoded = jwtDecode(token);
            console.log('Login.jsx: Decoded JWT (from Login component):', decoded);

            // Call the UserContext login function
            console.log('Login.jsx: Calling UserContext login with token...');
            await login(token); // Pass only the token, UserContext fetches full user data

            // Navigate *before* showing the dialog (or remove dialog for success if context handles it)
            navigate('/'); // Redirect to home immediately

            // Optional: If you still want a success dialog, it will now appear on the HomePage
            // This might be disruptive or redundant if HomePage itself indicates login status.
            // Consider if you really need this dialog here.
            showAlertDialog('Success!', 'Login successful!');

        } catch (err) {
            console.error('Login.jsx: Login error:', err.response?.data || err.message);
            const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
            showAlertDialog('Login Failed', errorMessage);
        }
    };

    return (
        <div className="register-page-wrapper"> {/* Reusing the wrapper for consistent background/layout */}
            {/* Animated background elements (from Register page CSS) */}
            <div className="animated-background-sphere sphere-1"></div>
            <div className="animated-background-sphere sphere-2"></div>
            <div className="animated-background-sphere sphere-3"></div>

            <div className="graphic-left">
                {/* Reusing the graphic elements for consistency */}
                <div className="graphic-shape shape-1"></div>
                <div className="graphic-shape shape-2"></div>
                <div className="graphic-shape shape-3"></div>
                <div className="graphic-text">
                    <h1>Welcome Back.</h1> {/* Adjusted heading for Login */}
                    <p>Log in to access your dashboard.</p> {/* Adjusted subheading */}
                </div>
            </div>

            <div className="register-form-container"> {/* Reusing the form container for styling */}
                <form onSubmit={handleSubmit} className="auth-form glassmorphism-card">
                    <h2 className="form-title">Login</h2>
                    {/* You can keep this local error message for immediate validation feedback if preferred,
                        or rely solely on the global dialog for all errors. */}
                    {error && <p className="error-message">{error}</p>}
                    <div className="form-group">
                        <label htmlFor="email">Email</label> {/* Simplified label, remove colon */}
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="your@email.com" 
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label> {/* Simplified label, remove colon */}
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password" 
                        />
                    </div>
                    <button type="submit" className="auth-submit-button">Login to Account</button> {/* Adjusted button text */}
                    <p className="auth-link-text">
                        Don't have an account? <Link to="/register">Register here</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;