#!/usr/bin/env python3
"""
Examine current best_score format in Firebase games and analyze what updates we need.
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


def examine_game_best_scores(db):
    """Look at current best_score format in games collection."""
    
    games_ref = db.collection('games')
    games_docs = games_ref.get()
    
    print("🎲 CURRENT BEST SCORES IN FIREBASE:")
    print("-" * 60)
    
    games_with_scores = []
    games_without_scores = []
    
    for doc in games_docs:
        game_data = doc.to_dict()
        game_name = game_data.get('name', 'NO NAME')
        best_score = game_data.get('best_score', '')
        hi_score_wins = game_data.get('hi_score_wins', True)
        
        if best_score and best_score != 'N/A':
            games_with_scores.append({
                'id': doc.id,
                'name': game_name,
                'best_score': best_score,
                'hi_score_wins': hi_score_wins
            })
            print(f"  {game_name}: '{best_score}' (hi_score_wins: {hi_score_wins})")
        else:
            games_without_scores.append({
                'id': doc.id,
                'name': game_name,
                'hi_score_wins': hi_score_wins
            })
    
    print(f"\n📊 SUMMARY:")
    print(f"  - Games with best scores: {len(games_with_scores)}")
    print(f"  - Games without best scores: {len(games_without_scores)}")
    
    if games_without_scores:
        print(f"\n⚪ GAMES WITHOUT BEST SCORES:")
        for game in games_without_scores[:10]:  # Show first 10
            print(f"  - {game['name']} (hi_score_wins: {game['hi_score_wins']})")
        if len(games_without_scores) > 10:
            print(f"  ... and {len(games_without_scores) - 10} more")
    
    return games_with_scores, games_without_scores


def analyze_historical_data_for_best_scores():
    """Analyze our historical data to see what best scores we might set."""
    
    input_file = 'game_plays_firebase_fixed.jsonl'
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        return {}
    
    # Collect all scores by game
    game_scores = {}  # game_id -> [(player_id, score), ...]
    
    with open(input_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                play = json.loads(line.strip())
                game_id = play.get('game', '')
                players = play.get('players', [])
                
                if game_id not in game_scores:
                    game_scores[game_id] = []
                
                for player in players:
                    player_id = player.get('player', '')
                    score = player.get('score', 0)
                    game_scores[game_id].append((player_id, score))
                    
            except json.JSONDecodeError as e:
                print(f"Error parsing line {line_num}: {e}")
    
    print(f"\n📈 HISTORICAL DATA ANALYSIS:")
    print("-" * 60)
    print(f"✓ Found scores for {len(game_scores)} games from historical data")
    
    # Show top scores for a few games
    game_count = 0
    for game_id, scores in game_scores.items():
        if game_count >= 5:  # Show first 5 games
            break
        
        if scores:
            max_score = max(scores, key=lambda x: x[1])
            min_score = min(scores, key=lambda x: x[1])
            print(f"  Game {game_id}: High={max_score[1]}, Low={min_score[1]}, Total plays={len(scores)}")
            game_count += 1
    
    return game_scores


def get_player_names(db):
    """Get player names for display purposes."""
    players_ref = db.collection('players')
    players_docs = players_ref.get()
    
    player_names = {}
    for doc in players_docs:
        player_data = doc.to_dict()
        player_name = player_data.get('name', 'Unknown')
        player_names[doc.id] = player_name
    
    return player_names


def main():
    print("Best Scores Analysis")
    print("=" * 40)
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        sys.exit(1)
    
    # Get player names for reference
    player_names = get_player_names(db)
    print(f"✓ Loaded {len(player_names)} player names")
    
    # Examine current best scores
    games_with_scores, games_without_scores = examine_game_best_scores(db)
    
    # Analyze historical data
    historical_game_scores = analyze_historical_data_for_best_scores()
    
    print(f"\n🎯 RECOMMENDATIONS:")
    print("-" * 40)
    print(f"1. We should update best scores for games that currently have none")
    print(f"2. We should check if historical data beats current best scores")
    print(f"3. Format should be: 'PlayerName:score' (e.g., 'Trevor:85')")
    print(f"4. Use hi_score_wins flag to determine if higher or lower is better")


if __name__ == '__main__':
    main()