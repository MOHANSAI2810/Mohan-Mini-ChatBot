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


@app.route("/", methods=["GET", "POST"])
def login():
    """Login page where user enters a username before proceeding."""
    if request.method == "POST":
        username = request.form.get("username").strip()
        if username:
            session["username"] = username  # Store username in session
            return redirect("/chatbot")
    return render_template("login.html")

@app.route("/chatbot")
def index():
    """Render chatbot only if username is set."""
    
    return render_template("index.html", username=session["username"])

@app.route("/logout")
def logout():
    """Logout user and clear session."""
    session.pop("username", None)
    return redirect("/")

@app.route("/chat", methods=["POST"])
def chat():
    if "username" not in session:
        return jsonify({"error": "User not logged in"}), 401

    username = session["username"]
    user_message = request.json.get("message")

    if not user_message:
        return jsonify({"error": "No message received"}), 400

    try:
        # Retrieve or create user chat history
        user_chat = collection.find_one({"username": username})
        if not user_chat:
            user_chat = {"username": username, "chat_history": []}
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
        collection.update_one({"username": username}, {"$set": {"chat_history": chat_history}})

        return jsonify({"reply": text_response, "code": code_blocks})

    except Exception as e:
        return jsonify({"reply": "An error occurred. Please try again."})


if __name__ == "__main__":
    app.run(debug=True)