import React, { useState, useEffect, useRef } from "react";
import './BannerScroller.css';

const BannerScroller = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const scrollContainerRef = useRef(null); // This ref will now point to .banner-scroller-inner

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch('https://api.atfomo.com/api/public/banners');

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Backend responded with:", errorText);
                    throw new Error(`HTTP error! Status: ${response.status}. Response: ${errorText.substring(0, 100)}...`);
                }
                const data = await response.json();
                setBanners(data);
            } catch (err) {
                console.error("Failed to fetch banners:", err);
                setError(`Failed to load banners. Error: ${err.message}. Please check console for details.`);
            } finally {
                setLoading(false);
            }
        };

        fetchBanners();
    }, []);



    const infiniteBanners = banners.length > 0 ? [...banners, ...banners] : [];



    const animationDuration = banners.length > 0 ? (banners.length * 10) : 30; // 10s per banner as a base speed



    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.setProperty('--animation-duration', `${animationDuration}s`);

            scrollContainerRef.current.style.setProperty('--banner-count', banners.length);
        }
    }, [banners, animationDuration]);


    if (loading) {
        return (
            <section className="banner-scroller-section loading-state">
                <p>Loading banners...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="banner-scroller-section error-state">
                <p className="error-message">{error}</p>
            </section>
        );
    }

    if (banners.length === 0) {
        return (
            <section className="banner-scroller-section no-banners">
                <p>No banners available at the moment.</p>
            </section>
        );
    }

    return (
        <section className="banner-scroller-section">
            <div className="banner-scroller-wrapper">
                {}
                <div
                    ref={scrollContainerRef} // Ref moves to the animated element
                    className="banner-scroller-inner"
                    style={{ animationDuration: `${animationDuration}s` }} // Apply dynamic duration directly
                >
                    {}
                    <div className="banner-items-container">
                        {infiniteBanners.map((banner, index) => (
                            <a
                                key={`${banner._id}-${index}`} // Using _id is more reliable, combine with index for duplicates
                                href={banner.link}
                                className="banner-item-link"
                                target="_blank" // Open links in a new tab
                                rel="noopener noreferrer" // Security best practice
                            >
                                <div className="banner-card">
                                    <img
                                        src={banner.imageUrl}
                                        alt={banner.title}
                                        className="banner-card-image"
                                    />
                                    <div className="banner-content-overlay">
                                        <h3 className="banner-title">
                                            {banner.title}
                                        </h3>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BannerScroller;