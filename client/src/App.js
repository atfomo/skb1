
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useUser } from "./UserContext";
import { DialogProvider } from './context/DialogContext';


import RulesModal from "./components/RulesModal"; // Ensure this path is correct


import HomePage from "./pages/HomePage/HomePage";
import Header from "./components/Navbar/Header";
import Login from "./components/Login";
import Register from "./components/Register";
import ProjectDetail from "./components/ProjectDetail";
import AddProjectForm from "./components/AddProjectForm/AddProjectForm";
import Dashboard from "./components/Dashboard/Dashboard";
import CreatorDashboard from "./components/CreatorDashboard/CreatorDashboard";
import AddSparkCampaignForm from "./components/AddSparkCampaignForm/AddSparkCampaignForm";
import CreateDashboard from './pages/CreateDashboard/CreateDashboard';
import { UserProvider } from './UserContext';
import InjectFomoForm from './components/InjectFomoForm/InjectFomoForm';
import AvailableTasksPage from './components/AvailableTasksPage/AvailableTasksPage';
import UserVolumeTask from './components/UserVolumeTask/UserVolumeTask';
import FOMOCampaignsPage from './pages/FOMOCampaignsPage/FOMOCampaignsPage';
import CreateFireDrip from './pages/CreateFireDrip/CreateFireDrip';
import ImageUploader from './components/ImageUploader';
import AdminBoostVolumeCampaignList from './components/Admin/AdminBoostVolumeCampaignList';
import AdminBoostVolumeCampaignDetail from './components/Admin/AdminBoostVolumeCampaignDetail';
import AdminTaskVerificationPage from './pages/AdminTaskVerificationPage';
import AdminBannerController from './components/Admin/AdminBannerController';
import AdminPaymentReviewPage from './pages/AdminPaymentReviewPage';
import SparkCampaignDetail from './components/SparkCampaignDetail/SparkCampaignDetail';


const AdminRoute = ({ children }) => {
    const { user, loadingUser, isAuthenticated } = useUser();

    if (loadingUser) {
        return <div>Loading user data...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user && user.role === 'admin') {
        return children;
    } else {
        return <Navigate to="/" replace />;
    }
};


const PrivateRoute = ({ children }) => {
    const { user, loadingUser, isAuthenticated } = useUser();
    const [userHasAcknowledgedRules, setUserHasAcknowledgedRules] = useState(
        localStorage.getItem('fomo_rules_acknowledged') === 'true' // Load from local storage
    );

    useEffect(() => {

        if (isAuthenticated) {


            setUserHasAcknowledgedRules(
                localStorage.getItem('fomo_rules_acknowledged') === 'true'
            );
        } else {

            setUserHasAcknowledgedRules(false);
            localStorage.removeItem('fomo_rules_acknowledged');
        }
    }, [isAuthenticated]);


    if (loadingUser) {
        return <div>Loading user data...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!userHasAcknowledgedRules) {



        return <Navigate to="/acknowledge-rules" replace />;
    }

    return children;
};


const initialProjects = [
    {
        id: 1, name: "Account 001", logo: "https://via.placeholder.com/48?text=A1", tags: ["Web3", "Crypto", "Marketing"], activeTasks: 12, totalTasks: 50, estimatedEarnings: 15000, remainingSlots: 50, isNew: true, image: 'https://via.placeholder.com/600x400/F0F0F0/000000?text=Project+One', socials: { twitter: "", telegram: "" }, description: "", rules: "", creatorType: "Video Creator", uniqueId: "B1kQZT",
    },
    {
        id: 2, name: "Account 002", logo: "https://via.placeholder.com/48?text=A2", tags: ["Jobs", "Blockchain"], activeTasks: 32, totalTasks: 100, estimatedEarnings: 25000, remainingSlots: 20, isNew: false, image: 'https://via.placeholder.com/600x400/E0E0E0/000000?text=Project+Two', socials: { twitter: "", telegram: "" }, description: "", rules: "", creatorType: "Market Creator", uniqueId: "C4yS3V",
    },
    {
        id: 3, name: "Account 003", logo: "https://via.placeholder.com/48?text=A3", tags: ["Ecommerce", "Dropshipping"], activeTasks: 15, totalTasks: 100, estimatedEarnings: 56500, remainingSlots: 5, isNew: true, image: 'https://via.placeholder.com/600x400/F5F5F5/000000?text=Project+Three', socials: { twitter: "", telegram: "" }, description: "", rules: "", creatorType: "Token Creator", uniqueId: "Itey9B",
    },
    {
        id: 4, name: "Account 004", logo: "https://via.placeholder.com/48?text=A4", tags: ["AI", "Analytics"], activeTasks: 68, totalTasks: 100, estimatedEarnings: 96200, remainingSlots: 10, isNew: false, image: 'https://via.placeholder.com/600x400/E5E5E5/000000?text=Project+Four', socials: { twitter: "", telegram: "" }, description: "", rules: "", creatorType: "Video Creator", uniqueId: "P8tF7t",
    },
    {
        id: 5, name: "Account 005", logo: "https://via.placeholder.com/48?text=A5", tags: ["Gaming", "NFT"], activeTasks: 85, totalTasks: 100, estimatedEarnings: 56000, remainingSlots: 15, isNew: false, image: 'https://via.placeholder.com/600x400/F0F0F0/000000?text=Project+Five', socials: { twitter: "", telegram: "" }, description: "", rules: "", creatorType: "Video Creator", uniqueId: "S2oHlL",
    },
    {
        id: 6, name: "Account 006", logo: "https://via.placeholder.com/48?text=A6", tags: ["DeFi", "Lending"], activeTasks: 12, totalTasks: 100, estimatedEarnings: 12000, remainingSlots: 25, isNew: true, image: 'https://via.placeholder.com/600x400/E0E0E0/000000?text=Project+Six', socials: { twitter: "", telegram: "" }, description: "", rules: "", creatorType: "Token Creator", uniqueId: "K3gA2D",
    },
    {
        id: 7, name: "Account 007", logo: "https://via.placeholder.com/48?text=A7", tags: ["SocialFi", "Creator Economy"], activeTasks: 21, totalTasks: 100, estimatedEarnings: 9000, remainingSlots: 30, isNew: false, image: 'https://via.placeholder.com/600x400/F5F5F5/000000?text=Project+Seven', socials: { twitter: "", telegram: "" }, description: "", rules: "", creatorType: "Token Creator", uniqueId: "U4qK3N",
    },
    {
        id: 8, name: "Account 008", logo: "https://via.placeholder.com/48?text=A8", tags: ["Web3", "Community"], activeTasks: 4, totalTasks: 100, estimatedEarnings: 4000, remainingSlots: 10, isNew: true, image: 'https://via.placeholder.com/600x400/E5E5E5/000000?text=Project+Eight', socials: { twitter: "", telegram: "" }, description: "", rules: "", creatorType: "Video Creator", uniqueId: "L4hB3E",
    },
];

function App() {
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
    const [uploadedImagePublicId, setUploadedImagePublicId] = useState(null);

    const handleImageUpload = ({ url, publicId }) => {
        setUploadedImageUrl(url);
        setUploadedImagePublicId(publicId);
        
        
    };

    const [projects, setProjects] = useState(initialProjects);
    const { token, user, logout, loadingUser, isAuthenticated } = useUser(); // Destructure isAuthenticated from useUser


    const [showRulesModal, setShowRulesModal] = useState(false);
    const [userHasAcknowledgedRules, setUserHasAcknowledgedRules] = useState(

        localStorage.getItem('fomo_rules_acknowledged') === 'true'
    );

    const addProject = (project) => {
        setProjects((prev) => [...prev, { ...project, id: prev.length + 1 }]);
    };


    useEffect(() => {
        if (isAuthenticated && !loadingUser) {

            const acknowledged = localStorage.getItem('fomo_rules_acknowledged') === 'true';
            setUserHasAcknowledgedRules(acknowledged);

            if (!acknowledged) {
                setShowRulesModal(true); // Force show the rules modal
            }
        } else if (!isAuthenticated && userHasAcknowledgedRules) {

            setUserHasAcknowledgedRules(false);
            localStorage.removeItem('fomo_rules_acknowledged');
        }
    }, [isAuthenticated, loadingUser]); // Re-run when authentication status or loading changes

    const handleAcknowledgeRules = () => {
        setUserHasAcknowledgedRules(true);
        localStorage.setItem('fomo_rules_acknowledged', 'true'); // Persist acknowledgment
        setShowRulesModal(false); // Close the modal
    };


    const handleCloseRulesModal = () => {

        setShowRulesModal(false);
    };

    return (
        <DialogProvider>
            <Router>
                <div className="bg-white min-h-screen text-gray-900">
                    <Header user={user} logout={logout} loadingUser={loadingUser} />
                    <Routes>
                        <Route path="/" element={<HomePage projects={projects} />} />
                     {}

                        {}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {}
                        {isAuthenticated && !userHasAcknowledgedRules && (
                            <Route
                                path="/acknowledge-rules"
                                element={
                                    <div style={{ padding: '20px', textAlign: 'center' }}>
                                        <h2>Please Review and Accept Our Rules</h2>
                                        <p>You must read and agree to the platform rules before accessing your dashboard or tasks.</p>
                                        {}
                                    </div>
                                }
                            />
                        )}


                        {}
                        <Route
                            path="/create-campaign"
                            element={<PrivateRoute><AddProjectForm /></PrivateRoute>}
                        />
                        <Route
                            path="/create-dashboard"
                            element={<PrivateRoute><CreateDashboard /></PrivateRoute>}
                        />
                        <Route
                            path="/dashboard"
                            element={<PrivateRoute><Dashboard /></PrivateRoute>}
                        />
                        <Route
                            path="/creator-dashboard"
                            element={<PrivateRoute><CreatorDashboard user={user} /></PrivateRoute>}
                        />
                    {/*    <Route
                            path="/inject-fomo"
                            element={<PrivateRoute><InjectFomoForm /></PrivateRoute>}
                        /> */}
                    {/*    <Route
                            path="/boostvolume"
                            element={<PrivateRoute><AvailableTasksPage /></PrivateRoute>}
                        /> */}
                    {/*    <Route
                            path="/boostvolume/:campaignId"
                            element={<PrivateRoute><UserVolumeTask /></PrivateRoute>}
                        /> */}
                        <Route
                            path="/fomo-campaigns"
                            element={<PrivateRoute><FOMOCampaignsPage /></PrivateRoute>}
                        />
                        <Route
                            path="/create-fire-drip"
                            element={<PrivateRoute><CreateFireDrip /></PrivateRoute>}
                        />
                        <Route
                            path="/create-spark-campaign"
                            element={<PrivateRoute><AddSparkCampaignForm /></PrivateRoute>}
                        />
                        <Route
                            path="/spark-campaign/:campaignId"
                            element={<PrivateRoute><SparkCampaignDetail /></PrivateRoute>}
                        />

                        {}
                        <Route
                            path="/admin/boost-volume/campaigns"
                            element={<AdminRoute><AdminBoostVolumeCampaignList /></AdminRoute>}
                        />
                        <Route
                            path="/admin/boost-volume/campaigns/:campaignId"
                            element={<AdminRoute><AdminBoostVolumeCampaignDetail /></AdminRoute>}
                        />
                        <Route
                            path="/admin/task-verification"
                            element={<AdminRoute><AdminTaskVerificationPage /></AdminRoute>}
                        />
                        <Route
                            path="/admin/banner-controller"
                            element={<AdminRoute><AdminBannerController /></AdminRoute>}
                        />
                        <Route
                            path="/admin/payment-review"
                            element={<AdminRoute><AdminPaymentReviewPage /></AdminRoute>}
                        />

                        {}
                        <Route path="*" element={<div>404 Not Found</div>} />
                    </Routes>
                    <footer className="bg-gray-100 text-gray-700 text-center py-6 mt-12 border-t border-gray-200">
                        <p>&copy; {new Date().getFullYear()} @FOMO. All rights reserved.</p>
                    </footer>

                    {}
                    {isAuthenticated && ( // Only show if a user is logged in
                        <RulesModal
                            show={showRulesModal}
                            onClose={handleCloseRulesModal} // This will only allow closing if isMandatory is false
                            onAcknowledge={handleAcknowledgeRules}
                            isMandatory={!userHasAcknowledgedRules} // Force acknowledgment if not yet done
                        />
                    )}
                </div>
            </Router>
        </DialogProvider>
    );
}

export default App;