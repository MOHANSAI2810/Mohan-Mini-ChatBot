from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import time
import re

app = Flask(__name__)

# Configure the Gemini API
genai.configure(api_key="AIzaSyBwWydwEAt66jKarUSfpAxSnXkAM0KJmtg")

# Define the Gemini model
model = genai.GenerativeModel("gemini-1.5-flash")

# List of inappropriate keywords
INAPPROPRIATE_KEYWORDS = ["adult", "porn", "sex", "violence", "drugs", "hate"]

def is_inappropriate(content):
    """Check if the content contains inappropriate keywords."""
    content = content.lower()
    return any(keyword in content for keyword in INAPPROPRIATE_KEYWORDS)

def extract_code(text):
    """Extracts code blocks from the response."""
    code_blocks = re.findall(r"```(.*?)```", text, re.DOTALL)
    return code_blocks

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message")
    if not user_message:
        return jsonify({"error": "No message received"}), 400

    if is_inappropriate(user_message):
        return jsonify({"reply": "Sorry, I cannot respond to that."})

    try:
        # Simulate thinking delay
        time.sleep(1.5)
        response = model.generate_content(user_message)
        bot_reply = response.text if response else "I couldn't process that."

        # Extract code if present
        code_blocks = extract_code(bot_reply)
        return jsonify({"reply": bot_reply, "code": code_blocks})
    except Exception:
        return jsonify({"reply": "An error occurred. Please try again."})

if __name__ == "__main__":
    app.run(debug=True)
