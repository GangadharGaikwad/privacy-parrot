document.addEventListener('DOMContentLoaded', () => {
  const showTipsBtn = document.getElementById('show-tips-btn');
  const showDetailsBtn = document.getElementById('show-details-btn');
  const showFlowBtn = document.getElementById('show-flow-btn');
  const protectionTips = document.getElementById('protection-tips');
  const technicalDetails = document.getElementById('technical-details');
  const dataFlowMap = document.getElementById('data-flow-map');
  const loadingMessage = document.getElementById('loading-message');
  const resultsContainer = document.getElementById('results-container');
  
  // Store cached data for reuse
  let cachedData = null;

  // Toggle protection tips with animation
  showTipsBtn.addEventListener('click', () => {
    if (technicalDetails.classList.contains('details-visible')) {
      // Animate out the technical details first
      animateOut(technicalDetails, () => {
        // Then animate in the protection tips
        animateIn(protectionTips);
        // Scroll to the protection tips section
        protectionTips.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else if (protectionTips.classList.contains('details-visible')) {
      // If already showing, just animate out
      animateOut(protectionTips);
    } else {
      // If nothing is showing, just animate in
      animateIn(protectionTips);
      // Scroll to the protection tips section
      protectionTips.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Toggle technical details with animation
  showDetailsBtn.addEventListener('click', () => {
    if (protectionTips.classList.contains('details-visible')) {
      // Animate out the protection tips first
      animateOut(protectionTips, () => {
        // Then animate in the technical details
        animateIn(technicalDetails);
        // Scroll to the technical details section
        technicalDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else if (technicalDetails.classList.contains('details-visible')) {
      // If already showing, just animate out
      animateOut(technicalDetails);
    } else {
      // If nothing is showing, just animate in
      animateIn(technicalDetails);
      // Scroll to the technical details section
      technicalDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Toggle data flow map with animation
  showFlowBtn.addEventListener('click', () => {
    if (protectionTips.classList.contains('details-visible') || technicalDetails.classList.contains('details-visible')) {
      // Animate out the current visible section first
      const visibleSection = protectionTips.classList.contains('details-visible') ? 
                           protectionTips : technicalDetails;
      animateOut(visibleSection, () => {
        // Then animate in the data flow map
        animateIn(dataFlowMap);
        // Create the visualization when expanded
        createDataFlowVisualization(cachedData);
        // Scroll to the data flow map section
        dataFlowMap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else if (dataFlowMap.classList.contains('details-visible')) {
      // If already showing, just animate out
      animateOut(dataFlowMap);
    } else {
      // If nothing is showing, just animate in
      animateIn(dataFlowMap);
      // Create the visualization when expanded
      createDataFlowVisualization(cachedData);
      // Scroll to the data flow map section
      dataFlowMap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Helper function to animate in a section
  function animateIn(element) {
    element.style.display = 'block';
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px)';
    
    // Trigger animation
    setTimeout(() => {
      element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
      element.classList.add('details-visible');
    }, 10);
  }

  // Helper function to animate out a section
  function animateOut(element, callback) {
    element.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px)';
    
    // Wait for animation to complete
    setTimeout(() => {
      element.classList.remove('details-visible');
      element.style.display = 'none';
      if (callback) callback();
    }, 200);
  }

  // Request page analysis from the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0].id;
    
    // Check if this is a Chrome URL or other restricted URL
    const activeTabUrl = tabs[0].url || '';
    if (activeTabUrl.startsWith('chrome://') || 
        activeTabUrl.startsWith('chrome-extension://') ||
        activeTabUrl.startsWith('devtools://') ||
        activeTabUrl.startsWith('https://chrome.google.com/webstore/')) {
      showRestrictedPage();
      return;
    }
    
    // Request analysis from the content script
    try {
      chrome.tabs.sendMessage(
        activeTabId,
        { action: 'analyzePagePrivacy' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log('Content script communication error:', chrome.runtime.lastError.message);
            // Content script might not be loaded yet
            loadContentScriptAndAnalyze(activeTabId);
            return;
          }
          
          if (response && response.status === 'success') {
            displayResults(response.data);
          } else if (response && response.status === 'error') {
            showError(response.message);
          } else {
            showError();
          }
        }
      );
    } catch (error) {
      console.error('Error sending message to content script:', error);
      showError();
    }
  });

  // Show message for restricted pages
  function showRestrictedPage() {
    loadingMessage.innerHTML = '<span style="color: #F44336;">⚠️</span> Privacy analysis is not available on Chrome system pages.';
  }

  // Load content script if not already loaded
  function loadContentScriptAndAnalyze(tabId) {
    try {
      // First, update the UI to show loading status
      loadingMessage.innerHTML = 'Analyzing page privacy... <span class="loading-spinner"></span>';
      
      // Attempt to inject and execute the content script
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ['content.js']
        },
        (injectionResults) => {
          // Check for errors in script injection
          if (chrome.runtime.lastError) {
            console.error('Script injection error:', chrome.runtime.lastError.message);
            showError('Could not analyze this page. ' + chrome.runtime.lastError.message);
            return;
          }
          
          // After loading content script, give it a moment to initialize
          setTimeout(() => {
            try {
              // Attempt to send message to the content script
              chrome.tabs.sendMessage(
                tabId,
                { action: 'analyzePagePrivacy' },
                (response) => {
                  // Check for communication errors
                  if (chrome.runtime.lastError) {
                    console.error('Message error after injection:', chrome.runtime.lastError.message);
                    
                    // Check if error is related to restricted pages
                    const errorMsg = chrome.runtime.lastError.message;
                    if (errorMsg.includes('cannot be accessed') || 
                        errorMsg.includes('restricted')) {
                      showRestrictedPage();
                    } else {
                      showError('Communication error: ' + errorMsg);
                    }
                    return;
                  }
                  
                  // Process the response if successful
                  if (response && response.status === 'success') {
                    displayResults(response.data);
                    
                    // Update icon based on risk level
                    try {
                      chrome.runtime.sendMessage(
                        { 
                          action: 'updateIcon', 
                          riskLevel: response.data.riskLevel 
                        },
                        (iconResponse) => {
                          if (chrome.runtime.lastError) {
                            console.error('Icon update error:', chrome.runtime.lastError.message);
                            // Don't show this error to the user, as it doesn't affect functionality
                            // The background script will handle this with a fallback
                          }
                        }
                      );
                    } catch (iconError) {
                      console.error('Failed to send icon update message:', iconError);
                      // Don't show icon errors to the user
                    }
                  } else if (response && response.status === 'error') {
                    // Show specific error message from content script
                    showError(response.message);
                  } else {
                    // Generic error if response is invalid
                    showError('Invalid response from content script');
                  }
                }
              );
            } catch (messagingError) {
              console.error('Error sending message after injection:', messagingError);
              showError('Failed to communicate with the page: ' + messagingError.message);
            }
          }, 300); // Wait 300ms for the content script to initialize
        }
      );
    } catch (scriptError) {
      console.error('Fatal error executing script:', scriptError);
      showError('Could not analyze this page: ' + scriptError.message);
    }
  }

  // Display the analysis results in the popup
  function displayResults(data) {
    // Store data in cache for reuse
    cachedData = data;
    
    // Fade out loading message
    loadingMessage.style.transition = 'opacity 0.3s ease';
    loadingMessage.style.opacity = '0';
    
    setTimeout(() => {
      loadingMessage.style.display = 'none';
      resultsContainer.style.display = 'block';
      
      // Fade in results with a slight delay for a smooth transition
      setTimeout(() => {
        resultsContainer.style.opacity = '1';
      }, 50);
      
      // Set risk level with animation
      const riskLevelElem = document.getElementById('risk-level');
      riskLevelElem.textContent = '⌛'; // Start with loading icon
      
      // Animate risk level change
      setTimeout(() => {
        riskLevelElem.style.transform = 'scale(1.2)';
        riskLevelElem.style.opacity = '0.5';
        
        setTimeout(() => {
          riskLevelElem.textContent = getRiskEmoji(data.riskLevel);
          riskLevelElem.className = 'risk-indicator risk-' + data.riskLevel;
          riskLevelElem.style.transform = 'scale(1)';
          riskLevelElem.style.opacity = '1';
        }, 150);
      }, 100);
      
      // Populate data collection points with staggered animation
      const dataCollectionContainer = document.getElementById('data-collection-container');
      dataCollectionContainer.innerHTML = '';
      
      data.dataPoints.forEach((dataPoint, index) => {
        const dataItem = document.createElement('div');
        dataItem.className = 'data-item';
        dataItem.style.opacity = '0';
        dataItem.style.transform = 'translateY(10px)';
        
        // Create the main expandable header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'expandable-item';
        
        const dataType = document.createElement('div');
        dataType.className = 'data-type interactive-highlight';
        dataType.textContent = dataPoint.name;
        
        // Add tooltip for sensitivity level
        const sensitivityLabels = ['Minimal', 'Low', 'Moderate', 'High', 'Very High'];
        if (dataPoint.sensitivity > 0 && dataPoint.sensitivity <= 5) {
          const tooltipText = `Sensitivity: ${sensitivityLabels[dataPoint.sensitivity-1]}`;
          const tooltip = document.createElement('span');
          tooltip.className = 'info-tooltip';
          tooltip.setAttribute('data-tooltip', tooltipText);
          tooltip.textContent = 'i';
          dataType.appendChild(tooltip);
        }
        
        const starRating = document.createElement('div');
        starRating.className = 'data-meter';
        starRating.innerHTML = generateStarRating(dataPoint.sensitivity);
        
        headerDiv.appendChild(dataType);
        headerDiv.appendChild(starRating);
        dataItem.appendChild(headerDiv);
        
        // Create the expandable content
        const detailContent = document.createElement('div');
        detailContent.className = 'detail-content';
        
        // Get detailed information for this data type
        const detailInfo = getDataSensitivityInfo(dataPoint.name, dataPoint.sensitivity);
        
        // Build the detail content HTML
        detailContent.innerHTML = `
          <p>${detailInfo.explanation}</p>
          <div class="detail-title">How it might be used:</div>
          ${detailInfo.impact.map(item => `<div class="detail-item">${item}</div>`).join('')}
          <div class="detail-title">How to protect yourself:</div>
          <div class="detail-item">${detailInfo.protection}</div>
          <a href="#" class="learn-more">Learn more about ${dataPoint.name.toLowerCase()} privacy</a>
        `;
        
        dataItem.appendChild(detailContent);
        dataCollectionContainer.appendChild(dataItem);
        
        // Staggered entrance animation
        setTimeout(() => {
          dataItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          dataItem.style.opacity = '1';
          dataItem.style.transform = 'translateY(0)';
        }, 100 + (index * 50));
      });
      
      // Populate tracking info with staggered animation
      const trackingContainer = document.getElementById('tracking-container');
      trackingContainer.innerHTML = '';
      
      // Create a single container for all tracking information
      const trackingBox = document.createElement('div');
      trackingBox.className = 'tracking-box';
      trackingBox.style.opacity = '0';
      trackingBox.style.transform = 'translateY(10px)';
      
      let trackingItems = [];
      
      // Cookies information
      if (data.cookies && data.cookies.total > 0) {
        const cookiesItem = document.createElement('div');
        cookiesItem.className = 'tracking-item';
        
        // Create expandable header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'expandable-item';
        
        const cookieTitle = document.createElement('div');
        cookieTitle.className = 'data-type interactive-highlight';
        cookieTitle.textContent = 'Cookies';
        
        // Add tooltip for cookies
        const cookieTooltip = document.createElement('span');
        cookieTooltip.className = 'info-tooltip';
        cookieTooltip.setAttribute('data-tooltip', 'Small files stored in your browser');
        cookieTooltip.textContent = 'i';
        cookieTitle.appendChild(cookieTooltip);
        
        const cookieCount = document.createElement('div');
        cookieCount.textContent = `${data.cookies.total} (${data.cookies.tracking} tracking)`;
        
        headerDiv.appendChild(cookieTitle);
        headerDiv.appendChild(cookieCount);
        
        // Create detail content
        const detailContent = document.createElement('div');
        detailContent.className = 'detail-content';
        
        // Get cookie information
        const cookieInfo = getTrackerInfo('Cookies', 'Tracking');
        
        // Build the detail content HTML
        detailContent.innerHTML = `
          <p>${cookieInfo.explanation}</p>
          <div class="detail-title">How cookies might be used:</div>
          ${cookieInfo.impact.map(item => `<div class="detail-item">${item}</div>`).join('')}
          <div class="detail-title">Cookie breakdown:</div>
          <div class="detail-item">Total cookies: ${data.cookies.total}</div>
          <div class="detail-item">Tracking cookies: ${data.cookies.tracking}</div>
          <div class="detail-title">How to protect yourself:</div>
          <div class="detail-item">${cookieInfo.protection}</div>
          <a href="#" class="learn-more">Learn more about cookies and privacy</a>
        `;
        
        cookiesItem.appendChild(headerDiv);
        cookiesItem.appendChild(detailContent);
        trackingItems.push(cookiesItem);
      }
      
      // Trackers info
      if (data.trackers && data.trackers.length > 0) {
        data.trackers.forEach(tracker => {
          const trackerItem = document.createElement('div');
          trackerItem.className = 'tracking-item';
          
          // Create expandable header
          const headerDiv = document.createElement('div');
          headerDiv.className = 'expandable-item';
          
          const trackerTitle = document.createElement('div');
          trackerTitle.className = 'data-type interactive-highlight';
          trackerTitle.textContent = tracker.name;
          
          // Add tooltip for tracker
          const trackerTooltipText = tracker.type === 'Analytics' ? 'Measures user behavior' :
                                    tracker.type === 'Advertising' ? 'Used for targeted ads' :
                                    tracker.type === 'Social Media' ? 'Connects to social networks' :
                                    'Tracks user activity';
          
          const trackerTooltip = document.createElement('span');
          trackerTooltip.className = 'info-tooltip';
          trackerTooltip.setAttribute('data-tooltip', trackerTooltipText);
          trackerTooltip.textContent = 'i';
          trackerTitle.appendChild(trackerTooltip);
          
          const trackerType = document.createElement('div');
          
          // Add color-coded pill for tracker type
          trackerType.className = `type-pill ${tracker.type.toLowerCase().replace(' ', '-')}`;
          trackerType.textContent = tracker.type;
          
          headerDiv.appendChild(trackerTitle);
          headerDiv.appendChild(trackerType);
          
          // Create detail content
          const detailContent = document.createElement('div');
          detailContent.className = 'detail-content';
          
          // Get tracker information
          const trackerInfo = getTrackerInfo(tracker.name, tracker.type);
          
          // Build the detail content HTML
          detailContent.innerHTML = `
            <p>${trackerInfo.explanation}</p>
            <div class="detail-title">How this tracker might be used:</div>
            ${trackerInfo.impact.map(item => `<div class="detail-item">${item}</div>`).join('')}
            <div class="detail-title">How to protect yourself:</div>
            <div class="detail-item">${trackerInfo.protection}</div>
            <a href="#" class="learn-more">Learn more about ${tracker.name}</a>
          `;
          
          trackerItem.appendChild(headerDiv);
          trackerItem.appendChild(detailContent);
          trackingItems.push(trackerItem);
        });
      }
      
      // Fingerprinting info
      if (data.fingerprinting && data.fingerprinting.detected) {
        const fingerprintItem = document.createElement('div');
        fingerprintItem.className = 'tracking-item';
        if (data.fingerprinting.riskLevel === 'high') {
          fingerprintItem.classList.add('needs-attention');
        }
        
        // Add warning icon if high risk
        const warningIcon = data.fingerprinting.riskLevel === 'high' ? '⚠️ ' : '';
        
        // Create expandable header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'expandable-item';
        
        const fpTitle = document.createElement('div');
        fpTitle.className = 'data-type interactive-highlight';
        fpTitle.innerHTML = `${warningIcon}Browser Fingerprinting`;
        
        // Add tooltip for fingerprinting
        const fpTooltip = document.createElement('span');
        fpTooltip.className = 'info-tooltip';
        fpTooltip.setAttribute('data-tooltip', 'Identifies your device without cookies');
        fpTooltip.textContent = 'i';
        fpTitle.appendChild(fpTooltip);
        
        const riskBadge = document.createElement('div');
        riskBadge.className = `risk-${data.fingerprinting.riskLevel}`;
        riskBadge.textContent = capitalizeFirstLetter(data.fingerprinting.riskLevel) + ' risk';
        
        headerDiv.appendChild(fpTitle);
        headerDiv.appendChild(riskBadge);
        
        // Create detail content
        const detailContent = document.createElement('div');
        detailContent.className = 'detail-content';
        
        // Get fingerprinting information
        const fingerprintInfo = getFingerprintingInfo(data.fingerprinting.riskLevel);
        
        // Build the detail content HTML
        detailContent.innerHTML = `
          <p>${fingerprintInfo.explanation}</p>
          <div class="detail-title">How fingerprinting might be used:</div>
          ${fingerprintInfo.impact.map(item => `<div class="detail-item">${item}</div>`).join('')}
          ${data.fingerprinting.techniques.length > 0 ? 
            `<div class="detail-title">Detected techniques:</div>
            ${data.fingerprinting.techniques.map(technique => 
              `<div class="detail-item">${technique}</div>`).join('')}`
            : ''}
          <div class="detail-title">How to protect yourself:</div>
          <div class="detail-item">${fingerprintInfo.protection}</div>
          <a href="#" class="learn-more">Learn more about browser fingerprinting</a>
        `;
        
        fingerprintItem.appendChild(headerDiv);
        fingerprintItem.appendChild(detailContent);
        trackingItems.push(fingerprintItem);
      }
      
      // Data sharing info
      if (data.dataSharing) {
        const dataSharingItem = document.createElement('div');
        dataSharingItem.className = 'tracking-item';
        if (data.dataSharing.sharingLevel === 'high') {
          dataSharingItem.classList.add('needs-attention');
        }
        
        // Add warning icon if high risk
        const warningIcon = data.dataSharing.sharingLevel === 'high' ? '⚠️ ' : '';
        let sharingText = `${data.dataSharing.thirdPartyDomains} third-party domains`;
        
        if (data.dataSharing.dataCompanies && data.dataSharing.dataCompanies.length > 0) {
          sharingText = `${data.dataSharing.dataCompanies.length} data broker${data.dataSharing.dataCompanies.length > 1 ? 's' : ''}`;
        }
        
        // Create expandable header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'expandable-item';
        
        const dsTitle = document.createElement('div');
        dsTitle.className = 'data-type interactive-highlight';
        dsTitle.innerHTML = `${warningIcon}Data Sharing`;
        
        // Add tooltip for data sharing
        const dsTooltip = document.createElement('span');
        dsTooltip.className = 'info-tooltip';
        dsTooltip.setAttribute('data-tooltip', 'Shares data with third parties');
        dsTooltip.textContent = 'i';
        dsTitle.appendChild(dsTooltip);
        
        const sharingBadge = document.createElement('div');
        sharingBadge.className = `risk-${data.dataSharing.sharingLevel}`;
        sharingBadge.textContent = sharingText;
        
        headerDiv.appendChild(dsTitle);
        headerDiv.appendChild(sharingBadge);
        
        // Create detail content
        const detailContent = document.createElement('div');
        detailContent.className = 'detail-content';
        
        // Get data sharing information
        const brokerCount = data.dataSharing.dataCompanies ? data.dataSharing.dataCompanies.length : 0;
        const sharingInfo = getDataSharingInfo(data.dataSharing.sharingLevel, brokerCount);
        
        // Build the detail content HTML
        let brokersList = '';
        if (data.dataSharing.dataCompanies && data.dataSharing.dataCompanies.length > 0) {
          brokersList = `
            <div class="detail-title">Detected data companies:</div>
            ${data.dataSharing.dataCompanies.map(company => 
              `<div class="detail-item">${company.name} (${company.type})</div>`).join('')}
          `;
        }
        
        detailContent.innerHTML = `
          <p>${sharingInfo.explanation}</p>
          <div class="detail-title">What this means for your privacy:</div>
          ${sharingInfo.impact.map(item => `<div class="detail-item">${item}</div>`).join('')}
          ${brokersList}
          <div class="detail-title">How to protect yourself:</div>
          <div class="detail-item">${sharingInfo.protection}</div>
          <a href="#" class="learn-more">Learn more about data sharing and brokers</a>
        `;
        
        dataSharingItem.appendChild(headerDiv);
        dataSharingItem.appendChild(detailContent);
        trackingItems.push(dataSharingItem);
      }
      
      // Add tracking items to the tracking box
      trackingItems.forEach((item, index) => {
        // Add a class for the last item instead of inline style
        if (index === trackingItems.length - 1) {
          item.classList.add('last-item');
        }
        trackingBox.appendChild(item);
      });
      
      // Add the tracking box to the container if we have tracking items
      if (trackingItems.length > 0) {
        trackingContainer.appendChild(trackingBox);
        
        // Add animation class instead of inline styles
        setTimeout(() => {
          trackingBox.classList.add('fade-in');
        }, 200);
      } else {
        // No tracking detected message
        const noTrackingMsg = document.createElement('div');
        noTrackingMsg.className = 'data-item no-tracking';
        noTrackingMsg.innerHTML = `
          <div class="data-type">No tracking detected</div>
          <div>🔒</div>
        `;
        trackingContainer.appendChild(noTrackingMsg);
        
        setTimeout(() => {
          noTrackingMsg.classList.add('fade-in');
        }, 200);
      }
      
      // Set bottom line with a typewriter effect and make it expandable
      const bottomLineContainer = document.getElementById('bottom-line-text');
      bottomLineContainer.innerHTML = '';
      
      // Create expandable header
      const bottomLineHeader = document.createElement('div');
      bottomLineHeader.className = 'expandable-item bottom-line-header';
      bottomLineContainer.appendChild(bottomLineHeader);
      
      // Create detail content for expanded view
      const bottomLineDetail = document.createElement('div');
      bottomLineDetail.className = 'detail-content';
      bottomLineContainer.appendChild(bottomLineDetail);
      
      // Get risk level for more detailed explanation
      const riskLevelText = data.riskLevel === 'high' ? 'high-risk' : 
                           data.riskLevel === 'medium' ? 'medium-risk' : 'low-risk';
      
      // Prepare detailed explanation based on the analysis
      let detailedExplanation = '';
      if (data.riskLevel === 'high') {
        detailedExplanation = `
          <p>This site collects sensitive personal information and appears to share it with third parties. It uses multiple tracking technologies that could impact your privacy.</p>
          <div class="detail-title">Key concerns:</div>
          ${data.dataPoints.length > 0 ? 
            `<div class="detail-item">Collects ${data.dataPoints.length} types of personal data</div>` : ''}
          ${data.cookies && data.cookies.tracking > 0 ? 
            `<div class="detail-item">Uses ${data.cookies.tracking} tracking cookies</div>` : ''}
          ${data.trackers && data.trackers.length > 0 ? 
            `<div class="detail-item">Contains ${data.trackers.length} tracking technologies</div>` : ''}
          ${data.fingerprinting && data.fingerprinting.detected ? 
            `<div class="detail-item">Uses browser fingerprinting techniques</div>` : ''}
          ${data.dataSharing && data.dataSharing.sharingLevel !== 'low' ? 
            `<div class="detail-item">Shares data with third parties</div>` : ''}
        `;
      } else if (data.riskLevel === 'medium') {
        detailedExplanation = `
          <p>This site collects some personal information and uses tracking technologies, but appears to have reasonable privacy practices overall.</p>
          <div class="detail-title">Notable points:</div>
          ${data.dataPoints.length > 0 ? 
            `<div class="detail-item">Collects ${data.dataPoints.length} types of personal data</div>` : ''}
          ${data.cookies && data.cookies.total > 0 ? 
            `<div class="detail-item">Uses ${data.cookies.total} cookies (${data.cookies.tracking} for tracking)</div>` : ''}
          ${data.trackers && data.trackers.length > 0 ? 
            `<div class="detail-item">Contains ${data.trackers.length} tracking technologies</div>` : ''}
          ${data.policyInfo && data.policyInfo.hasPrivacyPolicy ? 
            `<div class="detail-item">Has a privacy policy in place</div>` : ''}
        `;
      } else {
        detailedExplanation = `
          <p>This site has minimal data collection and appears to follow good privacy practices.</p>
          <div class="detail-title">Positive indicators:</div>
          ${data.policyInfo && data.policyInfo.hasPrivacyPolicy ? 
            `<div class="detail-item">Has a clear privacy policy</div>` : ''}
          ${data.cookies && data.cookies.tracking === 0 ? 
            `<div class="detail-item">No tracking cookies detected</div>` : ''}
          ${data.trackers && data.trackers.length === 0 ? 
            `<div class="detail-item">No third-party trackers detected</div>` : ''}
          ${data.dataSharing && data.dataSharing.sharingLevel === 'low' ? 
            `<div class="detail-item">Limited third-party data sharing</div>` : ''}
        `;
      }
      
      // Add overall recommendation based on risk level
      detailedExplanation += `
        <div class="detail-title">Overall recommendation:</div>
        <div class="detail-item">${data.riskLevel === 'high' ? 
          'Be cautious about sharing sensitive information on this site.' : 
          data.riskLevel === 'medium' ? 
          'Consider what personal information you share with this site.' : 
          'This site appears to respect privacy, but always be mindful of shared data.'}</div>
      `;
      
      bottomLineDetail.innerHTML = detailedExplanation;
      
      // Simple typewriter effect for the summary
      const finalText = data.bottomLine;
      let charIndex = 0;
      const typewriterInterval = setInterval(() => {
        if (charIndex < finalText.length) {
          bottomLineHeader.textContent += finalText.charAt(charIndex);
          charIndex++;
        } else {
          clearInterval(typewriterInterval);
        }
      }, 20);
      
      // Populate protection tips
      const tipsContainer = document.getElementById('tips-container');
      tipsContainer.innerHTML = '';
      
      data.protectionTips.forEach(tip => {
        const tipItem = document.createElement('div');
        tipItem.className = 'tip-item';
        tipItem.textContent = tip;
        tipsContainer.appendChild(tipItem);
      });
      
      // Populate technical details
      const techDetailsContainer = document.getElementById('tech-details-container');
      techDetailsContainer.innerHTML = '';
      
      Object.entries(data.technicalDetails).forEach(([key, value]) => {
        const detailItem = document.createElement('div');
        detailItem.className = 'tech-detail-item';
        detailItem.innerHTML = `<strong>${key}:</strong> ${value}`;
        techDetailsContainer.appendChild(detailItem);
      });
      
      // Add fingerprinting techniques if detected
      if (data.fingerprinting && data.fingerprinting.detected && data.fingerprinting.techniques.length > 0) {
        const fingerprintingDetails = document.createElement('div');
        fingerprintingDetails.className = 'tech-detail-item';
        fingerprintingDetails.innerHTML = `<strong>Fingerprinting Techniques:</strong> ${data.fingerprinting.techniques.join(', ')}`;
        techDetailsContainer.appendChild(fingerprintingDetails);
      }
      
      // Add data broker companies if detected
      if (data.dataSharing && data.dataSharing.dataCompanies && data.dataSharing.dataCompanies.length > 0) {
        const dataBrokerDetails = document.createElement('div');
        dataBrokerDetails.className = 'tech-detail-item';
        dataBrokerDetails.innerHTML = `<strong>Data Companies:</strong> ${data.dataSharing.dataCompanies.map(c => c.name).join(', ')}`;
        techDetailsContainer.appendChild(dataBrokerDetails);
      }
    }, 300);
  }

  // Show error message if analysis fails
  function showError(message) {
    loadingMessage.innerHTML = '<span style="color: #F44336;">⚠️</span> ' + (message || 'Could not analyze this page. Try refreshing.');
    
    // Add a retry button
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry';
    retryButton.style.marginLeft = '10px';
    retryButton.style.padding = '4px 10px';
    retryButton.style.border = 'none';
    retryButton.style.borderRadius = '4px';
    retryButton.style.backgroundColor = '#2196F3';
    retryButton.style.color = 'white';
    retryButton.style.cursor = 'pointer';
    retryButton.onclick = () => {
      // Show loading again
      loadingMessage.innerHTML = 'Analyzing page privacy... <span class="loading-spinner"></span>';
      
      // Reload the popup to try again
      setTimeout(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTabId = tabs[0].id;
          loadContentScriptAndAnalyze(activeTabId);
        });
      }, 300);
    };
    
    loadingMessage.appendChild(retryButton);
  }

  // Helper function to generate star rating HTML
  function generateStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<span class="star ${i <= rating ? 'filled' : ''}">★</span>`;
    }
    return stars;
  }

  // Helper function to get risk emoji
  function getRiskEmoji(riskLevel) {
    switch (riskLevel) {
      case 'low':
        return '🔒';
      case 'medium':
        return '⚠️';
      case 'high':
        return '🚨';
      default:
        return '⌛';
    }
  }
  
  // Helper function to capitalize first letter
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Add event listener for expandable items
  document.addEventListener('click', function(event) {
    // Check if the clicked element or its parent is an expandable item
    const expandableItem = event.target.closest('.expandable-item');
    if (expandableItem) {
      const parentItem = expandableItem.closest('.data-item, .tracking-item');
      if (parentItem) {
        parentItem.classList.toggle('expanded');
      }
    }
  });

  // Helper function to generate data sensitivity explanation
  function getDataSensitivityInfo(dataType, sensitivityLevel) {
    const sensitivityMap = {
      'Email': {
        explanation: 'Email addresses can be used to identify you across websites and services.',
        impact: [
          'Marketing emails and newsletters',
          'Account creation and login',
          'Potential data sharing with third parties'
        ],
        protection: 'Consider using temporary email services for non-essential signups.'
      },
      'Password': {
        explanation: 'Password fields should always be secure and encrypted.',
        impact: [
          'Site security depends on password handling',
          'Potential for credential theft if improperly secured',
          'May be used for other services if you reuse passwords'
        ],
        protection: 'Always use unique passwords and consider a password manager.'
      },
      'Phone Number': {
        explanation: 'Phone numbers are highly personal identifiers linked to your real identity.',
        impact: [
          'SMS verification and marketing',
          'Two-factor authentication',
          'Potential for telemarketing calls'
        ],
        protection: 'Provide only if necessary or consider using a virtual phone number.'
      },
      'Name': {
        explanation: 'Your name helps personalize services but also identifies you.',
        impact: [
          'Account personalization',
          'Customer records',
          'May be shared with partners'
        ],
        protection: 'Consider using initials or pseudonyms when full name isn\'t required.'
      },
      'Address': {
        explanation: 'Physical addresses reveal your location and are highly sensitive.',
        impact: [
          'Shipping and billing information',
          'Regional service customization',
          'Marketing demographic profiling'
        ],
        protection: 'Only provide for necessary deliveries or services.'
      },
      'Birthdate': {
        explanation: 'Date of birth is often used for identity verification and age restrictions.',
        impact: [
          'Age verification',
          'Birthday promotions',
          'Identity confirmation'
        ],
        protection: 'Consider providing only month and day when possible, or use a modified date.'
      },
      'SSN': {
        explanation: 'Social Security Numbers are extremely sensitive and prime targets for identity theft.',
        impact: [
          'Legal identification',
          'Credit checks',
          'Financial services'
        ],
        protection: 'Only provide on secure, trusted financial or government sites.'
      },
      'Credit Card': {
        explanation: 'Payment information is highly sensitive financial data.',
        impact: [
          'Payment processing',
          'Subscription billing',
          'Purchase history tracking'
        ],
        protection: 'Look for secure payment indicators and consider virtual card numbers.'
      },
      'Consent': {
        explanation: 'Consent checkboxes determine what the site can do with your data.',
        impact: [
          'Marketing permissions',
          'Data sharing authorizations',
          'Terms of service agreements'
        ],
        protection: 'Read carefully before agreeing and uncheck pre-selected boxes.'
      },
      'Location': {
        explanation: 'Location data can reveal your movements and patterns.',
        impact: [
          'Local service recommendations',
          'Maps and directions',
          'Geographic targeting'
        ],
        protection: 'Only enable when needed and disable in browser settings when possible.'
      }
    };

    // Default explanation if data type not found
    if (!sensitivityMap[dataType]) {
      return {
        explanation: `This data may be collected and used by the website.`,
        impact: ['Personalization', 'Service functionality', 'Potential data sharing'],
        protection: 'Provide only if you\'re comfortable sharing this information.'
      };
    }

    return sensitivityMap[dataType];
  }

  // Helper function to get tracker explanation
  function getTrackerInfo(trackerName, trackerType) {
    const trackerMap = {
      'Google Analytics': {
        explanation: 'Tracks your behavior on this website to analyze user patterns.',
        impact: [
          'Measures how you interact with the site',
          'Tracks pages visited and time spent',
          'May follow you across multiple sites'
        ],
        protection: 'You can block analytics trackers using privacy extensions.'
      },
      'Google Tag Manager': {
        explanation: 'A container that may load various tracking scripts.',
        impact: [
          'Can load multiple tracking technologies',
          'Centrally manages various tracking tags',
          'May dynamically add new trackers'
        ],
        protection: 'Blocking this may prevent multiple trackers from loading.'
      },
      'Facebook Pixel': {
        explanation: 'Tracks your activity to enable targeted Facebook ads.',
        impact: [
          'Links your browsing to your Facebook profile',
          'Powers ad retargeting on Facebook',
          'Tracks conversions from Facebook ads'
        ],
        protection: 'Ad blockers can typically block this tracker.'
      },
      'DoubleClick': {
        explanation: 'Google\'s advertising platform that tracks users for ad targeting.',
        impact: [
          'Powers personalized advertisements',
          'Tracks across many websites',
          'Builds advertising profiles'
        ],
        protection: 'Ad blockers and privacy extensions can block this.'
      },
      'Hotjar': {
        explanation: 'Records user sessions including mouse movements and clicks.',
        impact: [
          'May record your mouse movements',
          'Creates heatmaps of user activity',
          'May record form inputs (excluding sensitive fields)'
        ],
        protection: 'Privacy extensions can block these recording scripts.'
      },
      'Cookies': {
        explanation: 'Small data files stored in your browser to remember information.',
        impact: [
          'Maintain login sessions',
          'Remember preferences',
          'Track your browsing activity'
        ],
        protection: 'You can clear cookies regularly or use browser privacy settings.'
      }
    };

    // Handle general types if specific tracker not found
    if (!trackerMap[trackerName]) {
      const typeMap = {
        'Analytics': {
          explanation: 'Measures how users interact with the website.',
          impact: [
            'Tracks pages visited and actions taken',
            'Measures site performance',
            'Analyzes user behavior patterns'
          ],
          protection: 'Analytics blockers prevent this type of tracking.'
        },
        'Advertising': {
          explanation: 'Tracks your behavior to show targeted advertisements.',
          impact: [
            'Powers personalized ads',
            'May follow you across websites',
            'Builds advertising profiles'
          ],
          protection: 'Ad blockers can help prevent advertising trackers.'
        },
        'Social Media': {
          explanation: 'Connects your browsing with social media platforms.',
          impact: [
            'Links browsing to social profiles',
            'Enables social sharing features',
            'Powers social media widgets'
          ],
          protection: 'Social media blockers can prevent this tracking.'
        }
      };
      
      return typeMap[trackerType] || {
        explanation: 'This technology tracks certain aspects of your browsing behavior.',
        impact: ['Site functionality', 'User tracking', 'Data collection'],
        protection: 'Privacy browsers and extensions can help limit tracking.'
      };
    }

    return trackerMap[trackerName];
  }

  // Helper function to get fingerprinting information
  function getFingerprintingInfo(level) {
    return {
      explanation: 'Browser fingerprinting creates a unique profile of your device without cookies.',
      impact: [
        'Can identify you even when cookies are cleared',
        'Works across browsing sessions',
        'Difficult to detect and block completely'
      ],
      protection: 'Use browsers with anti-fingerprinting features like Firefox or Brave.',
      riskLevel: level
    };
  }

  // Helper function to get data sharing information
  function getDataSharingInfo(level, brokerCount) {
    return {
      explanation: 'This site appears to share data with third-party companies.',
      impact: [
        brokerCount > 0 ? `Connected to ${brokerCount} known data broker${brokerCount > 1 ? 's' : ''}` : 'Connected to third-party domains',
        'May combine your data across multiple sources',
        'Could build comprehensive profiles of your online activity'
      ],
      protection: 'Check privacy settings for data sharing opt-outs and consider data removal requests.',
      riskLevel: level
    };
  }

  // Add event listener for "Learn more" links
  document.addEventListener('click', function(event) {
    // Check if clicked element is a learn more link
    if (event.target.classList.contains('learn-more')) {
      event.preventDefault();
      
      const topic = event.target.textContent.replace('Learn more about ', '').replace(' privacy', '').trim();
      
      // Define privacy resources based on topic
      const privacyResources = {
        'email': 'https://www.consumer.ftc.gov/articles/0262-stopping-unsolicited-mail-phone-calls-and-email',
        'password': 'https://www.cisa.gov/secure-our-world/create-strong-passwords',
        'phone': 'https://www.consumer.ftc.gov/articles/how-recognize-and-report-spam-text-messages',
        'name': 'https://www.privacytools.io/guides/search-privacy',
        'address': 'https://www.consumer.ftc.gov/articles/0005-identity-theft',
        'birthdate': 'https://www.consumer.ftc.gov/articles/0005-identity-theft',
        'ssn': 'https://www.ssa.gov/pubs/EN-05-10220.pdf',
        'credit card': 'https://www.consumer.ftc.gov/articles/0213-lost-or-stolen-credit-atm-and-debit-cards',
        'consent': 'https://www.ftc.gov/business-guidance/privacy-security/privacy-choices-consumers',
        'location': 'https://www.consumer.ftc.gov/articles/how-protect-your-privacy-mobile-apps',
        'cookies': 'https://www.allaboutcookies.org/',
        'cookies and privacy': 'https://www.allaboutcookies.org/',
        'browser fingerprinting': 'https://www.eff.org/deeplinks/2010/05/every-browser-unique-results-fom-panopticlick',
        'data sharing and brokers': 'https://www.eff.org/issues/data-brokers',
        'Google Analytics': 'https://policies.google.com/technologies/partner-sites',
        'Facebook Pixel': 'https://www.facebook.com/business/learn/facebook-ads-pixel',
        'DoubleClick': 'https://support.google.com/displayvideo/answer/10106549?hl=en',
        'data brokers': 'https://www.eff.org/issues/data-brokers'
      };
      
      // Default resource if specific one not found
      let resourceUrl = 'https://www.privacytools.io/';
      
      // Check if we have a specific resource for this topic
      for (const key in privacyResources) {
        if (topic.toLowerCase().includes(key.toLowerCase())) {
          resourceUrl = privacyResources[key];
          break;
        }
      }
      
      // Open the resource in a new tab
      chrome.tabs.create({ url: resourceUrl });
    }
  });

  // Create the Data Flow Map visualization using D3.js
  function createDataFlowVisualization(data) {
    // Clear existing content
    const container = document.getElementById('data-flow-container');
    container.innerHTML = '';
    
    if (!data || !data.dataSharing || !data.dataSharing.dataCompanies || data.dataSharing.dataCompanies.length === 0) {
      container.innerHTML = `
        <div class="no-data-message">
          <p>No third-party data sharing detected on this page.</p>
          <p>This website doesn't appear to share your data with known data brokers or advertising networks.</p>
        </div>
      `;
      return;
    }
    
    // Set up the SVG container dimensions
    const width = container.clientWidth;
    const height = 350;
    
    // Create SVG element
    const svg = d3.select('#data-flow-container')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'data-flow-svg');
    
    // Create a group for the visualization
    const vizGroup = svg.append('g')
      .attr('transform', `translate(${width/2}, ${height/2})`);
    
    // Add the website in the center
    const website = { 
      id: 'website', 
      name: 'Current Website',
      type: 'Website',
      region: 'N/A',
      radius: 30,
      color: '#4CAF50'
    };
    
    // Prepare nodes
    const companies = data.dataSharing.dataCompanies.map((company, index) => ({
      id: company.name,
      name: company.name,
      type: company.type,
      region: company.region || 'Unknown',
      owner: company.owner,
      radius: 22,
      color: getCompanyColor(company.type),
      angle: (index * 2 * Math.PI) / data.dataSharing.dataCompanies.length
    }));
    
    const nodes = [website, ...companies];
    
    // Prepare links from website to each company
    const links = companies.map(company => ({
      source: 'website',
      target: company.id,
      value: 1
    }));
    
    // Add ownership connections as links
    if (data.dataSharing.connectedEntities) {
      data.dataSharing.connectedEntities.forEach(connection => {
        links.push({
          source: connection.from,
          target: connection.to,
          value: 0.5,
          dashed: true
        });
      });
    }
    
    // Position nodes in a circle around the center - reduce radius for more compact layout
    companies.forEach(company => {
      company.x = Math.cos(company.angle) * 110;
      company.y = Math.sin(company.angle) * 110;
    });
    website.x = 0;
    website.y = 0;
    
    // Create links
    const link = vizGroup.selectAll(".link")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d => {
        const source = nodes.find(n => n.id === d.source);
        const target = nodes.find(n => n.id === d.target);
        return `M${source.x},${source.y}L${target.x},${target.y}`;
      })
      .style("stroke", "#999")
      .style("stroke-opacity", 0.6)
      .style("stroke-width", d => d.value * 2)
      .style("stroke-dasharray", d => d.dashed ? "5,5" : "0")
      .style("marker-end", "url(#arrow)");
    
    // Add arrow marker for links
    svg.append("defs").selectAll("marker")
      .data(["arrow"])
      .enter().append("marker")
      .attr("id", d => d)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 12)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .style("fill", "#999");
    
    // Create node groups
    const node = vizGroup.selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // Add circles for nodes
    node.append("circle")
      .attr("r", d => d.radius)
      .style("fill", d => d.color)
      .style("stroke", "#fff")
      .style("stroke-width", 2);
    
    // Add text labels
    node.append("text")
      .attr("dy", d => d.id === 'website' ? 0 : 24 + d.radius)
      .style("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", d => d.id === 'website' ? "bold" : "normal")
      .text(d => {
        // Truncate long domain names
        const name = d.name;
        return name.length > 14 ? name.substring(0, 12) + '...' : name;
      });
    
    // Add type labels below name
    node.append("text")
      .attr("dy", d => d.id === 'website' ? 15 : 38 + d.radius)
      .style("text-anchor", "middle")
      .style("font-size", "9px")
      .style("fill", "#666")
      .text(d => d.type);
    
    // Add country/region flags or labels
    node.filter(d => d.id !== 'website')
      .append("text")
      .attr("dy", -5)
      .attr("dx", 0)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .text(d => getCountryEmoji(d.region));
    
    // Add tooltips
    node.append("title")
      .text(d => {
        if (d.id === 'website') {
          return `Your data is shared with ${companies.length} companies`;
        } else {
          return `${d.name}\nType: ${d.type}\nRegion: ${d.region}${d.owner ? '\nOwned by: ' + d.owner : ''}`;
        }
      });
    
    // Add interaction handlers
    function dragstarted(event, d) {
      if (!event.active) d3.forceSimulation().alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
      // Update links
      link.attr("d", l => {
        const source = l.source.id ? l.source : nodes.find(n => n.id === l.source);
        const target = l.target.id ? l.target : nodes.find(n => n.id === l.target);
        const sx = source.fx || source.x;
        const sy = source.fy || source.y;
        const tx = target.fx || target.x;
        const ty = target.fy || target.y;
        return `M${sx},${sy}L${tx},${ty}`;
      });
    }
    
    function dragended(event, d) {
      if (!event.active) d3.forceSimulation().alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Add a legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(10, 10)`);
    
    const legendTypes = [
      { type: "Website", color: "#4CAF50" },
      { type: "Data Broker", color: "#F44336" },
      { type: "Ad Platform", color: "#FFC107" },
      { type: "Data Management", color: "#2196F3" },
      { type: "Marketing Analytics", color: "#9C27B0" },
      { type: "Social Media", color: "#FF5722" }
    ];
    
    legend.selectAll(".legend-item")
      .data(legendTypes)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 15})`)
      .each(function(d) {
        d3.select(this)
          .append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", d.color);
        
        d3.select(this)
          .append("text")
          .attr("x", 16)
          .attr("y", 10)
          .style("font-size", "10px")
          .text(d.type);
      });
    
    // Add ownership connections legend
    legend.append("g")
      .attr("transform", `translate(0, ${legendTypes.length * 15 + 5})`)
      .call(function(g) {
        g.append("line")
          .attr("x1", 0)
          .attr("y1", 6)
          .attr("x2", 12)
          .attr("y2", 6)
          .style("stroke", "#999")
          .style("stroke-dasharray", "5,5");
        
        g.append("text")
          .attr("x", 16)
          .attr("y", 10)
          .style("font-size", "10px")
          .text("Same owner");
      });
  }
  
  // Helper function to get company color based on type
  function getCompanyColor(type) {
    const colorMap = {
      'Data Broker': '#F44336',
      'Ad Platform': '#FFC107',
      'Data Management': '#2196F3',
      'Marketing Analytics': '#9C27B0',
      'Identity Resolution': '#FF5722',
      'Cross-device Tracking': '#795548',
      'Ad Exchange': '#607D8B',
      'Social Media': '#FF5722',
      'Advertising': '#FFC107',
      'Search/Advertising': '#FFC107',
      'Technology': '#2196F3',
      'Professional Network': '#795548',
      'Video/Social': '#FF5722',
      'E-commerce': '#607D8B',
      'Messaging': '#00BCD4'
    };
    return colorMap[type] || '#999';
  }
  
  // Helper function to get country emoji
  function getCountryEmoji(region) {
    const countryMap = {
      'USA': '🇺🇸',
      'UK': '🇬🇧',
      'Norway': '🇳🇴',
      'China': '🇨🇳',
      'China/Singapore': '🇨🇳/🇸🇬',
      'EU': '🇪🇺',
      'Unknown': '❓'
    };
    return countryMap[region] || '❓';
  }
}); 