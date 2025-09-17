#!/usr/bin/env python3
"""
Analyze BGStats data to show what games and players need to be added to Firebase.

This script helps you understand what's missing before doing the full conversion.
"""

import json
import sys
import os

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("Error: Firebase Admin SDK not found. Install with: pip install firebase-admin")
    sys.exit(1)


def initialize_firebase():
    """Initialize Firebase connection."""
    # Check for service account key
    service_account_path = None
    possible_paths = [
        "service-account-key.json",
        "firebase-service-account.json", 
        "serviceAccountKey.json",
        os.path.expanduser("~/.firebase/service-account.json")
    ]
    
    # Also check for Firebase Admin SDK files with the pattern used by Firebase Console
    import glob
    firebase_admin_files = glob.glob("*firebase-adminsdk*.json")
    possible_paths.extend(firebase_admin_files)
    
    for path in possible_paths:
        if os.path.exists(path):
            service_account_path = path
            break
    
    if not service_account_path:
        print("Error: Firebase service account key not found.")
        return None
        
    try:
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print(f"✓ Connected to Firebase using {service_account_path}")
        return db
    except Exception as e:
        print(f"Error connecting to Firebase: {e}")
        return None


def analyze_bgstats_data(jsonl_file):
    """Analyze the BGStats JSONL file to extract unique games and players."""
    
    games_in_bgstats = set()
    players_in_bgstats = set()
    
    with open(jsonl_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                play = json.loads(line.strip())
                
                # Collect game name
                game_name = play.get('game', '')
                if game_name:
                    games_in_bgstats.add(game_name)
                
                # Collect player names
                for player in play.get('players', []):
                    player_name = player.get('player', '')
                    if player_name:
                        players_in_bgstats.add(player_name)
                        
            except json.JSONDecodeError as e:
                print(f"Warning: Error parsing JSON on line {line_num}: {e}")
    
    return games_in_bgstats, players_in_bgstats


def fetch_firebase_data(db):
    """Fetch existing games and players from Firebase."""
    try:
        # Fetch games
        games_ref = db.collection('games')
        games_docs = games_ref.get()
        
        firebase_games = set()
        for doc in games_docs:
            game_data = doc.to_dict()
            game_name = game_data.get('name', '')
            if game_name:
                firebase_games.add(game_name)
        
        # Fetch players
        players_ref = db.collection('players')
        players_docs = players_ref.get()
        
        firebase_players = set()
        for doc in players_docs:
            player_data = doc.to_dict()
            player_name = player_data.get('name', '')
            if player_name:
                firebase_players.add(player_name)
                
        return firebase_games, firebase_players
        
    except Exception as e:
        print(f"Error fetching Firebase data: {e}")
        return set(), set()


def main():
    input_file = 'game_plays.jsonl'
    
    print("BGStats Data Analysis")
    print("=" * 50)
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        print("Please run convert_bgstats.py first to generate the JSONL file.")
        sys.exit(1)
    
    # Analyze BGStats data
    print(f"Analyzing {input_file}...")
    bgstats_games, bgstats_players = analyze_bgstats_data(input_file)
    
    print(f"✓ Found {len(bgstats_games)} unique games in BGStats data")
    print(f"✓ Found {len(bgstats_players)} unique players in BGStats data")
    
    # Initialize Firebase and fetch existing data
    db = initialize_firebase()
    if db:
        firebase_games, firebase_players = fetch_firebase_data(db)
        print(f"✓ Found {len(firebase_games)} games in Firebase")
        print(f"✓ Found {len(firebase_players)} players in Firebase")
        
        # Calculate missing items
        missing_games = bgstats_games - firebase_games
        missing_players = bgstats_players - firebase_players
        
        print(f"\n📊 SUMMARY:")
        print(f"  - Games to add to Firebase: {len(missing_games)}")
        print(f"  - Players to add to Firebase: {len(missing_players)}")
        
        if missing_games:
            print(f"\n🎲 MISSING GAMES ({len(missing_games)}):")
            for game in sorted(missing_games):
                print(f"  - {game}")
        
        if missing_players:
            print(f"\n👥 MISSING PLAYERS ({len(missing_players)}):")
            for player in sorted(missing_players):
                print(f"  - {player}")
        
        # Show what's already in Firebase
        existing_games = bgstats_games & firebase_games
        existing_players = bgstats_players & firebase_players
        
        if existing_games:
            print(f"\n✅ GAMES ALREADY IN FIREBASE ({len(existing_games)}):")
            for game in sorted(existing_games):
                print(f"  - {game}")
        
        if existing_players:
            print(f"\n✅ PLAYERS ALREADY IN FIREBASE ({len(existing_players)}):")
            for player in sorted(existing_players):
                print(f"  - {player}")
                
    else:
        # If can't connect to Firebase, just show what's in BGStats
        print(f"\n🎲 ALL GAMES IN BGSTATS ({len(bgstats_games)}):")
        for game in sorted(bgstats_games):
            print(f"  - {game}")
        
        print(f"\n👥 ALL PLAYERS IN BGSTATS ({len(bgstats_players)}):")
        for player in sorted(bgstats_players):
            print(f"  - {player}")


if __name__ == '__main__':
    main()