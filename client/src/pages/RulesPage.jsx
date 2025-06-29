import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios'; // If rules are fetched from an API
import '../pages/RulesPage.css'; // Create this CSS file for styling
import { API_BASE_URL } from '../config';

// const API_BASE_URL = "http://localhost:5000"; // Assuming your API base URL

const RulesPage = ({ projects }) => {
    const { campaignId } = useParams();
    const [rulesContent, setRulesContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRules = async () => {
            setLoading(true);
            setError('');
            try {
                // Option 1: Fetch rules from your initialProjects array (client-side)
                const project = projects.find(p => p.id.toString() === campaignId);
                if (project && project.rules) {
                    setRulesContent(project.rules);
                } else if (project) {
                    setRulesContent('No specific rules provided for this campaign.');
                } else {
                    // Option 2: If rules are stored in the backend and need fetching
                    // This assumes you have an API endpoint like /api/projects/:campaignId/rules
                    // const res = await axios.get(`${API_BASE_URL}/api/projects/${campaignId}/rules`);
                    // setRulesContent(res.data.rules);
                    setRulesContent('Campaign not found or rules not available.');
                }
            } catch (err) {
                console.error('Error fetching rules:', err);
                setError('Failed to load rules. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        if (campaignId && projects) { // Ensure campaignId and projects are available
            fetchRules();
        } else if (!campaignId) {
            setLoading(false);
            setError('No campaign ID provided.');
        }
    }, [campaignId, projects]); // Re-run when campaignId or projects change

    if (loading) {
        return <div className="rules-container">Loading rules...</div>;
    }

    if (error) {
        return <div className="rules-container error-message">{error}</div>;
    }

    return (
        <div className="rules-container">
            <h2>Rules for Campaign {campaignId}</h2>
            <div className="rules-content">
                {rulesContent ? (
                    // Render rules. Consider using dangerouslySetInnerHTML if rules are HTML,
                    // but be extremely careful about XSS attacks. For plain text, just display.
                    <p>{rulesContent}</p>
                ) : (
                    <p>No specific rules found for this campaign.</p>
                )}
            </div>
            <Link to={`/campaign/${campaignId}`} className="back-link">Back to Campaign Details</Link>
        </div>
    );
};

export default RulesPage;