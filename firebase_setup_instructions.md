# Firebase Setup Instructions

To use the Firebase converter script, you need to provide Firebase credentials.

## Option 1: Service Account Key (Recommended)

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Click on the **Service Accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Save it in this directory as one of these names:
   - `service-account-key.json`
   - `firebase-service-account.json`
   - `serviceAccountKey.json`

## Option 2: Firebase CLI (Alternative)

If you have Firebase CLI installed and logged in:
```bash
firebase login
```

## Running the Converter

Once you have the credentials set up:

```bash
# Make sure you have the JSONL file from BGStats conversion
./run_firebase_converter.sh
```

## What the script does:

1. **Fetches** all games and players from your Firebase database
2. **Maps** BGStats names to Firebase IDs
3. **Converts** the JSONL file to use Firebase IDs instead of names
4. **Reports** any missing games/players that need to be added to Firebase
5. **Outputs** `game_plays_firebase.jsonl` ready for import

## Expected Firebase Database Structure

Your Firebase should have these collections:

### `games` collection
```json
{
  "gameId": {
    "name": "Game Name",
    "tier": "light|medium|heavy", 
    "hi_score_wins": true/false
  }
}
```

### `players` collection  
```json
{
  "playerId": {
    "name": "Player Name",
    "regular": true/false
  }
}
```

### `plays` collection (this is where the converted data will go)
```json
{
  "playId": {
    "game": "gameId",
    "dateTime": "2022-01-11T10:00:00.000Z",
    "players": [
      {
        "player": "playerId", 
        "score": 12,
        "rank": 1
      }
    ]
  }
}
```