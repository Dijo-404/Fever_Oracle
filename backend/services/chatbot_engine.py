"""
Chatbot engine for intelligent symptom checking
Rule-based system with dynamic question flow
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
import random

class ChatbotEngine:
    """Rule-based chatbot for symptom assessment"""
    
    def __init__(self):
        self.symptom_questions = {
            "initial": {
                "question": "Hello! I'm here to help assess your symptoms. Do you currently have a fever?",
                "type": "yes_no",
                "key": "has_fever"
            },
            "fever_duration": {
                "question": "How long have you had the fever?",
                "type": "choice",
                "options": ["Less than 24 hours", "1-3 days", "4-7 days", "More than a week"],
                "key": "fever_duration"
            },
            "temperature": {
                "question": "What is your current body temperature? (in Celsius)",
                "type": "number",
                "key": "temperature",
                "min": 35.0,
                "max": 42.0
            },
            "symptoms": {
                "question": "Do you have any of these symptoms? (Select all that apply)",
                "type": "multi_choice",
                "options": [
                    "Headache", "Body aches", "Chills", "Sweating", 
                    "Nausea", "Vomiting", "Diarrhea", "Rash",
                    "Cough", "Sore throat", "Runny nose", "Difficulty breathing"
                ],
                "key": "symptoms"
            },
            "travel_history": {
                "question": "Have you traveled recently? (within the last 2 weeks)",
                "type": "yes_no",
                "key": "travel_history"
            },
            "travel_location": {
                "question": "Where did you travel to?",
                "type": "text",
                "key": "travel_location"
            },
            "mosquito_exposure": {
                "question": "Have you noticed any mosquito bites recently?",
                "type": "yes_no",
                "key": "mosquito_exposure"
            },
            "age": {
                "question": "What is your age?",
                "type": "number",
                "key": "age",
                "min": 0,
                "max": 120
            },
            "gender": {
                "question": "What is your gender?",
                "type": "choice",
                "options": ["Male", "Female", "Other", "Prefer not to say"],
                "key": "gender"
            },
            "comorbidities": {
                "question": "Do you have any existing medical conditions? (Select all that apply)",
                "type": "multi_choice",
                "options": [
                    "Diabetes", "Hypertension", "Heart disease", "Asthma",
                    "Kidney disease", "Liver disease", "None"
                ],
                "key": "comorbidities"
            }
        }
        
        self.fever_type_patterns = {
            "Dengue": {
                "symptoms": ["rash", "body aches", "headache", "mosquito_exposure"],
                "temperature_range": (38.5, 41.0),
                "duration_range": (3, 7),
                "risk_factors": ["mosquito_exposure", "travel_history"]
            },
            "Malaria": {
                "symptoms": ["chills", "sweating", "body aches", "mosquito_exposure"],
                "temperature_range": (38.0, 40.5),
                "duration_range": (1, 14),
                "risk_factors": ["mosquito_exposure", "travel_history"]
            },
            "Typhoid": {
                "symptoms": ["headache", "body aches", "diarrhea", "nausea"],
                "temperature_range": (38.0, 40.0),
                "duration_range": (7, 14),
                "risk_factors": ["travel_history", "diarrhea"]
            },
            "Viral Fever": {
                "symptoms": ["cough", "sore throat", "runny nose", "headache"],
                "temperature_range": (37.5, 39.0),
                "duration_range": (1, 7),
                "risk_factors": []
            },
            "COVID-19": {
                "symptoms": ["cough", "difficulty breathing", "loss of taste", "loss of smell"],
                "temperature_range": (37.5, 39.5),
                "duration_range": (1, 14),
                "risk_factors": ["travel_history"]
            }
        }
    
    def get_next_question(self, session_data: Dict, current_step: str) -> Optional[Dict]:
        """Determine next question based on current session data"""
        
        # Initial question
        if current_step == "start" or not current_step:
            return self.symptom_questions["initial"]
        
        # If no fever, skip to general assessment
        if current_step == "initial" and not session_data.get("has_fever"):
            return {
                "question": "Since you don't have a fever, I recommend consulting a doctor for other symptoms. Is there anything else I can help with?",
                "type": "end",
                "key": "no_fever"
            }
        
        # Fever flow
        if current_step == "initial" and session_data.get("has_fever"):
            return self.symptom_questions["fever_duration"]
        
        if current_step == "fever_duration":
            return self.symptom_questions["temperature"]
        
        if current_step == "temperature":
            return self.symptom_questions["symptoms"]
        
        if current_step == "symptoms":
            # Check for mosquito-related symptoms
            symptoms = session_data.get("symptoms", [])
            if any(s in ["rash", "body aches", "chills"] for s in symptoms):
                return self.symptom_questions["mosquito_exposure"]
            return self.symptom_questions["travel_history"]
        
        if current_step == "mosquito_exposure":
            return self.symptom_questions["travel_history"]
        
        if current_step == "travel_history":
            if session_data.get("travel_history"):
                return self.symptom_questions["travel_location"]
            return self.symptom_questions["age"]
        
        if current_step == "travel_location":
            return self.symptom_questions["age"]
        
        if current_step == "age":
            return self.symptom_questions["gender"]
        
        if current_step == "gender":
            return self.symptom_questions["comorbidities"]
        
        # End of questions
        if current_step == "comorbidities":
            return None
        
        return None
    
    def analyze_symptoms(self, session_data: Dict) -> Dict:
        """Analyze symptoms and provide recommendation"""
        symptoms = [s.lower() for s in session_data.get("symptoms", [])]
        temperature = session_data.get("temperature", 37.0)
        fever_duration = session_data.get("fever_duration", "")
        
        # Calculate risk score
        risk_score = 0
        if temperature > 39.0:
            risk_score += 30
        elif temperature > 38.5:
            risk_score += 20
        elif temperature > 38.0:
            risk_score += 10
        
        if "difficulty breathing" in symptoms:
            risk_score += 25
        if "rash" in symptoms:
            risk_score += 15
        if "diarrhea" in symptoms:
            risk_score += 10
        
        # Determine suspected fever type
        suspected_type = "Viral Fever"  # Default
        max_match = 0
        
        for fever_type, pattern in self.fever_type_patterns.items():
            match_score = 0
            
            # Check symptoms
            for symptom in pattern["symptoms"]:
                if symptom in symptoms or symptom.replace("_", " ") in symptoms:
                    match_score += 2
            
            # Check temperature range
            temp_min, temp_max = pattern["temperature_range"]
            if temp_min <= temperature <= temp_max:
                match_score += 1
            
            # Check risk factors
            for risk_factor in pattern["risk_factors"]:
                if session_data.get(risk_factor):
                    match_score += 1
            
            if match_score > max_match:
                max_match = match_score
                suspected_type = fever_type
        
        # Generate recommendation
        recommendation = self._generate_recommendation(suspected_type, risk_score, temperature)
        
        return {
            "suspected_fever_type": suspected_type,
            "risk_score": min(100, risk_score),
            "recommendation": recommendation,
            "confidence": min(95, 60 + max_match * 5)
        }
    
    def _generate_recommendation(self, fever_type: str, risk_score: int, temperature: float) -> str:
        """Generate personalized recommendation"""
        recommendations = {
            "Dengue": f"Based on your symptoms, you may have Dengue fever. Your temperature is {temperature}°C. Please consult a doctor immediately, especially if you have severe symptoms. Rest, stay hydrated, and avoid medications like aspirin.",
            "Malaria": f"Your symptoms suggest possible Malaria. With a temperature of {temperature}°C, please see a doctor for proper diagnosis and treatment. Early treatment is important.",
            "Typhoid": f"Your symptoms may indicate Typhoid fever. Given your temperature of {temperature}°C, please consult a healthcare provider for proper diagnosis and antibiotics if needed.",
            "Viral Fever": f"You appear to have a viral fever. Your temperature is {temperature}°C. Rest, stay hydrated, and take paracetamol if needed. If symptoms persist or worsen, consult a doctor.",
            "COVID-19": f"Your symptoms could indicate COVID-19. Please get tested and isolate yourself. Monitor your symptoms closely, especially breathing difficulties. Seek immediate medical attention if breathing becomes difficult."
        }
        
        base_recommendation = recommendations.get(fever_type, recommendations["Viral Fever"])
        
        if risk_score > 70:
            base_recommendation += " ⚠️ HIGH RISK: Please seek medical attention immediately."
        elif risk_score > 50:
            base_recommendation += " ⚠️ Please monitor your symptoms and consult a doctor soon."
        
        return base_recommendation

# Global chatbot engine instance
chatbot_engine = ChatbotEngine()


