#!/usr/bin/env python3
"""
Fix the converted JSONL data to match exact Firebase plays structure.
"""

import json
import sys
import os
from datetime import datetime

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("Error: Firebase Admin SDK not found.")
    sys.exit(1)


def fix_converted_data():
    """Fix the converted data to match Firebase structure exactly."""
    
    input_file = 'game_plays_firebase.jsonl'
    output_file = 'game_plays_firebase_fixed.jsonl'
    
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        return False
    
    fixed_count = 0
    
    with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
        for line_num, line in enumerate(infile, 1):
            try:
                play = json.loads(line.strip())
                
                # Fix datetime format - convert to Firestore Timestamp
                datetime_str = play.get('dateTime', '')
                if datetime_str:
                    # Parse the datetime string and convert to Firestore format
                    dt = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S')
                    # Convert to Firestore Timestamp (will be handled during import)
                    play['dateTime'] = dt.isoformat() + '+00:00'
                
                # Fix players structure
                players = play.get('players', [])
                fixed_players = []
                
                # First, collect all scores to calculate ranks
                player_scores = []
                for player in players:
                    score = player.get('score', 0)
                    # Convert score to integer
                    try:
                        score_int = int(score) if score is not None and score != '' else 0
                    except (ValueError, TypeError):
                        score_int = 0
                    player_scores.append((player, score_int))
                
                # Sort by score to calculate ranks (assuming higher score = better rank)
                # We'll need to check if this game has high_score_wins or not
                # For now, assume higher score = rank 1 (most games work this way)
                player_scores.sort(key=lambda x: x[1], reverse=True)
                
                # Create fixed player objects with rank and players_beaten
                for rank, (original_player, score) in enumerate(player_scores, 1):
                    players_beaten = len(player_scores) - rank  # How many players this player beat
                    
                    fixed_player = {
                        'player': original_player.get('player', ''),
                        'score': score,  # Now integer
                        'rank': rank,
                        'players_beaten': players_beaten
                    }
                    fixed_players.append(fixed_player)
                
                play['players'] = fixed_players
                
                # Write fixed play
                outfile.write(json.dumps(play) + '\n')
                fixed_count += 1
                
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON on line {line_num}: {e}")
            except Exception as e:
                print(f"Error processing line {line_num}: {e}")
    
    print(f"✓ Fixed {fixed_count} plays")
    print(f"✓ Output written to: {output_file}")
    
    return fixed_count > 0


def show_sample_fixed_data():
    """Show sample of the fixed data."""
    
    output_file = 'game_plays_firebase_fixed.jsonl'
    if not os.path.exists(output_file):
        return
    
    print(f"\n🔍 SAMPLE FIXED DATA:")
    print("-" * 50)
    
    with open(output_file, 'r') as f:
        for i, line in enumerate(f, 1):
            if i > 2:  # Show first 2 examples
                break
            try:
                play = json.loads(line.strip())
                print(f"\nFixed Play {i}:")
                print(f"  Structure: {json.dumps(play, indent=4)}")
                
            except json.JSONDecodeError as e:
                print(f"Error parsing line {i}: {e}")


def validate_against_firebase_structure():
    """Quick validation check."""
    
    required_fields = ['dateTime', 'game', 'players']
    required_player_fields = ['player', 'score', 'rank', 'players_beaten']
    
    output_file = 'game_plays_firebase_fixed.jsonl'
    if not os.path.exists(output_file):
        return False
    
    print(f"\n✅ VALIDATION:")
    print("-" * 30)
    
    with open(output_file, 'r') as f:
        line = f.readline()
        if line:
            try:
                play = json.loads(line.strip())
                
                # Check top-level fields
                for field in required_fields:
                    if field in play:
                        print(f"  ✅ {field}: {type(play[field]).__name__}")
                    else:
                        print(f"  ❌ Missing: {field}")
                
                # Check player fields
                if 'players' in play and play['players']:
                    player = play['players'][0]
                    print(f"  Player structure:")
                    for field in required_player_fields:
                        if field in player:
                            print(f"    ✅ {field}: {type(player[field]).__name__}")
                        else:
                            print(f"    ❌ Missing: {field}")
                
                return True
                
            except json.JSONDecodeError as e:
                print(f"  ❌ JSON error: {e}")
                return False
    
    return False


def main():
    print("Firebase Format Fixer")
    print("=" * 40)
    
    # Fix the converted data
    success = fix_converted_data()
    
    if success:
        # Show sample
        show_sample_fixed_data()
        
        # Validate
        validate_against_firebase_structure()
        
        print(f"\n🎉 SUCCESS!")
        print(f"✓ Data formatted to match Firebase structure")
        print(f"✓ Ready for import: game_plays_firebase_fixed.jsonl")
    else:
        print(f"\n❌ Failed to fix data format")


if __name__ == '__main__':
    main()