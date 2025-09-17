#!/bin/bash

# BGStats Data Analysis Runner
# This script analyzes what games and players need to be added to Firebase

echo "Activating virtual environment..."
source firebase_env/bin/activate

echo "Running BGStats data analysis..."
python analyze_missing_data.py

echo "Deactivating virtual environment..."
deactivate