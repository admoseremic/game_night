#!/usr/bin/env python3
"""
Check the existing Firebase plays structure and compare with our converted data.
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


def check_existing_plays_structure(db):
    """Check existing plays in Firebase to understand the structure."""
    
    plays_ref = db.collection('plays')
    plays_docs = plays_ref.limit(5).get()  # Get first 5 plays to see structure
    
    print("🔍 EXISTING FIREBASE PLAYS STRUCTURE:")
    print("-" * 60)
    
    if not plays_docs:
        print("  No existing plays found in Firebase.")
        return None
    
    for i, doc in enumerate(plays_docs, 1):
        play_data = doc.to_dict()
        print(f"\nPlay {i} (ID: {doc.id}):")
        print(f"  Structure: {json.dumps(play_data, indent=4, default=str)}")
        
        if i == 1:  # Save first play structure as template
            template = play_data
    
    return template


def check_converted_data_structure():
    """Check the structure of our converted data."""
    
    input_file = 'game_plays_firebase.jsonl'
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        return None
    
    print("\n🔍 OUR CONVERTED DATA STRUCTURE:")
    print("-" * 60)
    
    with open(input_file, 'r') as f:
        for i, line in enumerate(f, 1):
            if i > 3:  # Show first 3 examples
                break
            try:
                play = json.loads(line.strip())
                print(f"\nConverted Play {i}:")
                print(f"  Structure: {json.dumps(play, indent=4)}")
                
                if i == 1:
                    template = play
                    
            except json.JSONDecodeError as e:
                print(f"Error parsing line {i}: {e}")
                continue
    
    return template


def compare_structures(firebase_template, converted_template):
    """Compare the two structures and identify differences."""
    
    print("\n📊 STRUCTURE COMPARISON:")
    print("=" * 60)
    
    if firebase_template is None:
        print("⚠️  No existing Firebase plays to compare with.")
        print("   Using converted structure as the baseline.")
        return True
    
    if converted_template is None:
        print("❌ No converted data to compare.")
        return False
    
    print("\n🔥 Firebase Structure Fields:")
    for key, value in firebase_template.items():
        value_type = type(value).__name__
        print(f"  - {key}: {value_type}")
        if isinstance(value, list) and value:
            print(f"    └─ Array element example: {type(value[0]).__name__}")
            if isinstance(value[0], dict):
                for subkey, subvalue in value[0].items():
                    print(f"       - {subkey}: {type(subvalue).__name__}")
    
    print("\n📄 Converted Data Fields:")
    for key, value in converted_template.items():
        value_type = type(value).__name__
        print(f"  - {key}: {value_type}")
        if isinstance(value, list) and value:
            print(f"    └─ Array element example: {type(value[0]).__name__}")
            if isinstance(value[0], dict):
                for subkey, subvalue in value[0].items():
                    print(f"       - {subkey}: {type(subvalue).__name__}")
    
    # Check for differences
    firebase_keys = set(firebase_template.keys())
    converted_keys = set(converted_template.keys())
    
    missing_in_converted = firebase_keys - converted_keys
    extra_in_converted = converted_keys - firebase_keys
    
    print(f"\n🔍 ANALYSIS:")
    if missing_in_converted:
        print(f"  ❌ Missing in converted data: {list(missing_in_converted)}")
    
    if extra_in_converted:
        print(f"  ⚠️  Extra in converted data: {list(extra_in_converted)}")
    
    if not missing_in_converted and not extra_in_converted:
        print(f"  ✅ Field names match!")
    
    # Check data types and deeper structure
    print(f"\n🔍 DETAILED COMPARISON:")
    for key in firebase_keys & converted_keys:
        fb_value = firebase_template[key]
        conv_value = converted_template[key]
        
        fb_type = type(fb_value).__name__
        conv_type = type(conv_value).__name__
        
        if fb_type != conv_type:
            print(f"  ❌ Type mismatch for '{key}': Firebase={fb_type}, Converted={conv_type}")
        else:
            print(f"  ✅ '{key}': {fb_type}")
            
        # Special check for dateTime format
        if key == 'dateTime':
            print(f"    Firebase value: {fb_value}")
            print(f"    Converted value: {conv_value}")
            
        # Special check for players array structure
        if key == 'players' and isinstance(fb_value, list) and isinstance(conv_value, list):
            if fb_value and conv_value:
                fb_player = fb_value[0]
                conv_player = conv_value[0]
                
                fb_player_keys = set(fb_player.keys()) if isinstance(fb_player, dict) else set()
                conv_player_keys = set(conv_player.keys()) if isinstance(conv_player, dict) else set()
                
                if fb_player_keys != conv_player_keys:
                    print(f"    ❌ Player object keys differ:")
                    print(f"      Firebase player keys: {list(fb_player_keys)}")
                    print(f"      Converted player keys: {list(conv_player_keys)}")
                else:
                    print(f"    ✅ Player object structure matches")
    
    return missing_in_converted == set() and extra_in_converted == set()


def main():
    print("Firebase Plays Structure Checker")
    print("=" * 50)
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        sys.exit(1)
    
    # Check existing Firebase structure
    firebase_template = check_existing_plays_structure(db)
    
    # Check converted data structure
    converted_template = check_converted_data_structure()
    
    # Compare structures
    structures_match = compare_structures(firebase_template, converted_template)
    
    print(f"\n{'='*60}")
    if structures_match:
        print("🎉 RESULT: Structures match! Ready for import.")
    else:
        print("⚠️  RESULT: Structure differences found. Review needed before import.")


if __name__ == '__main__':
    main()