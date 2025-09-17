#!/usr/bin/env python3
"""
Convert BGStats export JSON to JSONL format for Firebase import.

Each line in the output will represent a game play with:
- dateTime: play date
- game: game name (looked up from games array)
- players: array of player objects with name and score
"""

import json
import sys
from datetime import datetime


def convert_bgstats_to_jsonl(input_file, output_file):
    """Convert BGStats JSON export to JSONL format."""
    
    # Load the BGStats data
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    # Create lookup dictionaries for games and players
    games_lookup = {game['id']: game['name'] for game in data['games']}
    players_lookup = {player['id']: player['name'] for player in data['players']}
    
    converted_plays = []
    
    # Process each play
    for play in data['plays']:
        # Extract play date
        play_date = play['playDate']
        
        # Look up game name
        game_ref_id = play['gameRefId']
        game_name = games_lookup.get(game_ref_id, f"Unknown Game (ID: {game_ref_id})")
        
        # Process player scores
        players = []
        for player_score in play['playerScores']:
            player_ref_id = player_score['playerRefId']
            player_name = players_lookup.get(player_ref_id, f"Unknown Player (ID: {player_ref_id})")
            
            players.append({
                'player': player_name,
                'score': player_score['score']
            })
        
        # Create the converted play record
        converted_play = {
            'dateTime': play_date,
            'game': game_name,
            'players': players
        }
        
        converted_plays.append(converted_play)
    
    # Write to JSONL file
    with open(output_file, 'w') as f:
        for play in converted_plays:
            f.write(json.dumps(play) + '\n')
    
    print(f"Converted {len(converted_plays)} plays to {output_file}")
    return len(converted_plays)


def main():
    input_file = 'BGStatsExport-250915140042.json'
    output_file = 'game_plays.jsonl'
    
    try:
        count = convert_bgstats_to_jsonl(input_file, output_file)
        print(f"Successfully converted {count} game plays!")
        print(f"Output written to: {output_file}")
        
        # Show a sample of the output
        print("\nSample output (first 3 lines):")
        with open(output_file, 'r') as f:
            for i, line in enumerate(f):
                if i >= 3:
                    break
                play = json.loads(line.strip())
                print(f"  {play['dateTime']} - {play['game']} with {len(play['players'])} players")
                
    except FileNotFoundError:
        print(f"Error: Could not find input file '{input_file}'")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()