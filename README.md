# Privacy Parrot Chrome Extension

A privacy assistant that automatically analyzes webpages and explains their data practices in simple, human-readable language.

## Features

- **Instant Privacy Snapshot**: One-click analysis of website privacy practices
- **Visual Risk Indicators**: Color-coded risk levels with simple icons
- **Plain Language Explanations**: Human-readable privacy summaries
- **Protection Tips**: Actionable advice based on detected privacy risks

## Installation

### Option 1: Install from Chrome Web Store
*Coming soon*

### Option 2: Manual Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing this extension
5. The Privacy Parrot icon should appear in your browser toolbar

## Usage

1. Visit any website you want to analyze
2. Click the Privacy Parrot icon in your browser toolbar
3. Review the instant privacy snapshot with:
   - Data collection points
   - Tracking summary
   - Bottom-line explanation
4. Click "Show Protection Tips" to see personalized privacy recommendations
5. Click "Technical Details" to view more in-depth information

## Development

### Prerequisites
- Basic knowledge of HTML, CSS, and JavaScript
- Chrome browser

### Project Structure
- `manifest.json`: Extension configuration
- `popup.html` & `css/popup.css`: UI for the popup
- `js/popup.js`: Controls the popup interface
- `content.js`: Analyzes page content
- `background.js`: Handles background tasks
- `icons/`: Extension icons

### Adding Custom Analysis Algorithms

The extension is designed to be modular, allowing you to add new analysis capabilities. Here's how to add your own algorithm:

1. **Identify the analysis category**:
   - Data collection detection
   - Tracking scripts detection
   - Privacy policy analysis
   - User fingerprinting
   - Third-party data sharing
   - Custom category

2. **Create a new detection function** in `content.js`:
   ```javascript
   function detectYourNewFeature() {
     // Implement your analysis logic
     // ...
     
     return {
       // Return structured data about your findings
       detected: true,
       riskLevel: 'medium', // Use consistent risk levels: low, medium, high
       details: {...}
     };
   }
   ```

3. **Update the main analysis function** in `content.js`:
   ```javascript
   function analyzePagePrivacy() {
     // Add your new function call
     const yourFeatureInfo = detectYourNewFeature();
     
     // Add to risk calculation
     const riskLevel = calculateRiskLevel(..., yourFeatureInfo);
     
     // Add to results object
     return {
       // Existing data...
       yourFeature: yourFeatureInfo,
       // Update technical details
       technicalDetails: {
         // Existing details...
         "Your Feature": yourFeatureInfo.riskLevel
       }
     };
   }
   ```

4. **Update risk calculation** to include your feature:
   ```javascript
   function calculateRiskLevel(..., yourFeatureInfo) {
     // Existing risk calculation...
     
     // Add risk from your feature
     if (yourFeatureInfo.riskLevel === 'high') {
       riskScore += 8;
     } else if (yourFeatureInfo.riskLevel === 'medium') {
       riskScore += 4;
     }
     
     // Return overall risk level
   }
   ```

5. **Update user-facing content**:
   - Modify `generateBottomLine()` to include insights from your analysis
   - Add relevant protection tips in `generateProtectionTips()`
   - Update `popup.js` to display your findings in the UI

6. **Test thoroughly** on various websites to ensure your algorithm works correctly

### Testing
1. Make your changes to the code
2. Go to `chrome://extensions/` and click the refresh icon on the extension
3. Test the extension on various websites

## Privacy Guarantee

This extension:
- Works entirely locally on your device
- Does not send any browsing data to remote servers
- Does not track, store, or share your browsing history
- Is completely open source for transparency

## License

MIT License

## Contact

For questions, suggestions, or issues, please open an issue on the GitHub repository.#   p r i v a c y - p a r r o t  
 