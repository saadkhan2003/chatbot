import os
import json
import requests
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# API Configuration
USE_DEEPSEEK = False  # Set to True to use DeepSeek API instead of Gemini

# Get API keys from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# Business knowledge base
BUSINESS_INFO = """
# AI Innovate Solutions - Your Premier AI Software Agency

## About Us
AI Innovate Solutions is a cutting-edge AI software development agency specializing in creating custom AI-powered applications, chatbots, and automation solutions for businesses of all sizes. With a team of experienced developers and AI specialists, we bring innovative technology solutions to solve your business challenges.

## Our Services
1. **Custom AI Application Development**
   - Web and mobile applications with AI integration
   - Enterprise software solutions
   - AI-powered dashboards and analytics platforms

2. **Chatbot Development**
   - Customer service chatbots
   - Sales and marketing chatbots
   - Internal process automation chatbots

3. **Machine Learning Solutions**
   - Predictive analytics models
   - Computer vision applications
   - Natural language processing systems

4. **AI Consultation**
   - AI strategy development
   - Technology stack recommendations
   - Implementation roadmaps

## Our Process
1. **Discovery** - We begin by understanding your business needs and objectives
2. **Strategy** - Our team develops a tailored approach to address your specific challenges
3. **Development** - We build your solution using the latest AI technologies and best practices
4. **Deployment** - We ensure smooth integration with your existing systems
5. **Support** - Ongoing maintenance and updates to keep your solution operating at peak performance

## Technologies We Use
- Python, TensorFlow, PyTorch for ML/AI development
- React, Angular, Vue.js for frontend interfaces
- Node.js, Flask, Django for backend systems
- AWS, Azure, and Google Cloud for deployment
- Various AI APIs including OpenAI, Google, and specialized services

## Why Choose Us
- **Expertise**: Our team brings years of experience in AI and software development
- **Innovation**: We stay at the forefront of AI technology advancements
- **Quality**: We deliver robust, scalable, and maintainable solutions
- **Partnership**: We work closely with you as a strategic technology partner
- **Results**: We focus on creating solutions that drive real business value

## Contact Information
- **Email**: msaad.official6@gmail.com
- **Phone**: +92 321 8685488
- **Office Hours**: Monday-Friday, 9am-6pm EST
"""

# Store chat history in memory (dictionary)
chat_history = {}

def format_response(text):
    """Format the response text to convert asterisk bullets to bold text"""
    # Convert "* text" to "**text**" (bold)
    text = re.sub(r'^\* (.+?)$', r'**\1**', text, flags=re.MULTILINE)
    # Convert "*text*" to "**text**" (if there are single asterisks)
    text = re.sub(r'(?<!\*)\*([^\*]+)\*(?!\*)', r'**\1**', text)
    return text

def call_gemini_api(prompt, conversation_text):
    """Call the Gemini API with the given prompt and conversation history"""
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{prompt}\n\nConversation history:\n{conversation_text}\n\nProvide a helpful response:"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
            "topP": 0.95,
            "topK": 40
        }
    }
    
    response = requests.post(
        f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        response_data = response.json()
        ai_message = response_data['candidates'][0]['content']['parts'][0]['text']
        # Format the response to handle asterisk bullets
        ai_message = format_response(ai_message)
        return ai_message, None
    else:
        return None, f"API Error: {response.status_code} - {response.text}"

def call_deepseek_api(conversation):
    """Call the DeepSeek API with the conversation history"""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }
    
    # Add system message to the beginning of conversation
    system_message = {"role": "system", "content": f"You are an AI assistant for AI Innovate Solutions, an AI software development agency. Use the following company information to answer customer inquiries. Always be professional, helpful, and accurate. If you don't know something specific about the company beyond what's provided, suggest the customer contact us directly.\n\n{BUSINESS_INFO}"}
    
    full_conversation = [system_message] + conversation
    
    payload = {
        "model": "deepseek-r1-chat",
        "messages": full_conversation,
        "temperature": 0.7,
        "max_tokens": 800
    }
    
    response = requests.post(
        DEEPSEEK_API_URL,
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        ai_response = response.json()
        ai_message = ai_response['choices'][0]['message']['content']
        return ai_message, None
    else:
        return None, f"API Error: {response.status_code} - {response.text}"

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_id = data.get('user_id', 'default_user')  # Unique identifier for each user
        message = data.get('message')
        
        if not message:
            return jsonify({"error": "No message provided"}), 400
            
        # Initialize chat history for this user if it doesn't exist
        if user_id not in chat_history:
            chat_history[user_id] = []
            
        # Add the user message to history
        chat_history[user_id].append({"role": "user", "content": message})
        
        # Prepare the conversation history for the API
        conversation = chat_history[user_id]
        
        # Build context with business info and conversation
        system_prompt = f"You are an AI assistant for AI Innovate Solutions, an AI software development agency. Use the following company information to answer customer inquiries. Always be professional, helpful, and accurate. If you don't know something specific about the company beyond what's provided, suggest the customer contact us directly. When using bullet points, use asterisks (*) at the start of each point.\n\n{BUSINESS_INFO}"
        
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation])
        
        # Select which API to use
        if (USE_DEEPSEEK):
            ai_message, error = call_deepseek_api(conversation)
        else:
            ai_message, error = call_gemini_api(system_prompt, conversation_text)
        
        if ai_message:
            # Add AI response to chat history
            chat_history[user_id].append({"role": "assistant", "content": ai_message})
            
            return jsonify({
                "message": ai_message,
                "history": chat_history[user_id]
            })
        else:
            return jsonify({
                "error": error or "Unknown API error",
            }), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history/<user_id>', methods=['GET'])
def get_history(user_id):
    return jsonify({"history": chat_history.get(user_id, [])})

@app.route('/api/clear/<user_id>', methods=['POST'])
def clear_history(user_id):
    if user_id in chat_history:
        chat_history[user_id] = []
        return jsonify({"message": "Chat history cleared"})
    return jsonify({"error": "User not found"}), 404

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "API is running"})

@app.route('/api/health', methods=['GET'])
def api_health_check():
    return jsonify({"status": "API is running"})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)