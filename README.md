# 💧 HydroTracker - Water Consumption Tracker

A modern, beautiful web application for tracking daily water consumption with an intuitive UI/UX design.

![HydroTracker](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- **Beautiful UI/UX**: Modern gradient design with smooth animations
- **Water Tracking**: Easy-to-use interface to log water consumption
- **Visual Progress**: Animated water glass showing daily progress
- **Quick Add Buttons**: Pre-set amounts (250ml, 500ml, 750ml) for fast tracking
- **Custom Amounts**: Add any custom amount of water
- **Daily Goals**: Customizable daily water intake goals
- **Statistics Dashboard**:
  - Current streak tracking
  - Average daily consumption
  - Goals reached counter
  - Best streak record
- **Weekly Chart**: Visual representation of the last 7 days
- **Activity Log**: Timeline of today's water intake
- **Data Persistence**: All data saved locally in browser
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Celebration Animation**: Fun confetti when you reach your daily goal

## 🚀 Quick Start

### Option 1: Open Directly
Simply open `index.html` in your web browser. That's it!

### Option 2: Local Server (Recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📦 Deployment Options

### Deploy to Netlify

1. **Drag & Drop Method:**
   - Go to [Netlify Drop](https://app.netlify.com/drop)
   - Drag and drop the entire project folder
   - Your site is live!

2. **Git Method:**
   ```bash
   # Initialize git repository
   git init
   git add .
   git commit -m "Initial commit"
   
   # Push to GitHub
   git remote add origin <your-repo-url>
   git push -u origin main
   
   # Connect to Netlify and deploy
   ```

### Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Follow the prompts** and your site will be live!

### Deploy to GitHub Pages

1. **Create a GitHub repository**

2. **Push your code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Select "main" branch as source
   - Click Save
   - Your site will be available at `https://yourusername.github.io/repository-name`

### Deploy to Firebase Hosting

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login and initialize:**
   ```bash
   firebase login
   firebase init hosting
   ```

3. **Deploy:**
   ```bash
   firebase deploy
   ```

## 📱 Usage

1. **Set Your Goal**: Click the settings icon to set your daily water goal (default: 2000ml)

2. **Track Water**: 
   - Use quick add buttons for common amounts
   - Enter custom amounts for precise tracking
   - Press Enter in the custom input for quick adding

3. **Monitor Progress**:
   - Watch the animated water glass fill up
   - Check your percentage and current amount
   - View today's activity timeline

4. **View Statistics**:
   - Track your current streak
   - See average daily consumption
   - Monitor goals reached
   - Check your best streak

5. **Weekly Overview**: Review your hydration pattern in the weekly chart

## 🎨 Customization

### Change Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary: #4facfe;
    --primary-dark: #00bcd4;
    --secondary: #667eea;
    /* ... more variables */
}
```

### Adjust Daily Goal Limits
Edit the input range in `index.html`:
```html
<input type="number" id="dailyGoal" min="500" max="10000" step="100" value="2000">
```

### Modify Quick Add Buttons
Edit the button amounts in `index.html`:
```html
<button class="quick-btn" data-amount="250">250ml</button>
```

## 🛠️ Technical Details

- **Pure Vanilla JavaScript**: No frameworks required
- **HTML5 Canvas**: For chart visualization
- **CSS3 Animations**: Smooth transitions and effects
- **LocalStorage API**: For data persistence
- **Responsive Grid Layout**: CSS Grid and Flexbox
- **Modern ES6+**: Clean, modern JavaScript code

## 📊 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 📂 File Structure

```
hydrotracker/
├── index.html          # Main HTML file
├── styles.css          # All styles and animations
├── app.js              # Application logic
├── package.json        # Project configuration
└── README.md           # Documentation
```

## 🔒 Privacy

All data is stored locally in your browser using LocalStorage. No data is sent to any server or third party. Your hydration data stays private on your device.

## 🐛 Troubleshooting

**Data not saving?**
- Check if cookies/localStorage is enabled in your browser
- Try clearing browser cache and refreshing

**Chart not displaying?**
- Ensure JavaScript is enabled
- Try a different browser

**Reset not working?**
- Clear browser's LocalStorage manually
- Open Developer Console → Application → LocalStorage → Delete

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Feel free to fork, modify, and submit pull requests. All contributions are welcome!

## 💡 Future Enhancements

- Dark mode support
- Multiple drink types (coffee, tea, juice)
- Reminders and notifications
- Export data to CSV
- Cloud sync across devices
- Mobile app version

## 📧 Support

For issues or questions, please open an issue on the GitHub repository.

---

**Stay hydrated! 💧**

Made with ❤️ for better health
