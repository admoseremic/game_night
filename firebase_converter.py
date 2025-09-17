#!/usr/bin/env python3
"""
Convert BGStats data to use Firebase IDs instead of names.

This script:
1. Fetches games and players from Firebase 
2. Creates lookup mappings (name -> Firebase ID)
3. Converts the JSONL data to use Firebase IDs
4. Outputs Firebase-ready JSONL for import
"""

import json
import sys
import os
from datetime import datetime

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
        print("Please provide one of these files:")
        for path in possible_paths:
            print(f"  - {path}")
        print("\nYou can download the service account key from:")
        print("Firebase Console > Project Settings > Service Accounts > Generate new private key")
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


def fetch_firebase_data(db):
    """Fetch games and players from Firebase."""
    try:
        # Fetch games
        games_ref = db.collection('games')
        games_docs = games_ref.get()
        
        games_lookup = {}  # name -> firebase_id
        for doc in games_docs:
            game_data = doc.to_dict()
            game_name = game_data.get('name', '')
            games_lookup[game_name] = doc.id
        
        print(f"✓ Fetched {len(games_lookup)} games from Firebase")
        
        # Fetch players
        players_ref = db.collection('players')
        players_docs = players_ref.get()
        
        players_lookup = {}  # name -> firebase_id
        for doc in players_docs:
            player_data = doc.to_dict()
            player_name = player_data.get('name', '')
            players_lookup[player_name] = doc.id
            
        print(f"✓ Fetched {len(players_lookup)} players from Firebase")
        
        return games_lookup, players_lookup
        
    except Exception as e:
        print(f"Error fetching Firebase data: {e}")
        return None, None


def convert_jsonl_to_firebase_ids(input_file, output_file, games_lookup, players_lookup):
    """Convert JSONL file to use Firebase IDs."""
    
    converted_count = 0
    skipped_count = 0
    missing_games = set()
    missing_players = set()
    
    with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
        for line_num, line in enumerate(infile, 1):
            try:
                play = json.loads(line.strip())
                
                # Convert game name to Firebase ID
                game_name = play.get('game', '')
                if game_name in games_lookup:
                    play['game'] = games_lookup[game_name]
                else:
                    missing_games.add(game_name)
                    print(f"Warning: Game '{game_name}' not found in Firebase (line {line_num})")
                    skipped_count += 1
                    continue
                
                # Convert player names to Firebase IDs
                firebase_players = []
                skip_play = False
                
                for player in play.get('players', []):
                    player_name = player.get('player', '')
                    if player_name in players_lookup:
                        firebase_player = player.copy()
                        firebase_player['player'] = players_lookup[player_name]
                        firebase_players.append(firebase_player)
                    else:
                        missing_players.add(player_name)
                        print(f"Warning: Player '{player_name}' not found in Firebase (line {line_num})")
                        skip_play = True
                        break
                
                if skip_play:
                    skipped_count += 1
                    continue
                    
                play['players'] = firebase_players
                
                # Convert dateTime to Firebase timestamp format
                # Firebase expects ISO format or Timestamp object
                # Keep as string for now since we'll import via Admin SDK
                
                # Write converted play
                outfile.write(json.dumps(play) + '\n')
                converted_count += 1
                
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON on line {line_num}: {e}")
                skipped_count += 1
            except Exception as e:
                print(f"Error processing line {line_num}: {e}")
                skipped_count += 1
    
    print(f"\n✓ Conversion complete:")
    print(f"  - Converted: {converted_count} plays")
    print(f"  - Skipped: {skipped_count} plays")
    
    if missing_games:
        print(f"\nMissing games in Firebase ({len(missing_games)}):")
        for game in sorted(missing_games):
            print(f"  - {game}")
    
    if missing_players:
        print(f"\nMissing players in Firebase ({len(missing_players)}):")
        for player in sorted(missing_players):
            print(f"  - {player}")
    
    return converted_count, missing_games, missing_players


def main():
    input_file = 'game_plays.jsonl'
    output_file = 'game_plays_firebase.jsonl'
    
    print("Firebase Data Converter")
    print("=" * 50)
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        sys.exit(1)
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        print("Please run convert_bgstats.py first to generate the JSONL file.")
        sys.exit(1)
    
    # Fetch Firebase data
    games_lookup, players_lookup = fetch_firebase_data(db)
    if games_lookup is None or players_lookup is None:
        sys.exit(1)
    
    # Convert the JSONL file
    print(f"\nConverting {input_file} to use Firebase IDs...")
    converted_count, missing_games, missing_players = convert_jsonl_to_firebase_ids(
        input_file, output_file, games_lookup, players_lookup
    )
    
    if converted_count > 0:
        print(f"\n✓ Output written to: {output_file}")
        print(f"✓ Ready for Firebase import!")
        
        # Show sample output
        print(f"\nSample output (first 2 lines):")
        with open(output_file, 'r') as f:
            for i, line in enumerate(f):
                if i >= 2:
                    break
                play = json.loads(line.strip())
                player_count = len(play['players'])
                print(f"  {play['dateTime']} - Game ID: {play['game']} with {player_count} players")
    else:
        print("\n❌ No plays were successfully converted.")
        
    if missing_games or missing_players:
        print(f"\n⚠️  Warning: Some games/players are missing from Firebase.")
        print(f"   You may need to add them manually before importing this data.")


if __name__ == '__main__':
    main()