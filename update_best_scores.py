#!/usr/bin/env python3
"""
Update best scores in Firebase games based on historical play data.

This script:
1. Analyzes historical play data to find best scores
2. Compares with current Firebase best scores
3. Updates games where historical data has better scores
4. Sets best scores for games that don't have any
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


def get_game_info(db):
    """Get game information including current best scores and hi_score_wins flags."""
    
    games_ref = db.collection('games')
    games_docs = games_ref.get()
    
    games_info = {}
    
    for doc in games_docs:
        game_data = doc.to_dict()
        games_info[doc.id] = {
            'name': game_data.get('name', 'Unknown'),
            'best_score': game_data.get('best_score', ''),
            'hi_score_wins': game_data.get('hi_score_wins', True)
        }
    
    return games_info


def get_player_names(db):
    """Get player ID to name mapping."""
    
    players_ref = db.collection('players')
    players_docs = players_ref.get()
    
    player_names = {}
    for doc in players_docs:
        player_data = doc.to_dict()
        player_names[doc.id] = player_data.get('name', 'Unknown')
    
    return player_names


def analyze_historical_best_scores():
    """Analyze historical data to find best scores for each game."""
    
    input_file = 'game_plays_firebase_fixed.jsonl'
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        return {}
    
    # Track best scores: game_id -> {'high': (player_id, score), 'low': (player_id, score)}
    game_best_scores = {}
    
    with open(input_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                play = json.loads(line.strip())
                game_id = play.get('game', '')
                players = play.get('players', [])
                
                if game_id not in game_best_scores:
                    game_best_scores[game_id] = {'high': None, 'low': None}
                
                for player in players:
                    player_id = player.get('player', '')
                    score = player.get('score', 0)
                    
                    # Track highest score
                    if (game_best_scores[game_id]['high'] is None or 
                        score > game_best_scores[game_id]['high'][1]):
                        game_best_scores[game_id]['high'] = (player_id, score)
                    
                    # Track lowest score
                    if (game_best_scores[game_id]['low'] is None or 
                        score < game_best_scores[game_id]['low'][1]):
                        game_best_scores[game_id]['low'] = (player_id, score)
                        
            except json.JSONDecodeError as e:
                print(f"Error parsing line {line_num}: {e}")
    
    return game_best_scores


def parse_current_best_score(best_score_str):
    """Parse current best score string like 'Trevor:85' into (name, score)."""
    
    if not best_score_str or best_score_str == 'N/A':
        return None, None
    
    if ':' in best_score_str:
        parts = best_score_str.split(':', 1)
        try:
            return parts[0], int(parts[1])
        except ValueError:
            return parts[0], 0
    
    return None, None


def determine_updates_needed(games_info, historical_best_scores, player_names):
    """Determine which games need best score updates."""
    
    updates_needed = []
    
    for game_id, game_info in games_info.items():
        if game_id not in historical_best_scores:
            continue  # No historical data for this game
        
        game_name = game_info['name']
        current_best = game_info['best_score']
        hi_score_wins = game_info['hi_score_wins']
        
        historical_data = historical_best_scores[game_id]
        
        # Choose best score based on hi_score_wins flag
        if hi_score_wins:
            best_player_id, best_score = historical_data['high'] or (None, None)
        else:
            best_player_id, best_score = historical_data['low'] or (None, None)
        
        if best_player_id is None:
            continue  # No valid scores in historical data
        
        best_player_name = player_names.get(best_player_id, 'Unknown')
        new_best_score_str = f"{best_player_name}:{best_score}"
        
        # Parse current best score
        current_player, current_score = parse_current_best_score(current_best)
        
        should_update = False
        reason = ""
        
        if not current_best or current_best == 'N/A':
            should_update = True
            reason = "No current best score"
        elif current_score is None:
            should_update = True
            reason = "Invalid current best score format"
        else:
            # Compare scores
            if hi_score_wins:
                if best_score > current_score:
                    should_update = True
                    reason = f"Historical score {best_score} > current {current_score}"
            else:
                if best_score < current_score:
                    should_update = True
                    reason = f"Historical score {best_score} < current {current_score}"
        
        if should_update:
            updates_needed.append({
                'game_id': game_id,
                'game_name': game_name,
                'current_best': current_best,
                'new_best': new_best_score_str,
                'hi_score_wins': hi_score_wins,
                'reason': reason
            })
    
    return updates_needed


def apply_updates(db, updates_needed, dry_run=True):
    """Apply the best score updates to Firebase."""
    
    if not updates_needed:
        print("No updates needed!")
        return
    
    print(f"\n{'🧪 DRY RUN - ' if dry_run else '🔥 APPLYING '}BEST SCORE UPDATES:")
    print("-" * 60)
    
    updated_count = 0
    
    for update in updates_needed:
        game_id = update['game_id']
        game_name = update['game_name']
        current_best = update['current_best']
        new_best = update['new_best']
        reason = update['reason']
        
        print(f"📝 {game_name}:")
        print(f"   Current: '{current_best}'")
        print(f"   New:     '{new_best}'")
        print(f"   Reason:  {reason}")
        
        if not dry_run:
            try:
                db.collection('games').document(game_id).update({
                    'best_score': new_best
                })
                print(f"   ✅ Updated!")
                updated_count += 1
            except Exception as e:
                print(f"   ❌ Error: {e}")
        else:
            print(f"   🧪 Would update (dry run)")
        
        print()
    
    if dry_run:
        print(f"🧪 DRY RUN COMPLETE - {len(updates_needed)} updates would be applied")
        print("Run with --apply to actually update Firebase")
    else:
        print(f"✅ UPDATES COMPLETE - {updated_count}/{len(updates_needed)} games updated")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Update best scores from historical data')
    parser.add_argument('--apply', action='store_true', help='Actually apply updates (default is dry run)')
    args = parser.parse_args()
    
    print("Best Scores Updater")
    print("=" * 40)
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        sys.exit(1)
    
    # Get current game info and player names
    print("Loading Firebase data...")
    games_info = get_game_info(db)
    player_names = get_player_names(db)
    print(f"✓ Loaded {len(games_info)} games and {len(player_names)} players")
    
    # Analyze historical data
    print("Analyzing historical play data...")
    historical_best_scores = analyze_historical_best_scores()
    print(f"✓ Analyzed {len(historical_best_scores)} games from historical data")
    
    # Determine what updates are needed
    print("Determining updates needed...")
    updates_needed = determine_updates_needed(games_info, historical_best_scores, player_names)
    print(f"✓ Found {len(updates_needed)} games that need best score updates")
    
    # Apply updates
    apply_updates(db, updates_needed, dry_run=not args.apply)


if __name__ == '__main__':
    main()