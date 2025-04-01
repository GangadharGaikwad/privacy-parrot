// Track if we've already analyzed this page
let pageAnalyzed = false;
let pageAnalysisResults = null;

// Global state
let cachedAnalysisResults = null;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzePagePrivacy') {
    try {
      // Check if this is a restricted page
      if (window.location.protocol === 'chrome:' || 
          window.location.protocol === 'chrome-extension:' ||
          window.location.protocol === 'devtools:' ||
          window.location.href.startsWith('https://chrome.google.com/webstore/')) {
        sendResponse({ 
          status: 'error', 
          message: 'Privacy analysis is not available on Chrome system pages.' 
        });
        return true;
      }
      
      // Use cached results if available
      if (cachedAnalysisResults) {
        console.log('Using cached analysis results');
        sendResponse({ status: 'success', data: cachedAnalysisResults });
        return true;
      }
      
      // Analyze the page privacy
      console.log('Starting privacy analysis...');
      const analysisData = analyzePagePrivacy();
      
      // Cache the results for future requests
      cachedAnalysisResults = analysisData;
      
      // Send results back to popup
      sendResponse({ status: 'success', data: analysisData });
    } catch (error) {
      console.error('Error analyzing page privacy:', error);
      sendResponse({ 
        status: 'error', 
        message: 'Error analyzing page: ' + error.message 
      });
    }
    return true; // Required for async response
  }
  return false; // Not handled
});

// Main function to analyze page privacy
function analyzePagePrivacy() {
  const dataPoints = detectDataCollectionPoints();
  const cookiesInfo = detectCookies();
  const trackersInfo = detectTrackers();
  const policyInfo = analyzePrivacyPolicy();
  const fingerprintingInfo = detectFingerprinting();
  const dataSharing = analyzeDataSharing();
  
  // Calculate overall risk level
  const riskLevel = calculateRiskLevel(dataPoints, cookiesInfo, trackersInfo, policyInfo, fingerprintingInfo, dataSharing);
  
  // Generate summary text
  const bottomLine = generateBottomLine(dataPoints, cookiesInfo, trackersInfo, policyInfo, fingerprintingInfo, dataSharing);
  
  // Generate protection tips
  const protectionTips = generateProtectionTips(riskLevel, dataPoints, cookiesInfo, trackersInfo, fingerprintingInfo, dataSharing);
  
  return {
    riskLevel,
    dataPoints,
    cookies: cookiesInfo,
    trackers: trackersInfo,
    policyInfo,
    fingerprinting: fingerprintingInfo,
    dataSharing: dataSharing,
    bottomLine,
    protectionTips,
    technicalDetails: {
      "URL": document.location.hostname,
      "HTTPS": document.location.protocol === 'https:' ? 'Yes' : 'No',
      "Form Fields": document.querySelectorAll('input').length,
      "Form Submissions": document.querySelectorAll('form').length,
      "External Scripts": document.querySelectorAll('script[src]').length,
      "iFrames": document.querySelectorAll('iframe').length,
      "Fingerprinting Risk": fingerprintingInfo.riskLevel,
      "Third-party Sharing": dataSharing.sharingLevel
    }
  };
}

// Detect form fields and other data collection points
function detectDataCollectionPoints() {
  const dataPoints = [];
  const knownDataTypes = [
    { 
      selectors: ['input[type="email"]', '[name*="email"]', '[id*="email"]', '[placeholder*="email" i]'],
      name: 'Email',
      sensitivity: 3
    },
    { 
      selectors: ['input[type="password"]', '[name*="password"]', '[id*="password"]', '[placeholder*="password" i]'],
      name: 'Password',
      sensitivity: 5
    },
    { 
      selectors: ['input[type="tel"]', '[name*="phone"]', '[id*="phone"]', '[placeholder*="phone" i]', '[placeholder*="mobile" i]'],
      name: 'Phone Number',
      sensitivity: 4
    },
    { 
      selectors: ['input[name*="name"]', 'input[id*="name"]', '[placeholder*="name" i]', 'input[name*="fname"]', 'input[name*="lname"]'],
      name: 'Name',
      sensitivity: 2
    },
    { 
      selectors: ['input[name*="address"]', 'input[id*="address"]', '[placeholder*="address" i]', '[name*="street"]', '[name*="zip"]', '[name*="postal"]'],
      name: 'Address',
      sensitivity: 4
    },
    { 
      selectors: ['input[name*="birth"]', 'input[id*="birth"]', '[placeholder*="birth" i]', '[name*="dob"]'],
      name: 'Birthdate',
      sensitivity: 4
    },
    { 
      selectors: ['input[name*="ssn"]', 'input[id*="ssn"]', '[placeholder*="social security" i]'],
      name: 'SSN',
      sensitivity: 5
    },
    { 
      selectors: ['input[name*="credit"]', 'input[id*="credit"]', '[name*="card"]', '[placeholder*="credit card" i]', '[name*="payment"]'],
      name: 'Credit Card',
      sensitivity: 5
    },
    { 
      selectors: ['input[type="checkbox"][name*="consent"]', '[id*="consent"]', '[id*="agree"]', '[id*="terms"]', '[name*="terms"]'],
      name: 'Consent',
      sensitivity: 2
    },
    { 
      selectors: ['button[type="location"]', '[name*="location"]', '[id*="location"]', '[name*="geoloc"]'],
      name: 'Location',
      sensitivity: 4
    }
  ];

  // Check each data type
  knownDataTypes.forEach(dataType => {
    const selector = dataType.selectors.join(', ');
    const elements = document.querySelectorAll(selector);
    
    if (elements.length > 0) {
      dataPoints.push({
        name: dataType.name,
        count: elements.length,
        sensitivity: dataType.sensitivity
      });
    }
  });

  return dataPoints;
}

// Detect cookies (simplified - in a real extension this would use Chrome's cookies API)
function detectCookies() {
  // Get cookies from document.cookie
  const cookies = document.cookie.split(';');
  
  // Simple heuristic to identify tracking cookies
  const trackingKeywords = ['track', 'analytic', 'pixel', 'ad', 'visitor', 'session', 'uid', 'id'];
  let trackingCount = 0;
  
  cookies.forEach(cookie => {
    const cookieName = cookie.split('=')[0].trim().toLowerCase();
    if (trackingKeywords.some(keyword => cookieName.includes(keyword))) {
      trackingCount++;
    }
  });
  
  return {
    total: cookies.length,
    tracking: trackingCount
  };
}

// Detect common trackers (simplified - real implementation would be more comprehensive)
function detectTrackers() {
  const trackers = [];
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  
  // Common tracker URLs
  const knownTrackers = [
    { url: 'google-analytics.com', name: 'Google Analytics', type: 'Analytics' },
    { url: 'googletagmanager.com', name: 'Google Tag Manager', type: 'Tag Manager' },
    { url: 'facebook.net', name: 'Facebook Pixel', type: 'Social Media' },
    { url: 'fbcdn.net', name: 'Facebook CDN', type: 'Social Media' },
    { url: 'twitter.com', name: 'Twitter', type: 'Social Media' },
    { url: 'doubleclick.net', name: 'DoubleClick', type: 'Advertising' },
    { url: 'googlesyndication.com', name: 'Google Ads', type: 'Advertising' },
    { url: 'adnxs.com', name: 'AppNexus', type: 'Advertising' },
    { url: 'hotjar.com', name: 'Hotjar', type: 'Analytics' },
    { url: 'mathtag.com', name: 'MediaMath', type: 'Advertising' }
  ];
  
  // Check script sources for known trackers
  scripts.forEach(script => {
    const src = script.src.toLowerCase();
    
    knownTrackers.forEach(tracker => {
      if (src.includes(tracker.url) && !trackers.some(t => t.name === tracker.name)) {
        trackers.push(tracker);
      }
    });
  });
  
  // Also check iframes
  const iframes = Array.from(document.querySelectorAll('iframe'));
  
  iframes.forEach(iframe => {
    const src = iframe.src.toLowerCase();
    
    knownTrackers.forEach(tracker => {
      if (src.includes(tracker.url) && !trackers.some(t => t.name === tracker.name)) {
        trackers.push(tracker);
      }
    });
  });
  
  return trackers;
}

// Analyze privacy policy (simplified - real implementation would be more sophisticated)
function analyzePrivacyPolicy() {
  // Look for privacy policy or terms links
  const policyLinks = Array.from(document.querySelectorAll('a')).filter(link => {
    const text = link.textContent.toLowerCase();
    const href = link.href.toLowerCase();
    return text.includes('privacy') || text.includes('terms') || 
           href.includes('privacy') || href.includes('terms');
  });
  
  // Check for GDPR/CCPA mentions
  const pageText = document.body.innerText.toLowerCase();
  const containsGDPR = pageText.includes('gdpr') || pageText.includes('general data protection');
  const containsCCPA = pageText.includes('ccpa') || pageText.includes('california consumer privacy');
  
  // Check for cookie consent dialog
  const potentialConsentElements = Array.from(document.querySelectorAll('div, section, aside')).filter(el => {
    const text = el.innerText.toLowerCase();
    return (text.includes('cookie') || text.includes('consent') || text.includes('privacy')) &&
           (text.includes('accept') || text.includes('agree') || text.includes('allow'));
  });
  
  return {
    hasPrivacyPolicy: policyLinks.length > 0,
    referencesGDPR: containsGDPR,
    referencesCCPA: containsCCPA,
    hasCookieConsent: potentialConsentElements.length > 0
  };
}

// New function to detect browser fingerprinting techniques
function detectFingerprinting() {
  const scripts = Array.from(document.querySelectorAll('script'));
  const inlineScripts = scripts.filter(script => !script.src);
  const scriptContents = inlineScripts.map(script => script.textContent).join(' ');
  
  // Keywords that suggest fingerprinting
  const fingerprintingPatterns = [
    // Canvas fingerprinting
    'canvas.toDataURL', 'createImageData', 'getImageData',
    // Font detection
    'measureText', 'FontFace',
    // WebGL fingerprinting
    'getParameter', 'WebGLRenderingContext',
    // Audio fingerprinting
    'AudioContext', 'OscillatorNode', 'createAnalyser',
    // Navigator properties
    'navigator.userAgent', 'navigator.plugins', 'navigator.mimeTypes',
    // Advanced fingerprinting libraries
    'fingerprintjs', 'clientjs'
  ];
  
  // Check for fingerprinting patterns in inline scripts
  const detectedPatterns = fingerprintingPatterns.filter(pattern => 
    scriptContents.includes(pattern)
  );
  
  // Check for script sources that are known for fingerprinting
  const knownFingerprintingSources = [
    'fingerprintjs.com',
    'amplitude.com',
    'mixpanel.com'
  ];
  
  const externalScripts = scripts.filter(script => script.src);
  const detectedSources = knownFingerprintingSources.filter(source => 
    externalScripts.some(script => script.src.includes(source))
  );
  
  // Calculate risk level based on detected fingerprinting techniques
  let riskLevel = 'low';
  if (detectedPatterns.length > 5 || detectedSources.length > 0) {
    riskLevel = 'high';
  } else if (detectedPatterns.length > 2) {
    riskLevel = 'medium';
  }
  
  return {
    detected: detectedPatterns.length > 0 || detectedSources.length > 0,
    techniques: detectedPatterns,
    sources: detectedSources,
    riskLevel: riskLevel
  };
}

// New function to analyze third-party data sharing
function analyzeDataSharing() {
  // Check network requests to third-party domains
  const links = Array.from(document.querySelectorAll('a[href], link[href], script[src], img[src], iframe[src]'));
  const currentDomain = document.location.hostname;
  
  // Extract domains from links and scripts
  const domains = links.map(element => {
    try {
      const attributeValue = element.href || element.src;
      if (!attributeValue) return null;
      
      const url = new URL(attributeValue, document.location.href);
      return url.hostname;
    } catch (e) {
      return null;
    }
  }).filter(domain => domain && domain !== currentDomain);
  
  // Remove duplicates
  const uniqueDomains = [...new Set(domains)];
  
  // Known data sharing/aggregation companies
  const dataSharingCompanies = [
    { domain: 'acxiom.com', name: 'Acxiom', type: 'Data Broker' },
    { domain: 'oracle.com', name: 'Oracle Data Cloud', type: 'Data Broker' },
    { domain: 'epsilon.com', name: 'Epsilon', type: 'Data Broker' },
    { domain: 'experian.com', name: 'Experian', type: 'Data Broker' },
    { domain: 'equifax.com', name: 'Equifax', type: 'Data Broker' },
    { domain: 'liveramp.com', name: 'LiveRamp', type: 'Identity Resolution' },
    { domain: 'tapad.com', name: 'Tapad', type: 'Cross-device Tracking' },
    { domain: 'neustar.biz', name: 'Neustar', type: 'Marketing Analytics' },
    { domain: 'salesforce.com', name: 'Salesforce DMP', type: 'Data Management' },
    { domain: 'adobe.com', name: 'Adobe Audience Manager', type: 'Data Management' },
    { domain: 'thetradedesk.com', name: 'The Trade Desk', type: 'Ad Platform' },
    { domain: 'mediamath.com', name: 'MediaMath', type: 'Ad Platform' },
    { domain: 'appnexus.com', name: 'AppNexus', type: 'Ad Exchange' },
    { domain: 'facebook.com', name: 'Facebook', type: 'Social Media' },
    { domain: 'fb.com', name: 'Facebook', type: 'Social Media' },
    { domain: 'instagram.com', name: 'Instagram', type: 'Social Media' },
    { domain: 'whatsapp.com', name: 'WhatsApp', type: 'Messaging' },
    { domain: 'google.com', name: 'Google', type: 'Search/Advertising' },
    { domain: 'google-analytics.com', name: 'Google Analytics', type: 'Analytics' },
    { domain: 'doubleclick.net', name: 'DoubleClick', type: 'Advertising' },
    { domain: 'youtube.com', name: 'YouTube', type: 'Video/Social' },
    { domain: 'amazon.com', name: 'Amazon', type: 'E-commerce' },
    { domain: 'amazon-adsystem.com', name: 'Amazon Ads', type: 'Advertising' },
    { domain: 'twitter.com', name: 'Twitter', type: 'Social Media' },
    { domain: 'linkedin.com', name: 'LinkedIn', type: 'Professional Network' },
    { domain: 'microsoft.com', name: 'Microsoft', type: 'Technology' },
    { domain: 'tiktok.com', name: 'TikTok', type: 'Social Media' }
  ];
  
  // Add country/region information for data residency
  const companyRegions = {
    'acxiom.com': 'USA',
    'oracle.com': 'USA',
    'epsilon.com': 'USA',
    'experian.com': 'UK',
    'equifax.com': 'USA',
    'liveramp.com': 'USA',
    'tapad.com': 'Norway',
    'neustar.biz': 'USA',
    'salesforce.com': 'USA',
    'adobe.com': 'USA',
    'thetradedesk.com': 'USA',
    'mediamath.com': 'USA',
    'appnexus.com': 'USA',
    'facebook.com': 'USA',
    'fb.com': 'USA',
    'instagram.com': 'USA',
    'whatsapp.com': 'USA',
    'google.com': 'USA',
    'google-analytics.com': 'USA',
    'doubleclick.net': 'USA',
    'youtube.com': 'USA',
    'amazon.com': 'USA',
    'amazon-adsystem.com': 'USA',
    'twitter.com': 'USA',
    'linkedin.com': 'USA',
    'microsoft.com': 'USA',
    'tiktok.com': 'China/Singapore'
  };
  
  // Add corporate ownership relationships
  const ownershipConnections = [
    { parent: 'Meta', subsidiaries: ['instagram.com', 'whatsapp.com', 'fb.com', 'facebook.com'] },
    { parent: 'Alphabet', subsidiaries: ['google-analytics.com', 'doubleclick.net', 'youtube.com', 'google.com'] },
    { parent: 'Amazon', subsidiaries: ['amazon-adsystem.com', 'amazon.com'] },
    { parent: 'Microsoft', subsidiaries: ['linkedin.com', 'microsoft.com'] },
    { parent: 'ByteDance', subsidiaries: ['tiktok.com'] },
    { parent: 'Oracle', subsidiaries: ['oracle.com', 'bluekai.com'] }
  ];
  
  // Detect known data sharing companies on the page
  const detectedDataCompanies = dataSharingCompanies.filter(company => {
    return uniqueDomains.some(domain => domain.includes(company.domain));
  });
  
  // Enhance detected data companies with region and ownership information
  const enhancedDataCompanies = detectedDataCompanies.map(company => {
    // Add region information
    const region = companyRegions[company.domain] || 'Unknown';
    
    // Find ownership connection
    let owner = null;
    for (const connection of ownershipConnections) {
      if (connection.subsidiaries.some(sub => company.domain.includes(sub))) {
        owner = connection.parent;
        break;
      }
    }
    
    return {
      ...company,
      region,
      owner
    };
  });
  
  // Find connected entities (same owner)
  const connectedEntities = [];
  
  // Group by owner
  const ownerGroups = {};
  enhancedDataCompanies.forEach(company => {
    if (company.owner) {
      if (!ownerGroups[company.owner]) {
        ownerGroups[company.owner] = [];
      }
      ownerGroups[company.owner].push(company);
    }
  });
  
  // Create connections for companies with the same owner
  Object.values(ownerGroups).forEach(group => {
    if (group.length > 1) {
      for (let i = 0; i < group.length - 1; i++) {
        connectedEntities.push({
          from: group[i].name,
          to: group[i+1].name,
          relationship: 'Same parent company'
        });
      }
    }
  });
  
  // Parse privacy policy for data sharing mentions
  const policyText = findPrivacyPolicyText();
  const dataSharingKeywords = [
    'share your information', 
    'share your data', 
    'third part', 
    'third-part',
    'data broker',
    'data provider',
    'marketing partner',
    'advertising partner',
    'affiliate',
    'subsidiary',
    'data processing'
  ];
  
  const hasDataSharingInPolicy = dataSharingKeywords.some(keyword => 
    policyText.toLowerCase().includes(keyword)
  );
  
  // Calculate data sharing level
  let sharingLevel = 'low';
  if (detectedDataCompanies.length > 3 || 
      (detectedDataCompanies.length > 0 && hasDataSharingInPolicy)) {
    sharingLevel = 'high';
  } else if (detectedDataCompanies.length > 0 || hasDataSharingInPolicy) {
    sharingLevel = 'medium';
  }
  
  return {
    thirdPartyDomains: uniqueDomains.length,
    dataCompanies: enhancedDataCompanies,
    connectedEntities: connectedEntities,
    mentionsInPolicy: hasDataSharingInPolicy,
    sharingLevel: sharingLevel
  };
}

// Helper function to find and extract privacy policy text
function findPrivacyPolicyText() {
  // Try to find privacy policy link
  const privacyLinks = Array.from(document.querySelectorAll('a')).filter(link => {
    const text = link.textContent.toLowerCase();
    const href = link.href.toLowerCase();
    return text.includes('privacy') || href.includes('privacy');
  });
  
  // If we're on a privacy policy page, extract the text
  if (document.location.href.toLowerCase().includes('privacy') ||
      document.title.toLowerCase().includes('privacy policy')) {
    // Try to get main content
    const mainContent = document.querySelector('main') || 
                       document.querySelector('article') || 
                       document.querySelector('.content') ||
                       document.body;
    return mainContent.innerText;
  }
  
  // Otherwise return empty text
  return '';
}

// Update risk level calculation
function calculateRiskLevel(dataPoints, cookiesInfo, trackersInfo, policyInfo, fingerprintingInfo, dataSharing) {
  let riskScore = 0;
  
  // Risk from data collection
  dataPoints.forEach(point => {
    riskScore += point.sensitivity;
  });
  
  // Risk from cookies/trackers
  riskScore += cookiesInfo.tracking * 1.5;
  riskScore += trackersInfo.length * 2;
  
  // Risk from fingerprinting
  if (fingerprintingInfo.riskLevel === 'high') {
    riskScore += 10;
  } else if (fingerprintingInfo.riskLevel === 'medium') {
    riskScore += 5;
  }
  
  // Risk from data sharing
  if (dataSharing.sharingLevel === 'high') {
    riskScore += 8;
  } else if (dataSharing.sharingLevel === 'medium') {
    riskScore += 4;
  }
  
  // Mitigating factors from privacy policy
  if (policyInfo.hasPrivacyPolicy) riskScore -= 2;
  if (policyInfo.referencesGDPR || policyInfo.referencesCCPA) riskScore -= 3;
  if (policyInfo.hasCookieConsent) riskScore -= 2;
  
  // Determine risk level
  if (riskScore < 5) return 'low';
  if (riskScore < 15) return 'medium';
  return 'high';
}

// Update bottom line generation
function generateBottomLine(dataPoints, cookiesInfo, trackersInfo, policyInfo, fingerprintingInfo, dataSharing) {
  let pagePurpose = inferPagePurpose();
  let dataUse = inferDataUsage(dataPoints, trackersInfo, policyInfo);
  let fingerprintingWarning = '';
  let dataSharingWarning = '';
  
  if (fingerprintingInfo.detected && fingerprintingInfo.riskLevel === 'high') {
    fingerprintingWarning = ' It uses advanced fingerprinting to track you across websites.';
  }
  
  if (dataSharing.sharingLevel === 'high') {
    dataSharingWarning = ` It likely shares your data with ${dataSharing.dataCompanies.length} third-party data brokers.`;
  } else if (dataSharing.sharingLevel === 'medium') {
    dataSharingWarning = ' It appears to share data with third parties.';
  }
  
  return `This ${pagePurpose} ${dataUse}.${fingerprintingWarning}${dataSharingWarning}`;
}

// Infer page purpose
function inferPagePurpose() {
  const text = document.body.innerText.toLowerCase();
  const url = document.location.href.toLowerCase();
  
  // E-commerce detection.
  if (text.includes('add to cart') || text.includes('checkout') || text.includes('shop now') ||
      document.querySelectorAll('button[type="submit"], input[type="submit"]').length > 3) {
    return 'store wants your data to process orders';
  }
  
  // News/blogs
  if (document.querySelectorAll('article').length > 0 || 
      document.querySelectorAll('time, .date, .published').length > 0) {
    return 'site collects data for targeting content';
  }
  
  // Social media
  if (text.includes('profile') || text.includes('follow') || text.includes('friend') ||
      text.includes('connect') || text.includes('share')) {
    return 'platform collects data to build your profile';
  }
  
  // Generic
  return 'site collects your data';
}

// Infer data usage
function inferDataUsage(dataPoints, trackersInfo, policyInfo) {
  const hasMarketingTrackers = trackersInfo.some(t => t.type === 'Advertising');
  const hasHighSensitivityData = dataPoints.some(d => d.sensitivity >= 4);
  
  if (hasMarketingTrackers && hasHighSensitivityData) {
    return 'and shares it with advertising networks';
  } else if (hasMarketingTrackers) {
    return 'for marketing purposes';
  } else if (hasHighSensitivityData) {
    return 'for its services and may share it with partners';
  } else {
    return 'to provide its service';
  }
}

// Update protection tips
function generateProtectionTips(riskLevel, dataPoints, cookiesInfo, trackersInfo, fingerprintingInfo, dataSharing) {
  const tips = [];
  
  // Basic tips for everyone
  tips.push('Consider using a privacy-focused browser extension like uBlock Origin or Privacy Badger');
  
  // Based on risk level
  if (riskLevel === 'high') {
    tips.push('Use a temporary or disposable email service for non-critical accounts');
    tips.push('Be cautious about sharing sensitive information on this site');
  }
  
  // Based on data collection
  if (dataPoints.some(d => d.name === 'Email')) {
    tips.push('Consider using an email alias service for signup');
  }
  
  if (dataPoints.some(d => d.name === 'Credit Card')) {
    tips.push('Check if your bank offers virtual card numbers for online payments');
  }
  
  if (dataPoints.some(d => d.name === 'Location')) {
    tips.push('Disable precise location sharing in your browser settings');
  }
  
  // Based on tracking
  if (cookiesInfo.tracking > 3 || trackersInfo.length > 3) {
    tips.push('Consider using privacy mode or clearing cookies after visiting this site');
  }
  
  // Based on fingerprinting
  if (fingerprintingInfo.detected) {
    tips.push('Use a browser with fingerprinting protection like Firefox or Brave');
    if (fingerprintingInfo.riskLevel === 'high') {
      tips.push('Consider using the Canvas Blocker extension to prevent browser fingerprinting');
    }
  }
  
  // Based on data sharing
  if (dataSharing.sharingLevel === 'high') {
    tips.push('Consider opting out of data sharing through the privacy settings');
    tips.push('Check if the site offers a "Do Not Sell My Data" option (required by CCPA)');
  } else if (dataSharing.sharingLevel === 'medium') {
    tips.push('Review the privacy policy to understand how your data is shared');
  }
  
  return tips.slice(0, 3); // Return max 3 tips to avoid overwhelming
} 