
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import './AddProjectForm.css'; // Import standard CSS file


const PLATFORM_FEE_PERCENTAGE = 15;
const BASE_TASK_RATES = {
  like: 0.03,
  retweet: 0.05,
  comment: 0.10,
  joinDiscord: 0.15,
  joinTelegram: 0.15,
  followX: 0.05,
};
const CUSTOM_TASK_MIN_RATE = 0.20;


const AddProjectForm = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    projectName: "",
    budget: "",
    numberOfUsers: 1000,
    enabledTasks: {
      like: { enabled: true, links: [""], instances: 0 },
      retweet: { enabled: true, links: [""], instances: 0 },
      comment: { enabled: true, links: [""], instances: 0 },
      joinDiscord: { enabled: false, links: [""], instances: 0 },
      joinTelegram: { enabled: false, links: [""], instances: 0 },
      followX: { enabled: false, links: [""], instances: 0 },
    },
    customTasks: [],
    rules: "",
  });

  const [bannerImage, setBannerImage] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerImageBase64, setBannerImageBase64] = useState(null);

  const [taskAllocations, setTaskAllocations] = useState({});
  const [errors, setErrors] = useState({});

  const getEarningTag = useCallback(() => {
    if (!formData.budget || !formData.numberOfUsers) return null;
    const budget = parseFloat(formData.budget);
    const users = parseInt(formData.numberOfUsers);

    if (isNaN(budget) || isNaN(users) || budget <= 0 || users <= 0) return null;

    if (users <= budget * 1) return "High Earning";
    if (users <= budget * 3) return "Medium Earning";
    if (users <= budget * 5) return "Low Earning";
    return null;
  }, [formData.budget, formData.numberOfUsers]);

  const totalPlatformFee = formData.budget ? (parseFloat(formData.budget) * PLATFORM_FEE_PERCENTAGE) / 100 : 0;
  const netBudget = formData.budget ? parseFloat(formData.budget) - totalPlatformFee : 0;

  const getCampaignSummary = useCallback(() => {
    const activeTasks = Object.entries(formData.enabledTasks)
      .filter(([, taskData]) => taskData.enabled && taskData.links.filter(link => link.trim() !== "").length > 0) // Changed to check links.length
      .map(([key, taskData]) => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(), // Formatted name
        instances: taskData.links.filter(link => link.trim() !== "").length, // Count valid links as instances
        baseRate: BASE_TASK_RATES[key] || 0,
        allocation: taskAllocations[key] || 0,
      }))
      .concat(
        formData.customTasks
          .filter((task) => task.rate >= CUSTOM_TASK_MIN_RATE && task.name.trim() !== "") // Ensure custom task has a name
          .map((task) => ({
            key: task.id,
            name: task.name,
            instances: 1, // Custom tasks are 1 instance per task entry
            baseRate: task.rate,
            allocation: taskAllocations[task.id] || 0,
          }))
      );

    let totalHypotheticalCost = 0;
    activeTasks.forEach((task) => {

      const allocatedUsers = (task.allocation / 100) * formData.numberOfUsers;
      totalHypotheticalCost += (task.baseRate * task.instances * allocatedUsers);
    });

    let totalEngagements = 0;
    const taskDetails = {};

    activeTasks.forEach(task => {
        const allocatedUsersForTask = (task.allocation / 100) * formData.numberOfUsers;
        const totalInstancesForTaskType = task.instances * allocatedUsersForTask; // Total engagements for this task type

        taskDetails[task.key] = {
            name: task.name || task.key,
            instancesPerUser: task.instances, // This now means links per user for standard tasks
            usersAllocated: Math.round(allocatedUsersForTask), // Number of users estimated to do this task
            totalEngagements: Math.round(totalInstancesForTaskType), // Total individual engagements
        };
        totalEngagements += totalInstancesForTaskType;
    });

    return {
      activeTasks,
      totalHypotheticalCost,
      totalEngagements,
      taskDetails
    };
  }, [formData.enabledTasks, formData.customTasks, formData.numberOfUsers, netBudget, taskAllocations]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    if (name === "budget" || name === "numberOfUsers") {
      val = value === "" ? "" : parseInt(value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleBannerImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {

      if (file.size > 2 * 1024 * 1024) {
        setErrors((prevErrors) => ({ ...prevErrors, bannerImage: "Image file size exceeds 2MB." }));
        setBannerImage(null);
        setBannerPreview(null);
        setBannerImageBase64(null);
        return;
      }

      setBannerImage(file);
      setBannerPreview(URL.createObjectURL(file));

      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImageBase64(reader.result);
        setErrors((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors.bannerImage;
            return newErrors;
        });
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setBannerImageBase64(null);
        setErrors((prevErrors) => ({ ...prevErrors, bannerImage: "Failed to read image file." }));
      };
      reader.readAsDataURL(file);
    } else {
      setBannerImage(null);
      setBannerPreview(null);
      setBannerImageBase64(null);
      setErrors((prevErrors) => ({ ...prevErrors, bannerImage: "Please upload a banner image for your campaign." }));
    }
  };


  const handleEnableTaskChange = (taskKey, isEnabled) => {
    setFormData((prev) => {
      const updatedEnabledTasks = {
        ...prev.enabledTasks,
        [taskKey]: { ...prev.enabledTasks[taskKey], enabled: isEnabled },
      };

      const newAllocations = { ...taskAllocations };
      if (!isEnabled) {
        delete newAllocations[taskKey];
        const removedPercentage = taskAllocations[taskKey] || 0;
        const remainingKeys = Object.keys(newAllocations);
        if (remainingKeys.length > 0 && removedPercentage > 0) {
          const sumOfRemaining = Object.values(newAllocations).reduce((sum, val) => sum + val, 0);
          const scale = (sumOfRemaining + removedPercentage) / sumOfRemaining;
          remainingKeys.forEach(key => {
            newAllocations[key] = parseFloat((newAllocations[key] * scale).toFixed(1));
          });
        } else if (remainingKeys.length === 1) {
          newAllocations[remainingKeys[0]] = 100;
        }
      }

      setTaskAllocations(newAllocations); // Update allocations immediately
      return {
        ...prev,
        enabledTasks: updatedEnabledTasks,
      };
    });
  };

  const handleLinkChange = (taskKey, index, value) => {
    setFormData((prev) => {
      const updatedLinks = [...prev.enabledTasks[taskKey].links];
      updatedLinks[index] = value;
      const validLinksCount = updatedLinks.filter(link => link.trim() !== "").length;
      return {
        ...prev,
        enabledTasks: {
          ...prev.enabledTasks,
          [taskKey]: {
            ...prev.enabledTasks[taskKey],
            links: updatedLinks,
            instances: validLinksCount, // instances is the count of valid links
          },
        },
      };
    });
  };

  const addLinkField = (taskKey) => {
    const currentLinks = formData.enabledTasks[taskKey].links;
    if (currentLinks.length >= 10) return; // Limit to 10 links
    setFormData((prev) => ({
      ...prev,
      enabledTasks: {
        ...prev.enabledTasks,
        [taskKey]: {
          ...prev.enabledTasks[taskKey],
          links: [...currentLinks, ""],
        },
      },
    }));
  };

  const addCustomTask = () => {
      setFormData((prev) => ({
        ...prev,
        customTasks: [
          ...prev.customTasks,
          {
            id: Date.now(), // Unique ID for custom task
            name: `Custom Task ${prev.customTasks.length + 1}`,
            rate: CUSTOM_TASK_MIN_RATE,
            description: "",
            link: "", // Added a single link for custom tasks
            proofRequired: true, // Default for custom tasks? Adjust as needed
          },
        ],
      }));
    };

  const handleCustomTaskChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      customTasks: prev.customTasks.map((task) =>
        task.id === id
          ? {
              ...task,
              [field]:
                field === 'rate'
                  ? Math.max(CUSTOM_TASK_MIN_RATE, parseFloat(value) || 0)
                  : value,
            }
          : task
      ),
    }));
  };

  const removeCustomTask = (idToRemove) => {
    setFormData((prev) => {
      const updatedCustomTasks = prev.customTasks.filter((task) => task.id !== idToRemove);
      const newAllocations = { ...taskAllocations };

      const removedPercentage = newAllocations[idToRemove] || 0;
      delete newAllocations[idToRemove];

      const remainingKeys = Object.keys(newAllocations);
      if (remainingKeys.length > 0 && removedPercentage > 0) {
        const sumOfRemaining = Object.values(newAllocations).reduce((sum, val) => sum + val, 0);
        if (sumOfRemaining > 0) {
          const scale = (sumOfRemaining + removedPercentage) / sumOfRemaining;
          remainingKeys.forEach(key => {
            newAllocations[key] = parseFloat((newAllocations[key] * scale).toFixed(1));
          });
        }
      } else if (remainingKeys.length === 1) {
        newAllocations[remainingKeys[0]] = 100;
      }

      setTaskAllocations(newAllocations);
      return { ...prev, customTasks: updatedCustomTasks };
    });
  };

  const handleAllocationChange = useCallback((taskKey, value) => {
    let currentAllocations = { ...taskAllocations };
    const newValue = parseFloat(value);


    if (newValue === 0) {
      currentAllocations[taskKey] = 0;
    } else {
      currentAllocations[taskKey] = newValue;
    }

    const activeKeys = Object.keys(currentAllocations).filter(key => currentAllocations[key] > 0);

    if (activeKeys.length === 1 && activeKeys[0] === taskKey) {
        currentAllocations[taskKey] = 100; // If only one active, it takes all 100%
    } else if (activeKeys.length > 1) {
        const sumOfAll = Object.values(currentAllocations).reduce((sum, val) => sum + val, 0);
        const difference = 100 - sumOfAll;
        const others = activeKeys.filter(key => key !== taskKey);

        if (others.length > 0) {
          const sumOfOthers = others.reduce((sum, key) => sum + currentAllocations[key], 0);
          if (sumOfOthers > 0) {
              others.forEach(key => {
                  currentAllocations[key] = parseFloat((currentAllocations[key] + (difference * (currentAllocations[key] / sumOfOthers))).toFixed(1));
              });
          } else { // This case implies all 'others' were 0 before, and now we need to distribute 'difference'
            const remainingDifference = 100 - currentAllocations[taskKey];
            if (others.length > 0) {
                const evenlyDistributed = parseFloat((remainingDifference / others.length).toFixed(1));
                others.forEach(key => {
                    currentAllocations[key] = evenlyDistributed;
                });
            }
          }
        }
    }


    let finalSum = Object.values(currentAllocations).reduce((sum, val) => sum + val, 0);
    if (finalSum !== 100 && activeKeys.length > 0) {
        const lastActiveKey = activeKeys[activeKeys.length - 1]; // Adjust the last active one
        currentAllocations[lastActiveKey] = parseFloat((currentAllocations[lastActiveKey] + (100 - finalSum)).toFixed(1));
    }

    Object.keys(currentAllocations).forEach(key => {
      if (currentAllocations[key] < 0) {
          currentAllocations[key] = 0; // Ensure no negative allocations
      }
    });

    setTaskAllocations(currentAllocations);
  }, [taskAllocations]);



  useEffect(() => {
    let newAllocations = { ...taskAllocations };
    let currentlyActiveKeys = [];


    Object.entries(formData.enabledTasks).forEach(([key, taskData]) => {

      const hasValidLinks = taskData.links.filter(link => link.trim() !== "").length > 0;
      if (taskData.enabled && hasValidLinks) {
        if (!(key in newAllocations)) {
          newAllocations[key] = 0;
        }
        currentlyActiveKeys.push(key);
      } else {
        if (key in newAllocations) {
          delete newAllocations[key];
        }
      }
    });


    formData.customTasks.forEach(task => {

      const isValidCustomTask = task.rate >= CUSTOM_TASK_MIN_RATE && task.name.trim() !== "";
      if (isValidCustomTask) {
        if (!(task.id in newAllocations)) {
          newAllocations[task.id] = 0;
        }
        currentlyActiveKeys.push(task.id);
      } else {
        if (task.id in newAllocations) {
          delete newAllocations[task.id];
        }
      }
    });


    if (currentlyActiveKeys.length === 0) {
        setTaskAllocations({});
        return;
    }


    const sumOfCurrentAllocations = currentlyActiveKeys.reduce((sum, key) => sum + (newAllocations[key] || 0), 0);


    if (sumOfCurrentAllocations === 0) {
      const defaultPercentage = parseFloat((100 / currentlyActiveKeys.length).toFixed(1));
      currentlyActiveKeys.forEach(key => {
        newAllocations[key] = defaultPercentage;
      });

      if (currentlyActiveKeys.length > 0) {
        const currentSum = currentlyActiveKeys.reduce((sum, key) => sum + newAllocations[key], 0);
        newAllocations[currentlyActiveKeys[currentlyActiveKeys.length - 1]] += (100 - currentSum);
      }
    } else {

      const factor = 100 / sumOfCurrentAllocations;
      currentlyActiveKeys.forEach(key => {
        newAllocations[key] = parseFloat((newAllocations[key] * factor).toFixed(1));
      });

      const finalSum = currentlyActiveKeys.reduce((sum, key) => sum + newAllocations[key], 0);
      if (finalSum !== 100 && currentlyActiveKeys.length > 0) {
        newAllocations[currentlyActiveKeys[currentlyActiveKeys.length - 1]] = parseFloat((newAllocations[currentlyActiveKeys[currentlyActiveKeys.length - 1]] + (100 - finalSum)).toFixed(1));
      }
    }


    Object.keys(newAllocations).forEach(key => {
      if (newAllocations[key] < 0) newAllocations[key] = 0;
    });

    setTaskAllocations(newAllocations);
  }, [formData.enabledTasks, formData.customTasks]); // Depend on enabledTasks and customTasks changes


  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.projectName.trim()) newErrors.projectName = "Project Name is required.";
    if (!formData.budget || formData.budget <= 0) newErrors.budget = "Budget must be a positive number.";
    if (!formData.numberOfUsers || formData.numberOfUsers <= 0 || formData.numberOfUsers > formData.budget * 5) {
      newErrors.numberOfUsers = `Number of users must be between 1 and ${formData.budget * 5} (5x budget).`;
    }
    if (!bannerImageBase64) {
        newErrors.bannerImage = "Please upload a banner image for your campaign.";
    }

    if (currentStep === 4) {
        const sumAllocations = Object.values(taskAllocations).reduce((sum, val) => sum + val, 0);
        const activeSlidersCount = Object.keys(taskAllocations).length;

        if (activeSlidersCount > 0 && (sumAllocations < 99.5 || sumAllocations > 100.5)) {
            newErrors.allocation = `Total task allocation must be around 100% (currently ${sumAllocations.toFixed(1)}%). Please adjust.`
        }
        const hasValidTasks = Object.values(formData.enabledTasks).some(t => t.enabled && t.links.filter(link => link.trim() !== "").length > 0) || // Check for valid links
                                 formData.customTasks.some(t => t.rate >= CUSTOM_TASK_MIN_RATE && t.name.trim() !== ""); // Check for name for custom tasks
        if (!hasValidTasks) {
            newErrors.allocation = "Please enable and configure at least one task with valid details (links/name).";
        }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {

      if (newErrors.projectName || newErrors.budget || newErrors.numberOfUsers || newErrors.bannerImage) {
        setCurrentStep(1);
      } else if (newErrors.noTasks) {
        setCurrentStep(2);
      } else if (newErrors.allocation) {
        setCurrentStep(3);
      }
      return;
    }

    const { activeTasks, totalEngagements, totalHypotheticalCost } = getCampaignSummary();
    

    const campaignData = new FormData();
    campaignData.append('name', formData.projectName);
    campaignData.append('budget', parseFloat(formData.budget));
    campaignData.append('numberOfUsers', parseInt(formData.numberOfUsers));
    campaignData.append('earningTag', getEarningTag());
    campaignData.append('rules', JSON.stringify(formData.rules.split("\n").map((r) => r.trim()).filter(Boolean)));
    campaignData.append('totalEngagementsExpected', Math.round(totalEngagements)); // Ensure numbers are sent correctly
    campaignData.append('estimatedTotalCampaignCost', totalHypotheticalCost.toFixed(2)); // Use toFixed for currency


    const finalCampaignTasks = [];


    Object.entries(formData.enabledTasks).forEach(([taskKey, taskData]) => {
        const validLinks = taskData.links.filter(link => link.trim() !== "");
        if (taskData.enabled && validLinks.length > 0) {
            const baseTask = activeTasks.find(task => task.key === taskKey);
            if (baseTask) {
                finalCampaignTasks.push({
                    key: taskKey,
                    name: taskKey.charAt(0).toUpperCase() + taskKey.slice(1).replace(/([A-Z])/g, ' $1').trim(), // Format name
                    baseRate: BASE_TASK_RATES[taskKey],
                    instances: validLinks.length,
                    allocationPercentage: taskAllocations[taskKey] || 0,

                    targetParticipants: Math.round(((taskAllocations[taskKey] || 0) / 100) * formData.numberOfUsers),
                    currentParticipants: 0, // Always start at 0
                    links: validLinks.map((link, index) => ({
                        _id: `${taskKey}-${index}`, // Simple ID for now, can be ObjectId on backend
                        link: link,
                        name: `${taskKey} Link ${index + 1}`,
                        type: taskKey === 'like' ? 'x-like' : // Map taskKey to link type
                               taskKey === 'retweet' ? 'x-retweet' :
                               taskKey === 'comment' ? 'x-comment' :
                               taskKey === 'followX' ? 'x-follow' :
                               taskKey === 'joinDiscord' ? 'discord' :
                               taskKey === 'joinTelegram' ? 'telegram' :
                               'manual-link', // Default or custom type
                        proofRequired: (taskKey === 'comment' || taskKey === 'joinDiscord' || taskKey === 'joinTelegram') ? true : false, // Adjust proof required logic
                        description: `Perform a ${taskKey.replace('X', '').toLowerCase()} on this link.`,
                    })),
                    guideText: "", // Default for now, can be configured
                    guideLink: "", // Default for now, can be configured
                });
            }
        }
    });


    formData.customTasks.forEach(customTask => {
        if (customTask.rate >= CUSTOM_TASK_MIN_RATE && customTask.name.trim() !== "") {
            const baseCustomTask = activeTasks.find(task => task.key === customTask.id);
            if (baseCustomTask) {
                finalCampaignTasks.push({
                    key: customTask.id,
                    name: customTask.name,
                    baseRate: customTask.rate,
                    instances: 1, // Custom tasks are 1 instance per entry
                    allocationPercentage: taskAllocations[customTask.id] || 0,
                    targetParticipants: Math.round(((taskAllocations[customTask.id] || 0) / 100) * formData.numberOfUsers),
                    currentParticipants: 0,
                    links: customTask.link.trim() !== "" ? [{
                        _id: `${customTask.id}-0`,
                        link: customTask.link,
                        name: `${customTask.name} Link`,
                        type: 'manual-upload',
                        description: customTask.description,
                        proofRequired: customTask.proofRequired,
                        proofPlaceholder: "Upload screenshot or provide link to proof",
                        requiredContent: "",
                    }] : [],
                    guideText: customTask.description,
                    guideLink: customTask.link.trim() !== "" ? customTask.link : "",
                });
            }
        }
    });

    campaignData.append('campaignTasks', JSON.stringify(finalCampaignTasks));

    if (bannerImageBase64) {
        campaignData.append('bannerImage', bannerImageBase64);
    } else {
        console.error("bannerImageBase64 is not available for submission.");
        setErrors(prev => ({ ...prev, bannerImage: "Failed to process banner image for submission." }));
        return;
    }

    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        console.error("No authentication token found.");
        navigate("/login");
        return;
      }

      const response = await fetch("https://atfomo-beta.onrender.com/api/campaigns", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: campaignData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create campaign');
      }

      const createdCampaign = await response.json();
      
      navigate("/creator-dashboard");
    } catch (error) {
      console.error("Error submitting campaign:", error.message);
      alert(`Error: ${error.message}`);
    }
  };




  const renderStep1 = () => (
    <>
      <h2 className="form-title">Step 1: Campaign Basics</h2>

      <label className="form-label">
        Campaign Banner Image (Recommended: 300x600px, Max 2MB)
        <input
          type="file"
          accept="image/*"
          onChange={handleBannerImageChange}
          className="form-input-file"
        />
        {bannerPreview && (
          <div className="banner-preview-container">
            <img src={bannerPreview} alt="Banner Preview" className="banner-preview-image" />
          </div>
        )}
        {errors.bannerImage && <p className="error-message">{errors.bannerImage}</p>}
      </label>

      <label className="form-label">
        Name
        <input
          type="text"
          name="projectName"
          value={formData.projectName}
          onChange={handleChange}
          className="form-input"
          placeholder="e.g. 'Epic Airdrop Campaign'"
        />
        {errors.projectName && <p className="error-message">{errors.projectName}</p>}
      </label>

      <label className="form-label">
        Rules (one per line)
        <textarea
          name="rules"
          value={formData.rules}
          onChange={handleChange}
          rows="4"
          className="form-textarea"
          placeholder="Enter rules here, one per line (e.g., 'No bot accounts', 'Must be active on Twitter')..."
        />
      </label>

      <label className="form-label">
        Budget ($)
        <input
          type="number"
          name="budget"
          value={formData.budget}
          onChange={handleChange}
          min="1"
          className="form-input"
          placeholder="e.g. 1000"
        />
        {errors.budget && <p className="error-message">{errors.budget}</p>}
      </label>

      <label className="form-label">
        Number of Users
        <input
          type="number"
          name="numberOfUsers"
          value={formData.numberOfUsers}
          onChange={handleChange}
          min="1"
          max={formData.budget ? formData.budget * 5 : 5000} // Max users can't exceed 5x budget or default
          className="form-input"
          placeholder="e.g. 1000"
        />
        {errors.numberOfUsers && <p className="error-message">{errors.numberOfUsers}</p>}
      </label>

      {formData.budget && formData.numberOfUsers && (
        <p className="earning-tag-display">
          This campaign will be tagged as: <span className={`tag-${getEarningTag()?.replace(/\s/g, '').toLowerCase()}`}>{getEarningTag()}</span>
        </p>
      )}

      <button type="button" className="next-button" onClick={() => {
          const newErrors = {};
          if (!formData.projectName.trim()) newErrors.projectName = "Name is required.";
          if (!formData.budget || formData.budget <= 0) newErrors.budget = "Budget must be a positive number.";
          if (!formData.numberOfUsers || formData.numberOfUsers <= 0 || formData.numberOfUsers > formData.budget * 5) {
            newErrors.numberOfUsers = `Number of users must be between 1 and ${formData.budget * 5} (5x budget).`;
          }
          if (!bannerImageBase64) {
            newErrors.bannerImage = "Please upload a banner image for your campaign.";
          }
          setErrors(newErrors);
          if (Object.keys(newErrors).length === 0) {
            setCurrentStep(2);
          }
      }}>Next</button>
    </>
  );

    const renderStep2 = () => (
      <>
        <h2 className="form-title">Step 2: Enable & Configure Tasks</h2>
        {errors.noTasks && <p className="error-message">{errors.noTasks}</p>}

        {Object.entries(formData.enabledTasks).map(([taskKey, taskData]) => (
          <div key={taskKey} className="task-row">
            <label className="task-toggle-label">
              <input
                type="checkbox"
                checked={taskData.enabled}
                onChange={(e) => handleEnableTaskChange(taskKey, e.target.checked)}
                className="task-checkbox"
              />
              <span className="task-name">
                {taskKey.charAt(0).toUpperCase() + taskKey.slice(1).replace(/([A-Z])/g, ' $1').trim()}
              </span>
              {taskData.enabled && taskData.links && taskData.links.filter(link => link.trim() !== "").length > 0 &&
                <span className="task-instances">
                  ({taskData.links.filter(link => link.trim() !== "").length} links)
                </span>
              }
            </label>

            {taskData.enabled && (
              <div className="task-links-container">
                {taskData.links.map((link, index) => (
                  <input
                    key={index}
                    type="url" // Use type="url" for better validation hints
                    value={link}
                    onChange={(e) => handleLinkChange(taskKey, index, e.target.value)}
                    placeholder={`Enter Link ${index + 1} here`}
                    className="form-input small-input link-input"
                  />
                ))}
                {taskData.links.length < 10 && (
                  <button
                    type="button"
                    onClick={() => addLinkField(taskKey)}
                    className="add-link-button"
                  >
                    + Add another link
                  </button>
                )}
                {taskData.enabled && taskData.links.filter(link => link.trim() !== "").length === 0 &&
                  <p className="warning-message">Add at least one valid link for this task to be active.</p>
                }
              </div>
            )}
          </div>
        ))}

        <hr className="section-divider" />

        <h3 className="custom-tasks-title">Custom Tasks (Optional)</h3>
        {formData.customTasks.map((task) => (
          <div key={task.id} className="custom-task-item">
            <input
              type="text"
              value={task.name}
              onChange={(e) => handleCustomTaskChange(task.id, 'name', e.target.value)}
              placeholder="Custom Task Name (e.g., 'Write a blog post')"
              className="form-input custom-task-input"
            />
            <textarea
              value={task.description || ''}
              onChange={(e) => handleCustomTaskChange(task.id, 'description', e.target.value)}
              placeholder="Describe this custom task for users (e.g., 'Write a 200-word blog post on our platform and share the link.')"
              className="form-textarea custom-task-description-input"
              rows="2"
            ></textarea>
            {}
            <input
              type="url" // Use type="url"
              value={task.link || ''}
              onChange={(e) => handleCustomTaskChange(task.id, 'link', e.target.value)}
              placeholder="Associated Link (e.g., specific article to read)"
              className="form-input custom-task-input"
            />

            <div className="custom-task-rate-row">
              <label className="form-label-small">
                Rate ($):
                <input
                  type="number"
                  value={task.rate}
                  onChange={(e) => handleCustomTaskChange(task.id, 'rate', e.target.value)}
                  min={CUSTOM_TASK_MIN_RATE}
                  step="0.01"
                  placeholder={`Min $${CUSTOM_TASK_MIN_RATE.toFixed(2)}`}
                  className="form-input custom-task-input-rate"
                />
              </label>
              <button type="button" onClick={() => removeCustomTask(task.id)} className="remove-custom-task-button">
                Remove
              </button>
            </div>
            {task.name.trim() === "" && <p className="warning-message">Custom task name is required to be active.</p>}
          </div>
        ))}
        <button type="button" onClick={addCustomTask} className="add-custom-task-button">
          + Add New Custom Task
        </button>

        <div className="form-navigation-buttons">
          <button type="button" className="back-button" onClick={() => setCurrentStep(1)}>Back</button>
          <button type="button" className="next-button" onClick={() => {
            const hasActiveTasks = Object.values(formData.enabledTasks).some(t => t.enabled && t.links.filter(link => link.trim() !== "").length > 0) ||
                                   formData.customTasks.some(t => t.rate >= CUSTOM_TASK_MIN_RATE && t.name.trim() !== ""); // Check for name
            if (!hasActiveTasks) {
              setErrors({ noTasks: "Please enable and configure at least one task with valid links/details." });
              return;
            } else {
              setErrors({});
            }
            setCurrentStep(3);
          }}>Next</button>
        </div>
      </>
    );


  const renderStep3 = () => {
    const activeTasksForSliders = Object.entries(formData.enabledTasks)
      .filter(([, taskData]) => taskData.enabled && taskData.links.filter(link => link.trim() !== "").length > 0) // Filter based on valid links
      .map(([key, taskData]) => ({ key: key, name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim() }))
      .concat(
        formData.customTasks
          .filter((task) => task.rate >= CUSTOM_TASK_MIN_RATE && task.name.trim() !== "") // Filter based on name for custom tasks
          .map((task) => ({ key: task.id, name: task.name }))
      );

    const allocationSum = Object.values(taskAllocations).reduce((sum, val) => sum + val, 0);

    return (
      <>
        <h2 className="form-title">Step 3: Distribute Users Across Tasks</h2>
        <p className="form-description">Adjust the sliders to allocate the percentage of your **{formData.numberOfUsers}** users to each active task. Total should ideally sum to 100%.</p>

        {activeTasksForSliders.length === 0 ? (
          <p className="error-message">No active tasks configured. Please go back to Step 2 to enable tasks and add links/details.</p>
        ) : (
          <div className="allocation-section">
            {activeTasksForSliders.map((task) => (
              <div key={task.key} className="allocation-slider">
                <label className="form-label-small">
                  **{task.name}**: <span className="allocation-value">{taskAllocations[task.key] || 0}%</span> (<span className="allocated-users">{Math.round(((taskAllocations[task.key] || 0) / 100) * formData.numberOfUsers)}</span> users)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={taskAllocations[task.key] || 0}
                  onChange={(e) => handleAllocationChange(task.key, e.target.value)}
                  className="slider"
                />
              </div>
            ))}
            <div className="allocation-summary">
              <strong>Total Allocated: <span className="total-allocation-value">{allocationSum.toFixed(1)}%</span></strong>
              {allocationSum > 100.5 || allocationSum < 99.5 ? (
                <span className={`allocation-status allocation-status-warning`}> (Please adjust to 100%)</span>
              ) : (
                <span className={`allocation-status allocation-status-success`}> (Perfect!)</span>
              )}
            </div>
          </div>
        )}
        {errors.allocation && <p className="error-message">{errors.allocation}</p>}

        <div className="form-navigation-buttons">
          <button type="button" className="back-button" onClick={() => setCurrentStep(2)}>Back</button>
          <button type="button" className="next-button" onClick={() => {
              const sumAllocations = Object.values(taskAllocations).reduce((sum, val) => sum + val, 0);
              const activeSlidersCount = Object.keys(taskAllocations).length;
              if (activeSlidersCount === 0 || (sumAllocations < 99.5 || sumAllocations > 100.5)) {
                  setErrors({ allocation: `Total task allocation must be around 100% (currently ${sumAllocations.toFixed(1)}%). Please adjust.` });
                  return;
              } else {
                  setErrors({});
              }
              setCurrentStep(4);
          }}>Next</button>
        </div>
      </>
    );
  };

  const renderStep4 = () => {
    const { activeTasks } = getCampaignSummary();
    const totalEngagementsActual = activeTasks.reduce((sum, task) => {
        const allocatedUsersForTask = (task.allocation / 100) * formData.numberOfUsers;
        return sum + (task.instances * allocatedUsersForTask);
    }, 0);

    const isReadyForSubmission = activeTasks.length > 0 &&
                                 (Object.values(taskAllocations).reduce((sum, val) => sum + val, 0) >= 99.5 &&
                                  Object.values(taskAllocations).reduce((sum, val) => sum + val, 0) <= 100.5) &&
                                 bannerImageBase64 &&
                                 formData.projectName.trim() !== "" &&
                                 formData.budget > 0 &&
                                 formData.numberOfUsers > 0 &&
                                 formData.numberOfUsers <= formData.budget * 5;


    return (
      <>
        <h2 className="form-title">Step 4: Final Campaign Summary</h2>

        <div className="summary-section">
          <h3 className="summary-subtitle">Campaign Overview:</h3>
          <div className="summary-details-grid">
            {bannerPreview && (
              <div className="summary-banner-preview">
                  <strong>Campaign Banner:</strong>
                  <img src={bannerPreview} alt="Campaign Banner Preview" className="summary-banner-image"/>
              </div>
            )}
            <p><strong>Project Name:</strong> {formData.projectName || "N/A"}</p>
            <p><strong>Rules:</strong> {formData.rules ? formData.rules.split("\n").filter(Boolean).join(", ") : "None"}</p>
            <p><strong>Total Budget:</strong> <span className="summary-value">${parseFloat(formData.budget).toFixed(2)}</span></p>
            <p><strong>Target Users:</strong> <span className="summary-value">{formData.numberOfUsers}</span></p>
            <p>
              <strong>Earning Tag:</strong>
              <span className={`earning-tag-display tag-${getEarningTag()?.replace(/\s/g, '').toLowerCase()}`}>
                {getEarningTag() || "N/A"}
              </span>
            </p>
            <p><strong>Total Estimated Engagements:</strong> <span className="summary-value">{Math.round(totalEngagementsActual)}</span></p>
          </div>
        </div>

        <div className="summary-section">
          <h3 className="summary-subtitle">Task Breakdown:</h3>
          {activeTasks.length === 0 ? (
            <p className="error-message">No tasks configured for this campaign. Please go back and enable tasks.</p>
          ) : (
            <div className="task-breakdown-list">
              {activeTasks.map(task => (
                <div key={task.key} className="task-breakdown-item">
                  <h4>{task.name || task.key}</h4>
                  <p>Target Participants: {Math.round((task.allocation / 100) * formData.numberOfUsers)}</p>
                  <p>Total Engagements Expected: {Math.round(task.instances * ((task.allocation / 100) * formData.numberOfUsers))}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {errors.allocation && <p className="error-message">{errors.allocation}</p>} {}


        <div className="form-navigation-buttons">
          <button type="button" className="back-button" onClick={() => setCurrentStep(3)}>Back</button>
          <button
            type="submit"
            className="submit-button"
            disabled={!isReadyForSubmission}
          >
            Create Campaign 🚀
          </button>
        </div>
      </>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="create-campaign-form">
      <div className="progress-bar">
        <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
        <div className={`progress-line ${currentStep >= 2 ? 'active' : ''}`}></div>
        <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
        <div className={`progress-line ${currentStep >= 3 ? 'active' : ''}`}></div>
        <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
        <div className={`progress-line ${currentStep >= 4 ? 'active' : ''}`}></div>
        <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>4</div>
      </div>

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </form>
  );
};

export default AddProjectForm;