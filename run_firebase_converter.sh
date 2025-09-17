#!/bin/bash

# Firebase Data Converter Runner
# This script activates the virtual environment and runs the Firebase converter

echo "Activating virtual environment..."
source firebase_env/bin/activate

echo "Running Firebase converter..."
python firebase_converter.py

echo "Deactivating virtual environment..."
deactivate