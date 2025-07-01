
import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Or axiosInstance, if consistent. See note below.
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../UserContext';
import { useDialog } from '../context/DialogContext'; // Correct path
import '../pages/AuthForms.css';
import { API_BASE_URL } from '../config';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const { login } = useUser();
    const { showAlertDialog } = useDialog();


    useEffect(() => {

    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            showAlertDialog('Error', 'Passwords do not match.');
            return;
        }

        try {



            const res = await axios.post(`${API_BASE_URL}/auth/register`, { username, email, password });
            const { token, user } = res.data;


            await login(token, user);


            navigate('/');







        } catch (err) {
            console.error('Registration error:', err.response?.data || err.message);
            const errorMessage = err.response?.data?.message || 'Registration failed.';
            showAlertDialog('Registration Failed', errorMessage); // Use dialog for errors
        }
    };

    return (
        <div className="register-page-wrapper">
            {}
            <div className="animated-background-sphere sphere-1"></div>
            <div className="animated-background-sphere sphere-2"></div>
            <div className="animated-background-sphere sphere-3"></div>

            <div className="graphic-left">
                <div className="graphic-shape shape-1"></div>
                <div className="graphic-shape shape-2"></div>
                <div className="graphic-shape shape-3"></div>
                <div className="graphic-text">
                    <h1>Join the Future.</h1>
                    <p>Unlock direct earnings & supercharge Web3 engagement!</p>
                </div>
            </div>

            <div className="register-form-container">
                <form onSubmit={handleSubmit} className="auth-form glassmorphism-card">
                    <h2 className="form-title">Register</h2>
                    {error && <p className="error-message">{error}</p>}
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Choose a unique username"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
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
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter a strong password"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm your password"
                        />
                    </div>
                    <button type="submit" className="auth-submit-button">Register Account</button>
                    <p className="auth-link-text">
                        Already have an account? <Link to="/login">Login here</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;