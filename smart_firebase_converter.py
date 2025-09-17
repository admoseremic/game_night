#!/usr/bin/env python3
"""
Smart Firebase converter that handles name mapping between BGStats and Firebase.

This script creates intelligent mappings between BGStats full names and Firebase short names.
"""

import json
import sys
import os
from difflib import SequenceMatcher

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("Error: Firebase Admin SDK not found.")
    sys.exit(1)


def similarity(a, b):
    """Calculate similarity between two strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


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


def create_mappings(db):
    """Create intelligent mappings between BGStats and Firebase names."""
    
    # Fetch Firebase data
    games_ref = db.collection('games')
    games_docs = games_ref.get()
    firebase_games = {}  # name -> id
    for doc in games_docs:
        game_data = doc.to_dict()
        game_name = game_data.get('name', '')
        if game_name:
            firebase_games[game_name] = doc.id
    
    players_ref = db.collection('players')
    players_docs = players_ref.get()
    firebase_players = {}  # name -> id
    for doc in players_docs:
        player_data = doc.to_dict()
        player_name = player_data.get('name', '')
        if player_name:
            firebase_players[player_name] = doc.id
    
    print(f"✓ Loaded {len(firebase_games)} games and {len(firebase_players)} players from Firebase")
    
    # Create manual mappings for known exceptions
    game_mappings = {}
    
    # First, add exact matches
    for firebase_name in firebase_games.keys():
        game_mappings[firebase_name] = firebase_name
    
    # Then add special mappings for names that don't match exactly
    special_mappings = {
        'Love Letter': 'Love Letters',
        'Dune: Imperium': 'Dune Imperium',
        'Carcassonne': 'Carcassone',
        'Master Labyrinth': 'Master Labrynth',
        'Kingsburg': 'Kingsburgh',
        'Brian Boru: High King of Ireland': 'Brian Boru',
        'Isle of Skye: From Chieftain to King': 'Isle of Skye',
        'Clank!: A Deck-Building Adventure': 'Clank!',
        'Disney: The Haunted Mansion – Call of the Spirits Game': 'Haunted Mansion',
        'The Quest for El Dorado': 'The Quest for El Dorado',
        'The Search for Planet X': 'Search for planet x',
        'Small World': 'Smallworld',
        'Survive: Escape from Atlantis!': 'Survive',
        'Take A Number': 'Take a Number',
        'Catan Histories: Settlers of America – Trails to Rails': 'Settlers of America',
        'Brass: Birmingham': 'Brass Birmingham',
        'Dungeons, Dice & Danger': 'Dungeons, Dice, & Danger',
        'Q.E.': 'QE',
        'Kingdomino': 'King Domino',
        'Settlers of Catan: Gallery Edition': 'Catan',
        
        # New mappings for simplified names we added
        'Hegemony: Lead Your Class to Victory': 'Hegemony',
        'Istanbul: Big Box': 'Istanbul',
        'Lewis & Clark: The Expedition': 'Lewis & Clark',
        'Plunder: A Pirate\'s Life': 'Plunder',
        'The Manhattan Project: Energy Empire': 'Manhattan Project'
    }
    
    # Add special mappings
    for bgstats_name, firebase_name in special_mappings.items():
        if firebase_name in firebase_games:
            game_mappings[bgstats_name] = firebase_name
    
    # Create player mappings (BGStats full name -> Firebase short name)
    player_mappings = {
        'Trevor Paulsen': 'Trevor',
        'Tyson Eyre': 'Tyson', 
        'Kip Saunders': 'Kip',
        'Jack Eyre': 'Jack',
        'Liesl Eyre': 'Liesl',
        'Caryn Paulsen': 'Caryn',
        'Garrett Wilcox': 'Garrett',
        'Davey Saunders': 'Davey',
        'Kyle Meidell': 'Kyle'
    }
    
    # Convert to ID mappings
    game_id_mappings = {}
    for bgstats_name, firebase_name in game_mappings.items():
        if firebase_name in firebase_games:
            game_id_mappings[bgstats_name] = firebase_games[firebase_name]
        else:
            print(f"Warning: Firebase game '{firebase_name}' not found for BGStats game '{bgstats_name}'")
    
    player_id_mappings = {}
    for bgstats_name, firebase_name in player_mappings.items():
        if firebase_name in firebase_players:
            player_id_mappings[bgstats_name] = firebase_players[firebase_name]
        else:
            print(f"Warning: Firebase player '{firebase_name}' not found for BGStats player '{bgstats_name}'")
    
    return game_id_mappings, player_id_mappings


def convert_jsonl_with_mappings(input_file, output_file, game_mappings, player_mappings):
    """Convert JSONL using the mappings."""
    
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
                if game_name in game_mappings:
                    play['game'] = game_mappings[game_name]
                else:
                    missing_games.add(game_name)
                    skipped_count += 1
                    continue
                
                # Convert player names to Firebase IDs
                firebase_players = []
                skip_play = False
                
                for player in play.get('players', []):
                    player_name = player.get('player', '')
                    if player_name in player_mappings:
                        firebase_player = player.copy()
                        firebase_player['player'] = player_mappings[player_name]
                        firebase_players.append(firebase_player)
                    else:
                        missing_players.add(player_name)
                        skip_play = True
                        break
                
                if skip_play:
                    skipped_count += 1
                    continue
                    
                play['players'] = firebase_players
                
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
        print(f"\nGames not in mapping ({len(missing_games)}):")
        for game in sorted(missing_games):
            print(f"  - {game}")
    
    if missing_players:
        print(f"\nPlayers not in mapping ({len(missing_players)}):")
        for player in sorted(missing_players):
            print(f"  - {player}")
    
    return converted_count


def main():
    input_file = 'game_plays.jsonl'
    output_file = 'game_plays_firebase.jsonl'
    
    print("Smart Firebase Data Converter")
    print("=" * 50)
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        sys.exit(1)
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        sys.exit(1)
    
    # Create mappings
    print("\nCreating name mappings...")
    game_mappings, player_mappings = create_mappings(db)
    
    print(f"✓ Created {len(game_mappings)} game mappings")
    print(f"✓ Created {len(player_mappings)} player mappings")
    
    # Convert the JSONL file
    print(f"\nConverting {input_file} using smart mappings...")
    converted_count = convert_jsonl_with_mappings(
        input_file, output_file, game_mappings, player_mappings
    )
    
    if converted_count > 0:
        print(f"\n✅ SUCCESS!")
        print(f"✓ Output written to: {output_file}")
        print(f"✓ {converted_count} plays ready for Firebase import!")
        
        # Show sample output
        print(f"\nSample output (first 3 lines):")
        with open(output_file, 'r') as f:
            for i, line in enumerate(f):
                if i >= 3:
                    break
                play = json.loads(line.strip())
                player_count = len(play['players'])
                print(f"  {play['dateTime']} - Game ID: {play['game']} with {player_count} players")
    else:
        print("\n❌ No plays were successfully converted.")


if __name__ == '__main__':
    main()