#!/usr/bin/env python3
"""
Convert BGStats export JSON to CSV format.

Creates a CSV where each row represents one player's score in a game.
Columns: dateTime, game, player, score
"""

import json
import csv
import sys


def convert_bgstats_to_csv(input_file, output_file):
    """Convert BGStats JSON export to CSV format."""
    
    # Load the BGStats data
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    # Create lookup dictionaries for games and players
    games_lookup = {game['id']: game['name'] for game in data['games']}
    players_lookup = {player['id']: player['name'] for player in data['players']}
    
    rows = []
    
    # Process each play
    for play in data['plays']:
        # Extract play date
        play_date = play['playDate']
        
        # Look up game name
        game_ref_id = play['gameRefId']
        game_name = games_lookup.get(game_ref_id, f"Unknown Game (ID: {game_ref_id})")
        
        # Process each player score as a separate row
        for player_score in play['playerScores']:
            player_ref_id = player_score['playerRefId']
            player_name = players_lookup.get(player_ref_id, f"Unknown Player (ID: {player_ref_id})")
            
            rows.append({
                'dateTime': play_date,
                'game': game_name,
                'player': player_name,
                'score': player_score['score']
            })
    
    # Write to CSV file
    with open(output_file, 'w', newline='') as f:
        fieldnames = ['dateTime', 'game', 'player', 'score']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Converted {len(rows)} player scores to {output_file}")
    return len(rows)


def main():
    input_file = 'BGStatsExport-250915140042.json'
    output_file = 'game_plays.csv'
    
    try:
        count = convert_bgstats_to_csv(input_file, output_file)
        print(f"Successfully converted {count} player score records!")
        print(f"Output written to: {output_file}")
        
        # Show a sample of the output
        print("\nSample output (first 5 rows):")
        with open(output_file, 'r') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= 5:
                    break
                print(f"  {row['dateTime']} - {row['game']} - {row['player']}: {row['score']}")
                
    except FileNotFoundError:
        print(f"Error: Could not find input file '{input_file}'")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()