import React, { useState, useMemo } from 'react';
import './InjectFomoForm.css'; // Custom styling for a more modern look


const CHAIN_OPTIONS = [
    { label: 'Solana', value: 'solana' }, // Only Solana
];

const DEX_OPTIONS = {
    'solana': ['Raydium', 'Orca', 'Jupiter', 'Other'], // Solana-specific DEXs
};


const USER_NET_PAYOUT_PER_100_VOLUME = 0.58;
const PLATFORM_PROFIT_PERCENTAGE = 0.39;

const GAS_COST_PER_LOOP = {
    'solana': 0.01,
};

const MIN_VOLUME_PER_LOOP = 20;

const speedMultipliers = {
    'Fast (1-2 hours)': 1.25,
    'Normal (3-6 hours)': 1.0,
    'Slow (7-12 hours)': 1.0,
    'Extended (12+ hours)': 1.0,
};

const InjectFomoForm = () => {

    const [campaignName, setCampaignName] = useState('');
    const [selectedChain] = useState(CHAIN_OPTIONS[0].value); // Fixed to Solana
    const [tokenAddress, setTokenAddress] = useState('');
    const [selectedDEX, setSelectedDEX] = useState(DEX_OPTIONS['solana'][0]);
    const [customDEXRouter, setCustomDEXRouter] = useState('');
    const [targetVolume, setTargetVolume] = useState(1000000);
    const [volumePerLoop, setVolumePerLoop] = useState(20);
    const [loopsPerUser, setLoopsPerUser] = useState(4);
    const [speed, setSpeed] = useState('Normal (3-6 hours)');
    const [notes, setNotes] = useState('');
    const [agreedToDisclaimers, setAgreedToDisclaimers] = useState(false);


    const numberOfLoops = useMemo(() => {
        if (targetVolume <= 0 || volumePerLoop <= 0) return 0;
        return Math.ceil(targetVolume / volumePerLoop);
    }, [targetVolume, volumePerLoop]);

    const gasCostPerLoopForCurrentChain = GAS_COST_PER_LOOP[selectedChain] || 0;

    const userGrossPayoutPerLoop = useMemo(() => {
        if (volumePerLoop === 0) return 0;
        const hundredDollarUnitsInLoop = volumePerLoop / 100;
        const netPayoutComponentPerLoop = USER_NET_PAYOUT_PER_100_VOLUME * hundredDollarUnitsInLoop;
        return netPayoutComponentPerLoop + gasCostPerLoopForCurrentChain;
    }, [volumePerLoop, gasCostPerLoopForCurrentChain]);

    const estimatedUserPayouts = useMemo(() => {
        return numberOfLoops * userGrossPayoutPerLoop;
    }, [numberOfLoops, userGrossPayoutPerLoop]);

    const baseCostBeforeSpeedAndProfit = useMemo(() => {
        return estimatedUserPayouts;
    }, [estimatedUserPayouts]);

    const totalEstimatedCost = useMemo(() => {
        let cost = baseCostBeforeSpeedAndProfit;
        cost *= speedMultipliers[speed] || 1;
        cost = cost / (1 - PLATFORM_PROFIT_PERCENTAGE);
        return cost.toFixed(2);
    }, [baseCostBeforeSpeedAndProfit, speed, PLATFORM_PROFIT_PERCENTAGE]);

    const estimatedPlatformProfit = useMemo(() => {
        const profit = totalEstimatedCost - (baseCostBeforeSpeedAndProfit * (speedMultipliers[speed] || 1));
        return profit.toFixed(2);
    }, [totalEstimatedCost, baseCostBeforeSpeedAndProfit, speed]);

    const usersNeeded = useMemo(() => {
        if (numberOfLoops === 0 || loopsPerUser <= 0) return 0;
        return Math.ceil(numberOfLoops / loopsPerUser);
    }, [numberOfLoops, loopsPerUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        

        if (!agreedToDisclaimers) {
            alert("Please read and agree to the disclaimers before submitting.");
            return;
        }


        const token = localStorage.getItem('jwtToken'); // Get the JWT token for authentication
        

        if (!token) {
            alert("You must be logged in to create a campaign.");
            console.error('Submission Aborted: No token found in localStorage.');
            return;
        }

        const requestData = {
            campaignName,
            selectedChain,
            tokenAddress,
            selectedDEX: selectedDEX === 'Other' ? customDEXRouter : selectedDEX,
            targetVolume: Number(targetVolume),
            volumePerLoop: Number(volumePerLoop),
            loopsPerUser: Number(loopsPerUser),
            speed,
            notes,
            estimatedTotalCost: Number(totalEstimatedCost),
            estimatedUserPayouts: Number(estimatedUserPayouts.toFixed(2)),
            estimatedPlatformProfit: Number(estimatedPlatformProfit),
            totalCampaignLoops: Number(numberOfLoops),
            usersNeeded: Number(usersNeeded),
        };

        

        const authHeaderValue = `Bearer ${token}`;
        

        try {
            
            const response = await fetch('https://atfomo-beta.onrender.com/api/boost-volume/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeaderValue
                },
                body: JSON.stringify(requestData),
            });

            
            

            const responseData = await response.json();
            

            if (!response.ok) {
                console.error('Failed to create campaign. Server responded with error:', responseData);
                alert(`Error creating campaign: ${responseData.message || 'Something went wrong.'}`);
                return;
            }

            
            alert(`Campaign "${campaignName}" created successfully! Campaign ID: ${responseData.campaignId}`);


            setCampaignName('');
            setTokenAddress('');
            setSelectedDEX(DEX_OPTIONS['solana'][0]);
            setCustomDEXRouter('');
            setTargetVolume(1000000);
            setVolumePerLoop(20);
            setLoopsPerUser(4);
            setSpeed('Normal (3-6 hours)');
            setNotes('');
            setAgreedToDisclaimers(false);

        } catch (error) {
            console.error('Network or other unexpected error during campaign creation:', error);
            alert(`Failed to send campaign request: ${error.message}`);
        }
        
    };

    return (
        <form className="volume-generation-form" onSubmit={handleSubmit}>
            <h2 className="form-title">🚀 Strategic Volume Initiative</h2>
            <p className="form-subtitle">Generate synthetic trading volume to boost market perception for your token.</p>

            <div className="form-section">
                <h3>Campaign Details</h3>
                <label className="form-label">
                    Campaign Name
                    <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="e.g., 'ProjectX Q3 Volume Boost'"
                        required
                        className="form-input"
                    />
                </label>
                <label className="form-label">
                    Blockchain Network
                    <input
                        type="text"
                        value="Solana"
                        readOnly
                        disabled
                        className="form-input disabled-input"
                    />
                    <span className="input-hint">Currently, only Solana is supported for volume generation.</span>
                </label>
                <label className="form-label">
                    Token Address (Your Token)
                    <input
                        type="text"
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                        placeholder="Your token's address on Solana (e.g., ABCxyz123...)"
                        required
                        className="form-input"
                    />
                </label>
                <label className="form-label">
                    DEX to Target
                    <select
                        value={selectedDEX}
                        onChange={(e) => setSelectedDEX(e.target.value)}
                        required
                        className="form-select"
                    >
                        {DEX_OPTIONS['solana']?.map((dex) => (
                            <option key={dex} value={dex}>
                                {dex}
                            </option>
                        ))}
                    </select>
                </label>
                {selectedDEX === 'Other' && (
                    <label className="form-label">
                        Custom DEX Router/Pair Address
                        <input
                            type="text"
                            value={customDEXRouter}
                            onChange={(e) => setCustomDEXRouter(e.target.value)}
                            placeholder="Address of the custom DEX pool or router"
                            required
                            className="form-input"
                        />
                    </label>
                )}
            </div>

            <div className="form-section">
                <h3>Volume Strategy</h3>
                <label className="form-label">
                    Target Volume ($USD)
                    <input
                        type="number"
                        value={targetVolume}
                        onChange={(e) => setTargetVolume(Math.max(100, parseInt(e.target.value) || 0))}
                        min="100"
                        step="1000"
                        required
                        className="form-input"
                    />
                    <span className="input-hint">The total USD trading volume you wish to generate.</span>
                </label>

                <label className="form-label">
                    Volume per Buy/Sell Loop ($USD)
                    <input
                        type="number"
                        value={volumePerLoop}
                        onChange={(e) => setVolumePerLoop(Math.max(MIN_VOLUME_PER_LOOP, parseInt(e.target.value) || 0))}
                        min={MIN_VOLUME_PER_LOOP}
                        step="1"
                        required
                        className="form-input"
                    />
                    <span className="input-hint">Each loop consists of a BUY and a SELL. Example: $10 Buy + $10 Sell = $20 volume. Minimum ${MIN_VOLUME_PER_LOOP}.</span>
                </label>

                <label className="form-label">
                    Max Loops Per User
                    <input
                        type="number"
                        value={loopsPerUser}
                        onChange={(e) => setLoopsPerUser(Math.max(1, Math.min(4, parseInt(e.target.value) || 0)))}
                        min="1"
                        max="4"
                        required
                        className="form-input"
                    />
                    <span className="input-hint">Limits how many buy/sell loops each individual user performs. Recommended: 2-4.</span>
                </label>

                <label className="form-label">
                    Execution Speed
                    <select
                        value={speed}
                        onChange={(e) => setSpeed(e.target.value)}
                        className="form-select"
                    >
                        {Object.keys(speedMultipliers).map((label) => (
                            <option key={label} value={label}>
                                {label} {speedMultipliers[label] !== 1.0 ? `(${speedMultipliers[label]}x cost)` : '(1x cost)'}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <label className="form-label">
                Notes (optional)
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific instructions or preferences for this campaign? (e.g., target specific trading times)"
                    className="form-textarea"
                    rows="3"
                />
            </label>

            <div className="summary-box">
                <h3>Order Summary</h3>
                <p>Total Buy/Sell Loops: <strong>{numberOfLoops.toLocaleString()}</strong></p>
                <p className="total-cost">
                    Estimated Total Cost: <strong>${totalEstimatedCost}</strong>
                </p>
            </div>

            <div className="disclaimers">
                <h3>Important Disclaimers:</h3>
                <ul>
                    <li>This service generates **synthetic trading volume** and **does not guarantee organic trending** or specific price action.</li>
                    <li>Projects are strongly advised to **allocate extra tokens** in their liquidity pool to account for potential slippage during trading operations.</li>
                    <li>Users will receive clear instructions to use **real, active wallets**, but we cannot guarantee that every wallet will be immune to potential blacklisting by external platforms or protocols.</li>
                    <li>All transactions will be on the **Solana blockchain** and verifiable using the provided token and DEX addresses.</li>
                    <li>Extreme market volatility or unforeseen network conditions during the campaign may impact the final outcome.</li>
                </ul>
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={agreedToDisclaimers}
                        onChange={(e) => setAgreedToDisclaimers(e.target.checked)}
                        required
                    />
                    I have read and agree to the above disclaimers.
                </label>
            </div>

            <button type="submit" className="submit-button" disabled={!agreedToDisclaimers}>
                Submit Strategic Volume Initiative
            </button>
        </form>
    );
};

export default InjectFomoForm;