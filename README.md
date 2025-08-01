# 🎲 Game Night Stats

A comprehensive web application for tracking and analyzing board game statistics across multiple game nights. Perfect for game groups who want to keep detailed records of their gaming sessions, player performance, and game preferences.

![Game Night Stats](https://img.shields.io/badge/status-active-brightgreen) ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black) ![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?logo=bootstrap&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## 🚀 Features

### 📊 **Player Statistics**
- Track wins, total plays, and win percentages for each player
- Calculate "Players Defeated" metric for competitive analysis
- Weighted win system based on game complexity (Light/Medium/Heavy)
- Filter statistics by date ranges (current month, previous month, year-to-date, custom ranges)

### 🎮 **Game Management**
- Add new games with tier classifications (Light, Medium, Heavy)
- Track high score vs. low score winning conditions
- Automatic best score tracking with player attribution
- Game popularity metrics (total plays, win distribution)

### 📝 **Play Tracking**
- Record detailed game sessions with multiple players
- Track player rankings and scores for each game
- DateTime tracking for historical analysis
- Edit/delete erroneous entries with automatic stat recalculation

### 📱 **Responsive Design**
- Mobile-optimized interface with adaptive column hiding
- Touch-friendly delete buttons and form controls
- Responsive tables that scale from 6 columns (desktop) to 2-3 columns (mobile)
- Bootstrap-powered responsive containers

### 🎯 **Special Features**
- **Random Player Picker**: Select starting players fairly with exclusion logic
- **Smart Validation**: Form validation with visual feedback
- **Auto-refresh**: Tables update immediately after data changes
- **Best Score Tracking**: Automatic recalculation when plays are deleted
- **Date Range Filtering**: Custom date ranges with intuitive picker

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 4.5.2
- **Database**: Firebase Firestore (NoSQL)
- **Hosting**: Firebase Hosting
- **Build/Deploy**: GitHub Actions
- **Additional Libraries**:
  - jQuery 3.5.1
  - DataTables (for sortable tables)
  - Select2 (enhanced dropdowns)
  - Moment.js & Bootstrap DateRangePicker
  - Firebase SDK v10.7.1

## 📁 Project Structure

```
game_night/
├── public/
│   ├── index.html          # Main application HTML
│   └── scripts.js          # Core JavaScript functionality
├── .github/
│   └── workflows/
│       └── firebase-hosting.yml  # Auto-deployment workflow
├── firebase.json           # Firebase configuration
├── firestore.rules        # Database security rules
├── firestore.indexes.json # Database indexes
├── database.rules.json    # Realtime Database rules
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/admoseremic/game_night.git
cd game_night
```

### 2. Firebase Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database
   - Enable Firebase Hosting

2. **Configure Firebase CLI**:
   ```bash
   firebase login
   firebase use --add
   # Select your project and give it an alias (e.g., "default")
   ```

3. **Update Project Configuration**:
   - Edit `.github/workflows/firebase-hosting.yml`
   - Change `projectId` to your Firebase project ID

### 3. Database Setup

The app uses three Firestore collections:

#### **Players Collection** (`/players/{playerId}`)
```javascript
{
  name: "Player Name",        // String
  regular: true              // Boolean - regular attendee flag
}
```

#### **Games Collection** (`/games/{gameId}`)
```javascript
{
  name: "Game Name",          // String
  tier: "medium",            // String: "light" | "medium" | "heavy"
  hi_score_wins: false,      // Boolean - true if high score wins
  best_score: "Player:100"   // String - "PlayerName:Score" format
}
```

#### **Plays Collection** (`/plays/{playId}`)
```javascript
{
  game: "gameId",            // Reference to game document
  dateTime: Timestamp,       // Firestore timestamp
  players: [                 // Array of player objects
    {
      player: "playerId",    // Reference to player document
      rank: 1,              // Number - final ranking
      score: 100,           // Number - player's score (nullable)
      players_beaten: 3     // Number - calculated metric
    }
  ]
}
```

### 4. Deploy to Firebase

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### 5. Set Up Auto-Deployment (Optional)

1. **Generate Firebase Service Account**:
   ```bash
   firebase projects:list
   firebase projects:addfirebase PROJECT_ID --json
   ```

2. **Add GitHub Secret**:
   - Go to your GitHub repo settings
   - Add secret: `FIREBASE_SERVICE_ACCOUNT`
   - Paste the service account JSON

3. **Push to main branch** - automatic deployment will trigger!

## 🎮 Usage Guide

### Adding Players
1. Click "Add New Player"
2. Enter player name
3. Check "Regular Attendee" if they attend frequently
4. Click "Save Player"

### Adding Games
1. Click "Add New Game"
2. Enter game name
3. Select tier (Light/Medium/Heavy)
4. Check "High Score Wins" if applicable
5. Click "Save Game"

### Recording a Game Session
1. Click "Add New Play"
2. Select date/time (defaults to now)
3. Choose the game from dropdown
4. Add players with rankings and scores
5. Click "Save Play"

**Pro Tips**:
- Rankings are required, scores are optional
- Lower rank numbers = better performance (1st place = rank 1)
- Players can't be selected multiple times in the same game
- The app calculates "players beaten" automatically

### Viewing Statistics
- **Date Filtering**: Use the dropdown to filter by time period
- **Custom Ranges**: Select "Custom Range" for specific date spans
- **Sorting**: Click column headers to sort tables
- **Mobile View**: Less critical columns hide automatically on small screens

### Managing Data
- **Delete Plays**: Click the 🗑️ button on recently played games
- **Confirmation**: Deletion requires confirmation to prevent accidents
- **Auto-Recalculation**: Best scores update automatically when plays are deleted

### Random Player Picker
1. Click "Pick Starting Player"
2. Check/uncheck players to include/exclude
3. Click "Pick Player"
4. Player picker remembers last selection to ensure fairness

## 🔧 Configuration

### Firebase Security Rules

The app uses permissive rules for development. For production, consider implementing authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Environment Variables

No environment variables needed - Firebase config is handled automatically.

## 📊 Statistics Explained

### Player Metrics

- **Wins**: Total number of 1st place finishes
- **Plays**: Total games played
- **Win %**: Percentage of games won
- **People Beat**: Total opponents defeated across all games
- **Weighted Wins**: Wins adjusted for game complexity
  - Light games: 0.5 points
  - Medium games: 1.0 points
  - Heavy games: 1.5 points

### Game Metrics

- **Plays**: Total times the game was played
- **Player Wins**: Win distribution among players
- **Best Ever**: Highest/lowest score achieved (based on game type)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use semantic commit messages
- Test responsive design on multiple screen sizes
- Validate all form inputs
- Maintain backward compatibility with existing data
- Update documentation for new features

## 🐛 Troubleshooting

### Common Issues

**Firebase Permission Denied**:
- Check Firestore security rules
- Ensure project is properly initialized
- Verify network connectivity

**Tables Not Loading**:
- Check browser console for JavaScript errors
- Verify Firebase configuration
- Ensure collections exist in Firestore

**Mobile Display Issues**:
- Clear browser cache
- Check viewport meta tag
- Verify Bootstrap CSS is loading

**Auto-Deployment Failing**:
- Check GitHub Actions logs
- Verify Firebase service account secret
- Ensure proper project ID in workflow

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎉 Acknowledgments

- Built with ❤️ for board game enthusiasts
- Firebase for backend infrastructure
- Bootstrap for responsive design
- The board gaming community for inspiration

## 📞 Support

Found a bug or have a feature request? Please open an issue on GitHub!

---

**Happy Gaming! 🎲🎮** 