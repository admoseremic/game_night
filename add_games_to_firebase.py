#!/usr/bin/env python3
"""
Bulk add games to Firebase with proper tier and scoring data.
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


def get_games_to_add():
    """Define the games to add with their properties."""
    
    # Based on your list, excluding the ones you mentioned to skip
    # and using simplified names where specified
    games_to_add = [
        # Name, Tier, High Score Wins (True/False)
        ("A Feast for Odin", "heavy", True),
        ("Above and Below", "medium", True),
        ("Adventure Land", "light", True),
        ("Beyond the Sun", "heavy", True),
        ("Big Boss", "medium", True),
        ("Bohnanza", "light", True),
        ("Coimbra", "heavy", True),
        ("Cosmic Encounter", "medium", False),  # Usually about eliminating opponents
        ("Cryptid", "medium", False),  # First to find the cryptid wins
        ("Earth", "heavy", True),
        ("El Caballero", "medium", True),
        ("El Dorado", "medium", False),  # Race game - first to finish
        ("Formula D", "light", False),  # Race game - first to finish
        ("Gemblo", "light", True),
        ("Guillotine", "light", True),
        ("Hegemony", "heavy", True),  # Simplified name
        ("Istanbul", "medium", False),  # First to collect gems/reach goal
        ("Lewis & Clark", "heavy", False),  # Race to the Pacific
        ("Lost Ruins of Arnak", "heavy", True),
        ("Maglev Metro", "medium", True),
        ("Modern Art", "medium", True),
        ("Organ ATTACK!", "light", False),  # Eliminate opponents
        ("Plunder", "medium", True),  # Simplified name
        ("Potion Explosion", "light", True),
        ("Race for the Galaxy", "medium", True),
        ("Red Rising", "medium", True),
        ("Root", "heavy", True),
        ("SCOUT", "light", False),  # First to empty hand
        ("Scythe", "heavy", True),
        ("Tapestry", "heavy", True),
        ("Terra Mystica", "heavy", True),
        ("The Bloody Inn", "medium", True),
        ("The Castles of Burgundy", "medium", True),
        ("The Isle of Cats", "medium", True),
        ("Manhattan Project", "heavy", True),  # Simplified name
        ("The Quacks of Quedlinburg", "medium", True),
        ("Ticket to Ride: Europe", "light", True),
        ("Trajan", "heavy", True),
        ("Unfair", "medium", True),
        ("Viticulture", "medium", True),
    ]
    
    return games_to_add


def check_existing_games(db):
    """Check which games already exist in Firebase."""
    games_ref = db.collection('games')
    games_docs = games_ref.get()
    
    existing_games = set()
    for doc in games_docs:
        game_data = doc.to_dict()
        game_name = game_data.get('name', '')
        if game_name:
            existing_games.add(game_name)
    
    return existing_games


def add_games_to_firebase(db, games_to_add):
    """Add games to Firebase."""
    
    existing_games = check_existing_games(db)
    added_count = 0
    skipped_count = 0
    
    print(f"\nAdding games to Firebase...")
    print("-" * 50)
    
    for game_name, tier, hi_score_wins in games_to_add:
        if game_name in existing_games:
            print(f"⏭️  Skipping '{game_name}' (already exists)")
            skipped_count += 1
            continue
        
        try:
            # Create game document
            game_data = {
                'name': game_name,
                'tier': tier,
                'hi_score_wins': hi_score_wins
            }
            
            # Add to Firebase
            doc_ref = db.collection('games').add(game_data)
            print(f"✅ Added '{game_name}' (tier: {tier}, high_score_wins: {hi_score_wins})")
            added_count += 1
            
        except Exception as e:
            print(f"❌ Error adding '{game_name}': {e}")
    
    print(f"\n📊 SUMMARY:")
    print(f"  - Added: {added_count} games")
    print(f"  - Skipped: {skipped_count} games (already existed)")
    print(f"  - Total attempted: {len(games_to_add)} games")
    
    return added_count


def main():
    print("Firebase Game Bulk Addition")
    print("=" * 50)
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        sys.exit(1)
    
    # Get games to add
    games_to_add = get_games_to_add()
    print(f"✓ Prepared {len(games_to_add)} games for addition")
    
    # Show what we're about to add
    print(f"\n🎲 GAMES TO ADD:")
    print("-" * 50)
    for game_name, tier, hi_score_wins in games_to_add:
        score_type = "High Score Wins" if hi_score_wins else "Low Score Wins"
        print(f"  - {game_name} ({tier}, {score_type})")
    
    # Auto-proceed (you can add a confirmation if needed)
    print(f"\nProceeding with adding {len(games_to_add)} games...")
    
    # Add games
    added_count = add_games_to_firebase(db, games_to_add)
    
    if added_count > 0:
        print(f"\n🎉 SUCCESS! Added {added_count} new games to Firebase.")
        print("You can now re-run the smart converter to get more historical data!")
    else:
        print(f"\n💡 No new games were added (all already existed).")


if __name__ == '__main__':
    main()