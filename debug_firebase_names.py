#!/usr/bin/env python3
"""
Debug script to show actual names in Firebase vs BGStats data.
This helps us understand the name mapping needed.
"""

import json
import sys
import os

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("Error: Firebase Admin SDK not found.")
    sys.exit(1)


def initialize_firebase():
    """Initialize Firebase connection."""
    import glob
    firebase_admin_files = glob.glob("*firebase-adminsdk*.json")
    
    if firebase_admin_files:
        service_account_path = firebase_admin_files[0]
        try:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print(f"✓ Connected to Firebase using {service_account_path}")
            return db
        except Exception as e:
            print(f"Error connecting to Firebase: {e}")
            return None
    else:
        print("Error: Firebase credentials not found")
        return None


def show_firebase_data(db):
    """Show actual names in Firebase collections."""
    
    print("🎲 GAMES IN FIREBASE:")
    print("-" * 50)
    games_ref = db.collection('games')
    games_docs = games_ref.get()
    
    firebase_games = []
    for doc in games_docs:
        game_data = doc.to_dict()
        game_name = game_data.get('name', 'NO NAME')
        firebase_games.append(game_name)
        print(f"  {doc.id}: '{game_name}'")
    
    print(f"\nTotal: {len(firebase_games)} games")
    
    print("\n👥 PLAYERS IN FIREBASE:")
    print("-" * 50)
    players_ref = db.collection('players')
    players_docs = players_ref.get()
    
    firebase_players = []
    for doc in players_docs:
        player_data = doc.to_dict()
        player_name = player_data.get('name', 'NO NAME')
        firebase_players.append(player_name)
        print(f"  {doc.id}: '{player_name}'")
    
    print(f"\nTotal: {len(firebase_players)} players")
    
    return firebase_games, firebase_players


def show_bgstats_data():
    """Show actual names in BGStats JSONL file."""
    
    input_file = 'game_plays.jsonl'
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        return [], []
    
    bgstats_games = set()
    bgstats_players = set()
    
    with open(input_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                play = json.loads(line.strip())
                
                game_name = play.get('game', '')
                if game_name:
                    bgstats_games.add(game_name)
                
                for player in play.get('players', []):
                    player_name = player.get('player', '')
                    if player_name:
                        bgstats_players.add(player_name)
                        
            except json.JSONDecodeError:
                continue
    
    print("\n🎲 GAMES IN BGSTATS:")
    print("-" * 50)
    for game in sorted(bgstats_games):
        print(f"  '{game}'")
    print(f"\nTotal: {len(bgstats_games)} unique games")
    
    print("\n👥 PLAYERS IN BGSTATS:")
    print("-" * 50)
    for player in sorted(bgstats_players):
        print(f"  '{player}'")
    print(f"\nTotal: {len(bgstats_players)} unique players")
    
    return list(bgstats_games), list(bgstats_players)


def suggest_mappings(firebase_games, firebase_players, bgstats_games, bgstats_players):
    """Suggest potential name mappings based on partial matches."""
    
    print("\n🔍 POTENTIAL GAME MAPPINGS:")
    print("-" * 50)
    for bg_game in sorted(bgstats_games):
        matches = []
        for fb_game in firebase_games:
            # Check if Firebase name is contained in BGStats name or vice versa
            if fb_game.lower() in bg_game.lower() or bg_game.lower() in fb_game.lower():
                matches.append(fb_game)
        
        if matches:
            print(f"  '{bg_game}' → {matches}")
        else:
            print(f"  '{bg_game}' → NOT FOUND")
    
    print("\n🔍 POTENTIAL PLAYER MAPPINGS:")
    print("-" * 50)
    for bg_player in sorted(bgstats_players):
        matches = []
        for fb_player in firebase_players:
            # Check if Firebase name is contained in BGStats name (e.g., "Trevor" in "Trevor Paulsen")
            if fb_player.lower() in bg_player.lower() or bg_player.lower() in fb_player.lower():
                matches.append(fb_player)
        
        if matches:
            print(f"  '{bg_player}' → {matches}")
        else:
            print(f"  '{bg_player}' → NOT FOUND")


def main():
    print("Firebase vs BGStats Name Comparison")
    print("=" * 50)
    
    # Get Firebase data
    db = initialize_firebase()
    if not db:
        sys.exit(1)
    
    firebase_games, firebase_players = show_firebase_data(db)
    
    # Get BGStats data
    bgstats_games, bgstats_players = show_bgstats_data()
    
    # Suggest mappings
    suggest_mappings(firebase_games, firebase_players, bgstats_games, bgstats_players)


if __name__ == '__main__':
    main()