// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Privacy Parrot extension installed');
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCookies') {
    // Get cookies for the current domain
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('Error querying tabs:', chrome.runtime.lastError.message);
          sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
          return;
        }
        
        const activeTab = tabs[0];
        if (activeTab) {
          try {
            const url = new URL(activeTab.url);
            chrome.cookies.getAll({ domain: url.hostname }, (cookies) => {
              if (chrome.runtime.lastError) {
                console.error('Error getting cookies:', chrome.runtime.lastError.message);
                sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
                return;
              }
              sendResponse({ status: 'success', cookies });
            });
          } catch (error) {
            console.error('Error parsing URL:', error);
            sendResponse({ status: 'error', message: error.toString() });
          }
        } else {
          sendResponse({ status: 'error', message: 'No active tab found' });
        }
      });
    } catch (error) {
      console.error('Error in getCookies:', error);
      sendResponse({ status: 'error', message: error.toString() });
    }
    return true; // Required for async response
  }
  
  if (request.action === 'updateIcon') {
    // Update the extension icon based on privacy risk level
    try {
      console.log('Updating icon for risk level:', request.riskLevel);
      
      // Try setting the icon
      try {
        const iconPath = getIconPathForRiskLevel(request.riskLevel);
        chrome.action.setIcon({ path: iconPath }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error setting icon:', chrome.runtime.lastError.message);
            // If icon loading fails, use color badge as fallback
            setFallbackRiskIndicator(request.riskLevel);
          } else {
            console.log('Successfully set icon');
          }
        });
      } catch (iconError) {
        console.error('Icon error:', iconError);
        // Use fallback if icon setting fails
        setFallbackRiskIndicator(request.riskLevel);
      }
      
      // Also update badge if high risk
      if (request.riskLevel === 'high') {
        chrome.action.setBadgeText({ text: '!' }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error setting badge text:', chrome.runtime.lastError.message);
          }
        });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error setting badge color:', chrome.runtime.lastError.message);
          }
        });
      } else {
        chrome.action.setBadgeText({ text: '' }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error clearing badge text:', chrome.runtime.lastError.message);
          }
        });
      }
      
      sendResponse({ status: 'success' });
    } catch (error) {
      console.error('Error updating icon:', error);
      sendResponse({ status: 'error', message: error.toString() });
    }
    return true;
  }
  
  return false;
});

// Helper function to get the appropriate icon based on risk level
function getIconPathForRiskLevel(riskLevel) {
  // Use the existing icon paths, but handle errors in the setIcon callback
  let iconPath = {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  };
  
  // In the future, risk-specific icons can be used
  /*
  switch (riskLevel) {
    case 'low':
      return { "16": "icons/low/icon16.png", ... };
    case 'medium':
      return { "16": "icons/medium/icon16.png", ... };
    case 'high':
      return { "16": "icons/high/icon16.png", ... };
  }
  */
  
  return iconPath;
}

// Helper function to set a fallback risk indicator using badge colors
function setFallbackRiskIndicator(riskLevel) {
  // Use badge colors to indicate risk level
  let badgeColor = '#4CAF50'; // Green for low risk
  let badgeText = 'OK';
  
  if (riskLevel === 'medium') {
    badgeColor = '#FFC107'; // Yellow for medium risk
    badgeText = '!';
  } else if (riskLevel === 'high') {
    badgeColor = '#F44336'; // Red for high risk
    badgeText = '!!';
  }
  
  // Set badge text and color
  chrome.action.setBadgeText({ text: badgeText }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error setting fallback badge text:', chrome.runtime.lastError.message);
    }
  });
  
  chrome.action.setBadgeBackgroundColor({ color: badgeColor }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error setting fallback badge color:', chrome.runtime.lastError.message);
    }
  });
} 