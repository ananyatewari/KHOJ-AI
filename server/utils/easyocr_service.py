#!/usr/bin/env python3
"""
EasyOCR service for handwriting recognition
Run with: python easyocr_service.py
"""
import sys
import os
import json
import argparse
import easyocr
from flask import Flask, request, jsonify

app = Flask(__name__)

# Initialize the EasyOCR reader
reader = None

def initialize_reader(languages=['en']):
    """Initialize the EasyOCR reader with specified languages"""
    global reader
    if reader is None:
        print(f"Initializing EasyOCR with languages: {languages}")
        reader = easyocr.Reader(languages)
    return reader

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"})

@app.route('/recognize', methods=['POST'])
def recognize_text():
    """
    Endpoint to recognize text from an image
    Expects a form with a file field named 'image'
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    
    # Save the uploaded file temporarily
    temp_path = os.path.join('/tmp', file.filename)
    file.save(temp_path)
    
    try:
        # Ensure reader is initialized
        reader = initialize_reader()
        
        # Recognize text - include bounding boxes and confidence scores
        results = reader.readtext(temp_path, detail=1)
        
        # Process results into a format compatible with our Node.js app
        processed_results = {
            "text": " ".join([item[1] for item in results]),
            "words": []
        }
        
        for item in results:
            box, text, confidence = item
            
            # EasyOCR returns boxes as 4 corner points
            # Convert to x0, y0, x1, y1 format
            tl, tr, br, bl = box  # top-left, top-right, bottom-right, bottom-left
            x0 = min(tl[0], bl[0])
            y0 = min(tl[1], tr[1])
            x1 = max(tr[0], br[0])
            y1 = max(bl[1], br[1])
            
            processed_results["words"].append({
                "text": text,
                "confidence": float(confidence),
                "bbox": {
                    "x0": int(x0),
                    "y0": int(y0),
                    "x1": int(x1),
                    "y1": int(y1)
                }
            })
        
        # Clean up temp file
        os.remove(temp_path)
        
        return jsonify(processed_results)
        
    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        print(f"Error processing image: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run EasyOCR service')
    parser.add_argument('--port', type=int, default=5000, help='Port to run the service on')
    parser.add_argument('--languages', type=str, default='en', help='Comma separated language codes')
    
    args = parser.parse_args()
    languages = args.languages.split(',')
    
    # Initialize EasyOCR with the specified languages
    initialize_reader(languages)
    
    print(f"Starting EasyOCR service on port {args.port}")
    app.run(host='0.0.0.0', port=args.port)