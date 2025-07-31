# rehab-companion/backend/main.py

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any # Added missing Optional, but not strictly needed without current_user
import uvicorn
import cv2
import numpy as np
import mediapipe as mp
import base64
import json
import math
import logging
import os

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- FastAPI App Initialization ---
app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AI/ML Setup (MediaPipe and Pose Landmark Processing) ---
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# --- Helper function to calculate angle between three points ---
def calculate_angle(a: List[float], b: List[float], c: List[float]) -> float:
    """Calculates the angle (in degrees) between three 3D points (x,y coordinates typically)."""
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)

    if angle > 180.0:
        angle = 360 - angle
    return angle

# --- Exercise Analysis Functions ---

def analyze_squat_form(landmarks: Any, mp_pose: Any) -> Dict[str, Any]:
    """Analyzes squat form based on MediaPipe landmarks."""
    feedback_data = {"feedback": "Adjust position for full body.", "knee_angle": None}
    
    try:
        # Get coordinates of relevant landmarks for LEFT knee angle
        left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
        left_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
        left_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]

        # Basic visibility check for the key landmarks
        if (left_hip.visibility > 0.5 and
            left_knee.visibility > 0.5 and
            left_ankle.visibility > 0.5):

            hip_coords = [left_hip.x, left_hip.y]
            knee_coords = [left_knee.x, left_knee.y]
            ankle_coords = [left_ankle.x, left_ankle.y]

            knee_angle = calculate_angle(hip_coords, knee_coords, ankle_coords)

            feedback_message = "Squat: Keep going!"
            if knee_angle > 160: # Standing straight
                feedback_message = "Squat: Start your squat!"
            elif 70 <= knee_angle <= 100: # Deep squat range
                feedback_message = "Squat: Good depth!"
            elif knee_angle < 70: # Too deep
                feedback_message = "Squat: Too deep! Don't injure yourself."
            elif 100 < knee_angle <= 160:
                feedback_message = "Squat: Go deeper!"

            feedback_data['feedback'] = feedback_message
            feedback_data['knee_angle'] = f"{knee_angle:.2f}"
        else:
            feedback_data['feedback'] = "Squat: Some landmarks not visible. Adjust position."
            logger.debug("WebSocket: Low visibility for squat landmarks.")

    except Exception as e:
        logger.error(f"WebSocket: Error analyzing squat form: {e}", exc_info=True)
        feedback_data['feedback'] = "Squat: Error in pose analysis. Try again."
    
    return feedback_data

def analyze_pushup_form(landmarks: Any, mp_pose: Any) -> Dict[str, Any]:
    """Analyzes push-up form based on MediaPipe landmarks (Rule-based initially)."""
    feedback_data = {"feedback": "Pushup: Adjust position.", "elbow_angle": None, "body_straightness": None}

    try:
        # Relevant landmarks for Push-ups (using LEFT side for example)
        left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
        left_elbow = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value]
        left_wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value]
        left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
        left_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]

        # Check visibility for key push-up landmarks
        if (left_shoulder.visibility > 0.5 and left_elbow.visibility > 0.5 and
            left_wrist.visibility > 0.5 and left_hip.visibility > 0.5 and
            left_ankle.visibility > 0.5):

            # Elbow Angle (for depth)
            elbow_coords = [left_shoulder.x, left_shoulder.y], [left_elbow.x, left_elbow.y], [left_wrist.x, left_wrist.y]
            elbow_angle = calculate_angle(*elbow_coords)
            feedback_data['elbow_angle'] = f"{elbow_angle:.2f}"

            # Body Straightness (Angle between shoulder, hip, and ankle)
            body_coords = [left_shoulder.x, left_shoulder.y], [left_hip.x, left_hip.y], [left_ankle.x, left_ankle.y]
            body_straightness_angle = calculate_angle(*body_coords)
            feedback_data['body_straightness'] = f"{body_straightness_angle:.2f}"


            feedback_message = "Pushup: Ready to go!"
            # Basic Push-up Form Rules
            if elbow_angle < 40: # Arms almost straight
                feedback_message = "Pushup: Go lower!"
            elif elbow_angle > 160: # Arms nearly locked at top
                feedback_message = "Pushup: Come down for next rep!"
            elif 70 <= elbow_angle <= 110: # Around 90 degrees at elbow
                feedback_message = "Pushup: Good depth!"

            if body_straightness_angle < 160: # Body is bending (hips sagging or raised too high)
                feedback_message += " Keep body straight!"
            
            feedback_data['feedback'] = feedback_message

        else:
            feedback_data['feedback'] = "Pushup: Ensure full side view for form."
            logger.debug("WebSocket: Low visibility for pushup landmarks.")

    except Exception as e:
        logger.error(f"WebSocket: Error analyzing pushup form: {e}", exc_info=True)
        feedback_data['feedback'] = "Pushup: Error in analysis. Try again."

    return feedback_data


# --- API Endpoints ---
# Health Check Endpoint
@app.get("/")
async def read_root():
    logger.info("GET / accessed.")
    return {"message": "FastAPI Backend is running! (No database connected)"}

# Temporary Debug Endpoint (can be removed later if not needed)
@app.get("/test")
async def test_endpoint():
    logger.info("GET /test accessed.")
    return {"status": "test endpoint reached successfully!"}

# --- WebSocket Endpoint for Real-time Video and AI Processing ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    logger.info("WebSocket: Received initial connection request for /ws.")
    try: # Outer try block for the entire websocket connection lifecycle
        await websocket.accept()
        logger.info("WebSocket: Connection accepted successfully.")

        with mp_pose.Pose(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        ) as pose:
            while True:
                try: # Inner try block for individual message processing
                    message = await websocket.receive_text()
                    data = json.loads(message)
                    image_data_b64 = data.get('image', '').split(',')[1]
                    
                    # --- NEW: Get exercise type from frontend message ---
                    exercise_type = data.get('exercise', 'squat').lower() # Default to 'squat' if not provided

                    image_bytes = base64.b64decode(image_data_b64)
                    np_arr = np.frombuffer(image_bytes, np.uint8)
                    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                    if frame is None:
                        logger.warning("WebSocket: Could not decode image frame received from client.")
                        response_data = {"feedback": "Error: Could not decode image.", "image": "data:image/jpeg;base64,"}
                        await websocket.send_text(json.dumps(response_data))
                        continue

                    frame = cv2.flip(frame, 1) # Flip horizontally (1 means around y-axis)

                    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    image_rgb.flags.writeable = False
                    results = pose.process(image_rgb)
                    image_rgb.flags.writeable = True
                    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)

                    response_data = {}
                    
                    if results.pose_landmarks:
                        landmarks = results.pose_landmarks.landmark

                        # --- DISPATCH LOGIC BASED ON EXERCISE TYPE ---
                        if exercise_type == 'squat':
                            analysis_results = analyze_squat_form(landmarks, mp_pose)
                        elif exercise_type == 'pushup':
                            analysis_results = analyze_pushup_form(landmarks, mp_pose)
                        else:
                            analysis_results = {"feedback": "Unknown exercise type. Defaulting to Squat analysis.", "knee_angle": None}
                            # Optionally, could still run squat analysis or return empty.
                            analysis_results = analyze_squat_form(landmarks, mp_pose) # Fallback

                        response_data.update(analysis_results) # Add analysis results to response

                        mp_drawing.draw_landmarks(
                            image_bgr,
                            results.pose_landmarks,
                            mp_pose.POSE_CONNECTIONS,
                            landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
                        )

                    else:
                        response_data['feedback'] = "No pose detected. Ensure good lighting and full body visibility."

                    _, buffer = cv2.imencode('.jpg', image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    processed_frame_b64 = base64.b64encode(buffer).decode('utf-8')
                    response_data['image'] = f"data:image/jpeg;base64,{processed_frame_b64}"

                    await websocket.send_text(json.dumps(response_data))

                except json.JSONDecodeError as jde:
                    logger.error(f"WebSocket: Received non-JSON message or invalid JSON: {jde}", exc_info=True)
                    try:
                        await websocket.send_text(json.dumps({"feedback": "Server error: Invalid message format.", "image": "data:image/jpeg;base64,"}))
                    except Exception as send_err:
                        logger.error(f"WebSocket: Failed to send JSON decode error back to client: {send_err}")
                except RuntimeError as re:
                    if "WebSocket is not connected" in str(re) or "Cannot call receive_text" in str(re):
                        logger.info("WebSocket: Client explicitly closed connection or connection became stale.")
                        break
                    else:
                        logger.error(f"WebSocket: Runtime error during communication: {re}", exc_info=True)
                        raise re
                except Exception as e:
                    logger.critical(f"WebSocket: An unexpected error occurred during message processing: {e}", exc_info=True)
                    try:
                        await websocket.send_text(json.dumps({"feedback": f"Server processing error: {e}", "image": "data:image/jpeg;base64,"}))
                    except Exception as send_err:
                        logger.error(f"WebSocket: Failed to send generic error back to client: {send_err}")

    except WebSocketDisconnect:
        logger.info("WebSocket: Client disconnected gracefully from /ws.")
    except Exception as e:
        logger.critical(f"WebSocket: Critical error before or during connection acceptance: {e}", exc_info=True)

# --- Run the FastAPI application ---
if __name__ == "__main__":
    logger.info("Starting Uvicorn server for FastAPI application...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) # Using reload=True for convenience