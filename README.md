# Explain It to Me - AI Text Simplifier

A beautiful Chrome extension that transforms complex web content into clear, understandable explanations using AI technology.

## ✨ Features

- 🎯 **Smart Text Selection**: Highlight any text on any webpage
- 🎓 **4 Intelligence Levels**: 
  - 🎈 **Kid-Friendly**: Simple explanations like you're 5 years old
  - 🎓 **High School**: Clear language with academic vocabulary  
  - 🏛️ **College**: Detailed analysis with nuanced insights
  - 🔬 **Expert**: Technical terminology and comprehensive analysis
- 🤖 **AI-Powered**: Uses advanced language models for intelligent explanations
- 💾 **Smart Memory**: Remembers your preferred explanation level
- 🔒 **Privacy-First**: Secure and private by design
- ✨ **Beautiful UI**: Modern interface with smooth animations
- 📊 **Usage Statistics**: Track your learning journey

## 🚀 Installation

1. **Download Extension**
   - Clone or download this repository
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the extension folder

2. **Add Icons** (Required)
   - Create PNG icons in the `/icons` folder:
     - `icon16.png` (16x16 pixels)
     - `icon32.png` (32x32 pixels) 
     - `icon48.png` (48x48 pixels)
     - `icon128.png` (128x128 pixels)

3. **Configure API** (Developer Setup)
   - Open `background.js`
   - Replace `YOUR_PRECONFIGURED_API_KEY_HERE` with your actual ChatGPT API key
   - The extension is now ready to use!

## 🎯 How to Use

1. **Select Text**: Highlight any text on a webpage
2. **Right-Click**: Choose "✨ Explain It to Me" from the context menu
3. **Pick Level**: Select your preferred explanation style:
   - 🎈 **Kid-Friendly**: Fun, simple explanations with analogies
   - 🎓 **High School**: Clear language with modern examples
   - 🏛️ **College**: Thorough explanations with academic depth
   - 🔬 **Expert**: Technical analysis with professional insights
4. **Learn**: Read the AI-generated explanation in a beautiful modal

## 🎨 Design Features

- **Modern UI**: Clean, professional interface with gradient backgrounds
- **Smooth Animations**: Elegant transitions and hover effects
- **Responsive Design**: Works perfectly on all screen sizes
- **Beautiful Modals**: Stunning explanation popups with blur effects
- **Smart Typography**: Optimized readability with proper hierarchy
- **Accessibility**: Keyboard navigation and screen reader support

## 🔧 Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: `activeTab`, `contextMenus`, `storage`
- **AI Integration**: ChatGPT API for intelligent text processing
- **Storage**: Chrome local storage for user preferences
- **Framework**: Vanilla JavaScript with modern CSS

## 📁 Project Structure

```
explain-it-to-me/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API calls
├── content.js            # Content script for webpage interaction
├── content.css           # Beautiful modal styles
├── popup.html            # Settings popup interface
├── popup.css             # Enhanced popup styling
├── popup.js              # Popup functionality with statistics
├── icons/                # Extension icons (add PNG files)
└── README.md            # Documentation
```

## 🛡️ Privacy & Security

- ✅ **Local Storage**: All preferences stored locally in Chrome
- ✅ **Secure API**: Encrypted communication with AI services
- ✅ **No Tracking**: Zero analytics or user tracking
- ✅ **Open Source**: Transparent, auditable code
- ✅ **Minimal Permissions**: Only essential browser permissions

## 🎯 Key Improvements in v2.0

- **Enhanced UI**: Completely redesigned with modern gradients and animations
- **Pre-configured API**: No user setup required for API keys
- **Usage Statistics**: Track explanations and favorite levels
- **Better UX**: Improved loading states and error handling
- **Mobile Responsive**: Perfect experience on all devices
- **Accessibility**: Enhanced keyboard and screen reader support

## 🚀 Development

The extension uses modern Chrome Extension Manifest V3 with:
- Service worker for background processing
- Content scripts for seamless webpage integration
- Chrome storage for persistent user preferences
- Context menus for intuitive user interaction
- Advanced CSS with animations and gradients

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper testing
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

MIT License - feel free to use, modify, and distribute as needed.

## 🆘 Support

If you encounter any issues:

1. **Check API Configuration**: Ensure the API key is properly set in `background.js`
2. **Verify Permissions**: Make sure the extension has necessary browser permissions
3. **Console Logs**: Check browser console for any error messages
4. **Reload Extension**: Try disabling and re-enabling the extension
5. **Clear Storage**: Reset extension data in Chrome settings if needed

## 🌟 Features Coming Soon

- 📱 **Mobile App**: Native mobile version
- 🌍 **Multi-language**: Support for multiple languages
- 🎨 **Themes**: Customizable color themes
- 📚 **History**: Save and revisit past explanations
- 🔗 **Sharing**: Share explanations with others

---

Made with ❤️ for better web content understanding

**Transform complex text into clear knowledge - one explanation at a time!** ✨