import re
import time
from flask import Flask, render_template, request, jsonify, redirect, session
import google.generativeai as genai
from pymongo import MongoClient
from datetime import datetime
import secrets

secret_key1 = secrets.token_hex(32)

app = Flask(__name__)
app.secret_key = secret_key1  # Required for session management

# Configure Gemini API
genai.configure(api_key="AIzaSyBwWydwEAt66jKarUSfpAxSnXkAM0KJmtg")

# Define Gemini model
model = genai.GenerativeModel("gemini-1.5-flash")

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["chatbot_db"]
collection = db["chat_history"]

# Inappropriate keywords filter
INAPPROPRIATE_KEYWORDS = ["adult", "porn", "sex", "violence", "drugs", "hate"]

def is_inappropriate(content):
    """Check if content contains inappropriate keywords."""
    content = content.lower()
    return any(keyword in content for keyword in INAPPROPRIATE_KEYWORDS)

import re

def extract_code(response_text):
    """
    Extracts code blocks from the response and replaces them with placeholders.
    """
    code_blocks = re.findall(r"```(.*?)```", response_text, re.DOTALL)
    text_without_code = re.sub(r"```.*?```", "[CODE_BLOCK]", response_text, flags=re.DOTALL).strip()

    return text_without_code, code_blocks

import os
import base64
import requests

# Clarifai API credentials
CLARIFAI_API_KEY = "8da60f31881f4f0eb4696fff7c67dda9"
CLARIFAI_MODEL_URL = "https://api.clarifai.com/v2/models/general-image-recognition/versions/aa7f35c01e0642fda5cf400f543e7c40/outputs"

def analyze_image_with_clarifai(image_path):
    """Send the image to Clarifai API and return the analysis results."""
    with open(image_path, "rb") as image_file:
        # Encode the image as base64
        image_data = base64.b64encode(image_file.read()).decode("utf-8")

    headers = {
        "Authorization": f"Key {CLARIFAI_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "inputs": [
            {
                "data": {
                    "image": {
                        "base64": image_data,
                    }
                }
            }
        ]
    }

    try:
        response = requests.post(CLARIFAI_MODEL_URL, headers=headers, json=payload)
        response.raise_for_status()
        results = response.json()

        # Extract concepts (labels and confidence scores) from the response
        concepts = results["outputs"][0]["data"]["concepts"]
        labels_with_scores = [(concept["name"], concept["value"]) for concept in concepts]
        return labels_with_scores
    except Exception as e:
        print(f"Error analyzing image with Clarifai: {e}")
        return None

def generate_paragraph_with_gemini(labels_with_scores):
    """Send the Clarifai response to Gemini API and generate a descriptive paragraph."""
    # Format the labels and scores as a string
    labels_text = ", ".join([f"{label} ({score * 100:.2f}%)" for label, score in labels_with_scores])

    # Create a prompt for Gemini
    prompt = f"Describe the following image contents in a paragraph: {labels_text}"

    try:
        # Generate a response using Gemini API
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating paragraph with Gemini: {e}")
        return None

@app.route("/upload-image", methods=["POST"])
def upload_image():
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image uploaded"}), 400

    image = request.files["image"]
    if image.filename == "":
        return jsonify({"success": False, "error": "No selected file"}), 400

    # Validate file type
    allowed_extensions = {"png", "jpg", "jpeg"}
    if "." in image.filename and image.filename.split(".")[-1].lower() in allowed_extensions:
        # Save the image temporarily
        image_path = os.path.join("uploads", image.filename)
        image.save(image_path)

        # Analyze the image using Clarifai API
        labels_with_scores = analyze_image_with_clarifai(image_path)

        # Clean up: Delete the temporary image file
        os.remove(image_path)

        if labels_with_scores:
            # Send the Clarifai response to Gemini API
            paragraph = generate_paragraph_with_gemini(labels_with_scores)

            if paragraph:
                # Store the file name and Gemini response in MongoDB
                username = session.get("username")
                if not username:
                    return jsonify({"success": False, "error": "User not logged in"}), 401

                chat_key = get_today_chat_key(username)
                user_chat = collection.find_one({"_id": chat_key})
                if not user_chat:
                    user_chat = {"_id": chat_key, "username": username, "chat_history": []}
                    collection.insert_one(user_chat)

                # Add the image request and Gemini response to the chat history
                chat_entry = {
                    "user": image.filename,  # Store the file name as the user message
                    "bot": paragraph,       # Store the Gemini response as the bot message
                    "code": [],              # No code blocks for image requests
                }
                user_chat["chat_history"].append(chat_entry)
                collection.update_one({"_id": chat_key}, {"$set": {"chat_history": user_chat["chat_history"]}})

                return jsonify({
                    "success": True,
                    "message": "Image analyzed successfully",
                    "paragraph": paragraph,
                })
            else:
                return jsonify({"success": False, "error": "Failed to generate paragraph"}), 500
        else:
            return jsonify({"success": False, "error": "Failed to analyze image"}), 500
    else:
        return jsonify({"success": False, "error": "Invalid file type"}), 400
    
        
def get_today_chat_key(username):
    """Generate today's date key for the user's chat document."""
    today_date = datetime.now().strftime("%Y-%m-%d")
    return f"chat on {today_date} - {username}"

@app.route("/", methods=["GET", "POST"])
def login():
    """Login page where user enters a username before proceeding."""
    if request.method == "POST":
        username = request.form.get("username").strip()
        if username:
            session["username"] = username  # Store username in session
            return redirect("/chatbot")
    return render_template("login.html")

@app.route("/get_history", methods=["GET"])
def get_history():
    if "username" not in session:
        return jsonify({"error": "User not logged in"}), 401

    username = session["username"]
    # Fetch all chat documents for the user
    user_chats = collection.find({"username": username})
    
    history = [{"chat_id": chat["_id"], "date": chat["_id"].split(" - ")[0]} for chat in user_chats]
    return jsonify({"history": history})


@app.route("/chatbot")
def index():
    """Render chatbot only if username is set."""
    return render_template("index.html", username=session["username"])

@app.route("/logout")
def logout():
    """Logout user and clear session."""
    session.pop("username", None)
    return redirect("/")

@app.route("/load_chat_history/<chat_id>", methods=["GET"])
def load_chat_history(chat_id):
    if "username" not in session:
        return jsonify({"error": "User not logged in"}), 401

    # Fetch the chat document by chat_id
    user_chat = collection.find_one({"_id": chat_id})
    
    if user_chat:
        return jsonify({"chat_history": user_chat["chat_history"]})
    return jsonify({"error": "Chat history not found"})

@app.route("/get-username")
def get_username():
    username = session.get("username", "Guest")  # Default to "Guest" if no user is logged in
    return jsonify({"username": username})

@app.route("/chat", methods=["POST"])
def chat():
    if "username" not in session:
        return jsonify({"error": "User not logged in"}), 401

    username = session["username"]
    user_message = request.json.get("message")

    if not user_message:
        return jsonify({"error": "No message received"}), 400

    try:
        # Generate the key for today's chat document
        chat_key = get_today_chat_key(username)

        # Retrieve or create user chat history for today's date
        user_chat = collection.find_one({"_id": chat_key})
        if not user_chat:
            user_chat = {"_id": chat_key, "username": username, "chat_history": []}
            collection.insert_one(user_chat)

        chat_history = user_chat["chat_history"]
        chat_context = "\n".join([f"User: {chat['user']}\nAI: {chat['bot']}" for chat in chat_history])

        # Generate AI response
        context = chat_context + f"\nUser: {user_message}\nAI:"
        response = model.generate_content(context)

        # Process the response
        bot_reply = response.text.strip() if response else "I couldn't process that."
        bot_reply = bot_reply.replace("Bot:", "").replace("AI:", "").strip()

        # Extract code blocks and main text separately
        text_response, code_blocks = extract_code(bot_reply)

        # Store chat history in MongoDB
        chat_entry = {"user": user_message, "bot": text_response, "code": code_blocks}
        chat_history.append(chat_entry)
        collection.update_one({"_id": chat_key}, {"$set": {"chat_history": chat_history}})

        return jsonify({"reply": text_response, "code": code_blocks})

    except Exception as e:
        return jsonify({"reply": "An error occurred. Please try again."})

if __name__ == "__main__":
    app.run(debug=True)