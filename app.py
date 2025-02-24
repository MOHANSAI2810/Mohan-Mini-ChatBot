import re
import time
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai

app = Flask(__name__)

# Configure Gemini API
genai.configure(api_key="AIzaSyBwWydwEAt66jKarUSfpAxSnXkAM0KJmtg")

# Define Gemini model
model = genai.GenerativeModel("gemini-1.5-flash")

# Inappropriate keywords filter
INAPPROPRIATE_KEYWORDS = ["adult", "porn", "sex", "violence", "drugs", "hate"]

def is_inappropriate(content):
    """Check if content contains inappropriate keywords."""
    content = content.lower()
    return any(keyword in content for keyword in INAPPROPRIATE_KEYWORDS)

def extract_code(text):
    """Extracts properly formatted code blocks from the response."""
    matches = re.findall(r"```(?:python)?\n(.*?)```", text, re.DOTALL)
    return matches

def format_message_with_code(text):
    """Embed code snippets in the correct position inside the text message."""
    code_blocks = extract_code(text)
    text = re.sub(r"```.*?```", "[CODE_SNIPPET]", text, flags=re.DOTALL).strip()

    text_parts = text.split("[CODE_SNIPPET]")
    formatted_parts = []

    for i, part in enumerate(text_parts):
        formatted_parts.append(part.strip())
        if i < len(code_blocks):
            formatted_parts.append(f"<pre><code>{code_blocks[i].strip()}</code></pre>")

    return "<br>".join(formatted_parts)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message")
    chat_history = request.json.get("history", [])

    if not user_message:
        return jsonify({"error": "No message received"}), 400

    if is_inappropriate(user_message):
        return jsonify({"reply": "Sorry, I cannot respond to that."})

    try:
        time.sleep(1.5)  # Simulating delay
        context = "\n".join(chat_history) + "\nUser: " + user_message
        response = model.generate_content(context)
        bot_reply = response.text if response else "I couldn't process that."

        formatted_reply = format_message_with_code(bot_reply)
        return jsonify({"reply": formatted_reply})
    except Exception as e:
        return jsonify({"reply": "An error occurred. Please try again."})

if __name__ == "__main__":
    app.run(debug=True)
