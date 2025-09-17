#!/usr/bin/env python3
"""
Extract comprehensive list of missing games for Firebase addition.
Filters out plays with missing players and focuses only on games.
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
            return db
        except Exception as e:
            print(f"Error connecting to Firebase: {e}")
            return None
    else:
        print("Error: Firebase credentials not found")
        return None


def get_existing_data(db):
    """Get existing games and players from Firebase."""
    
    # Games
    games_ref = db.collection('games')
    games_docs = games_ref.get()
    firebase_games = set()
    for doc in games_docs:
        game_data = doc.to_dict()
        game_name = game_data.get('name', '')
        if game_name:
            firebase_games.add(game_name)
    
    # Players  
    players_ref = db.collection('players')
    players_docs = players_ref.get()
    firebase_players = set()
    for doc in players_docs:
        player_data = doc.to_dict()
        player_name = player_data.get('name', '')
        if player_name:
            firebase_players.add(player_name)
    
    return firebase_games, firebase_players


def analyze_bgstats_for_missing_games():
    """Analyze BGStats data focusing only on games (ignoring missing players)."""
    
    input_file = 'game_plays.jsonl'
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        return set()
    
    # Known player mappings (BGStats -> Firebase names)
    known_players = {
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
    
    games_with_valid_players = set()
    all_games = set()
    
    with open(input_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                play = json.loads(line.strip())
                
                game_name = play.get('game', '')
                if game_name:
                    all_games.add(game_name)
                    
                    # Check if all players in this play are known
                    all_players_known = True
                    for player in play.get('players', []):
                        player_name = player.get('player', '')
                        if player_name not in known_players:
                            all_players_known = False
                            break
                    
                    # If all players are known, this game is worth adding
                    if all_players_known:
                        games_with_valid_players.add(game_name)
                        
            except json.JSONDecodeError:
                continue
    
    return all_games, games_with_valid_players


def main():
    print("Missing Games Analysis for Firebase")
    print("=" * 50)
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        sys.exit(1)
    
    # Get existing Firebase data
    firebase_games, firebase_players = get_existing_data(db)
    print(f"✓ Found {len(firebase_games)} games in Firebase")
    print(f"✓ Found {len(firebase_players)} players in Firebase")
    
    # Analyze BGStats data
    all_bgstats_games, games_with_valid_players = analyze_bgstats_for_missing_games()
    print(f"✓ Found {len(all_bgstats_games)} total games in BGStats")
    print(f"✓ Found {len(games_with_valid_players)} games with only known players")
    
    # Create manual game mappings (what we know already exist)
    known_game_mappings = {
        # Exact matches
        '7 Wonders', 'Acquire', 'Alhambra', 'Arboretum', 'Ark Nova', 'Azul',
        'Between Two Cities', 'Biblios', 'Blokus', 'Broom Service', 'Calico',
        'Cascadia', 'Catan', 'Challengers!', 'Chicago Express', 'Colt Express',
        'Cursed Court', 'Downforce', 'Fantastic Factories', 'First in Flight',
        'Five Tribes', 'Furnace', 'Galaxy Trucker', 'Guns or Treasure',
        'High Society', 'Incan Gold', 'Joraku', 'King of Tokyo',
        'Kingdom Builder', 'On Tour', 'Pan Am', 'Perudo', 'Photosynthesis',
        'Power Grid', 'Puerto Rico', 'Sagrada', 'Sheriff of Nottingham',
        'Skull', 'Splendor', 'Suburbia', 'Take 5', 'Terraforming Mars',
        'Tiny Towns', 'Wingspan',
        
        # Games that have mappings
        'Love Letter', 'Dune: Imperium', 'Carcassonne', 'Master Labyrinth',
        'Kingsburg', 'Brian Boru: High King of Ireland', 'Isle of Skye: From Chieftain to King',
        'Clank!: A Deck-Building Adventure', 'Disney: The Haunted Mansion – Call of the Spirits Game',
        'The Quest for El Dorado', 'The Search for Planet X', 'Small World',
        'Survive: Escape from Atlantis!', 'Take A Number', 
        'Catan Histories: Settlers of America – Trails to Rails',
        'Brass: Birmingham', 'Dungeons, Dice & Danger', 'Q.E.',
        'Kingdomino', 'Settlers of Catan: Gallery Edition'
    }
    
    # Find missing games that have valid players
    missing_games_to_add = games_with_valid_players - known_game_mappings
    
    # Also find all missing games (for completeness)
    all_missing_games = all_bgstats_games - known_game_mappings
    
    print(f"\n🎯 PRIORITY: Games to add (have valid players) - {len(missing_games_to_add)} games:")
    print("-" * 60)
    for game in sorted(missing_games_to_add):
        print(f"  - {game}")
    
    print(f"\n📋 ALL MISSING GAMES (including those with unknown players) - {len(all_missing_games)} games:")
    print("-" * 60)
    for game in sorted(all_missing_games):
        priority = "⭐ PRIORITY" if game in missing_games_to_add else "   "
        print(f"  {priority} - {game}")
    
    # Save to file for easy copy/paste
    with open('missing_games_list.txt', 'w') as f:
        f.write("PRIORITY GAMES TO ADD (have valid players):\n")
        f.write("=" * 50 + "\n")
        for game in sorted(missing_games_to_add):
            f.write(f"{game}\n")
        
        f.write("\n\nALL MISSING GAMES:\n")
        f.write("=" * 50 + "\n")
        for game in sorted(all_missing_games):
            priority = "[PRIORITY] " if game in missing_games_to_add else ""
            f.write(f"{priority}{game}\n")
    
    print(f"\n✅ Lists saved to 'missing_games_list.txt'")
    print(f"\nRecommendation: Start with the {len(missing_games_to_add)} PRIORITY games")
    print("These will immediately unlock more of your historical data!")


if __name__ == '__main__':
    main()