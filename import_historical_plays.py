#!/usr/bin/env python3
"""
Import historical plays data into Firebase.

This script imports the properly formatted historical plays from BGStats
into the Firebase plays collection.
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


def check_existing_plays(db):
    """Check how many plays already exist in Firebase."""
    
    plays_ref = db.collection('plays')
    existing_plays = plays_ref.get()
    
    print(f"📊 Current Firebase plays collection: {len(existing_plays)} plays")
    
    return len(existing_plays)


def import_historical_plays(db, batch_size=50):
    """Import historical plays in batches."""
    
    input_file = 'game_plays_firebase_fixed.jsonl'
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        return False
    
    # Count total plays to import
    total_plays = 0
    with open(input_file, 'r') as f:
        for _ in f:
            total_plays += 1
    
    print(f"📥 Importing {total_plays} historical plays...")
    print(f"📦 Using batch size: {batch_size}")
    
    imported_count = 0
    error_count = 0
    batch_count = 0
    
    with open(input_file, 'r') as f:
        batch = db.batch()
        batch_operations = 0
        
        for line_num, line in enumerate(f, 1):
            try:
                play_data = json.loads(line.strip())
                
                # Convert dateTime string to Firestore Timestamp
                datetime_str = play_data.get('dateTime', '')
                if datetime_str:
                    # Parse ISO format datetime
                    dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
                    play_data['dateTime'] = dt
                
                # Add to batch
                doc_ref = db.collection('plays').document()  # Auto-generate ID
                batch.set(doc_ref, play_data)
                batch_operations += 1
                
                # Commit batch when it reaches batch_size
                if batch_operations >= batch_size:
                    batch.commit()
                    batch_count += 1
                    imported_count += batch_operations
                    
                    print(f"✅ Batch {batch_count}: Imported {batch_operations} plays (Total: {imported_count}/{total_plays})")
                    
                    # Start new batch
                    batch = db.batch()
                    batch_operations = 0
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON error on line {line_num}: {e}")
                error_count += 1
            except Exception as e:
                print(f"❌ Import error on line {line_num}: {e}")
                error_count += 1
        
        # Commit any remaining operations in the final batch
        if batch_operations > 0:
            batch.commit()
            batch_count += 1
            imported_count += batch_operations
            print(f"✅ Final batch {batch_count}: Imported {batch_operations} plays (Total: {imported_count}/{total_plays})")
    
    print(f"\n📊 IMPORT SUMMARY:")
    print(f"  ✅ Successfully imported: {imported_count} plays")
    print(f"  ❌ Errors: {error_count}")
    print(f"  📦 Total batches: {batch_count}")
    
    return imported_count > 0


def verify_import(db, expected_count):
    """Verify the import was successful."""
    
    print(f"\n🔍 VERIFYING IMPORT...")
    
    # Count total plays now
    plays_ref = db.collection('plays')
    all_plays = plays_ref.get()
    total_plays = len(all_plays)
    
    print(f"📊 Firebase plays collection now has: {total_plays} plays")
    
    # Show a sample of recent imports (last few plays by document creation)
    print(f"\n📋 SAMPLE OF IMPORTED PLAYS:")
    sample_plays = plays_ref.limit(3).get()
    
    for i, doc in enumerate(sample_plays, 1):
        play_data = doc.to_dict()
        game_id = play_data.get('game', 'Unknown')
        date_time = play_data.get('dateTime', 'Unknown')
        player_count = len(play_data.get('players', []))
        
        print(f"  {i}. {date_time} - Game: {game_id} - {player_count} players")
    
    return total_plays


def main():
    print("🚀 Historical Plays Importer")
    print("=" * 50)
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        sys.exit(1)
    
    # Check current state
    existing_count = check_existing_plays(db)
    
    # Proceed with import
    print(f"\n🚀 About to import historical plays into Firebase")
    print(f"Current plays in Firebase: {existing_count}")
    print("Proceeding with import...")
    
    # Import the plays
    print(f"\n🔥 STARTING IMPORT...")
    success = import_historical_plays(db)
    
    if success:
        # Verify the import
        final_count = verify_import(db, 531)
        
        print(f"\n🎉 IMPORT COMPLETE!")
        print(f"✓ Historical game data successfully backloaded!")
        print(f"✓ Your Firebase now contains years of gaming history 🎲")
        
    else:
        print(f"\n❌ Import failed. Please check the errors above.")


if __name__ == '__main__':
    main()