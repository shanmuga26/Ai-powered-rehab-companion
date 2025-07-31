# 🏋️‍♂️ AI Rehab Companion – Your Personal AI-Powered Physiotherapy Assistant

**AI Rehab Companion** is a real-time, full-stack web application that transforms your webcam into a smart personal trainer for rehabilitation and fitness. Powered by computer vision and voice interaction, it **analyzes exercise form**, **counts reps**, and gives **instant feedback and guidance** — all from the comfort of your home.

> 💡 Built for physiotherapy patients, fitness enthusiasts, and rehab professionals, this intelligent assistant ensures users perform movements safely and correctly.

---

## 🚀 Key Features

### 🎯 Real-Time Pose Detection  
- Detects and tracks **33 anatomical landmarks** using **MediaPipe Pose**.  
- Works directly with your webcam — no special equipment needed.

### 🧠 Smart Exercise Analysis  
- Tracks joint angles to **analyze form** for exercises like **Squats** and **Push-ups**.  
- Provides real-time feedback like _“Go deeper!”_ or _“Keep body straight!”_ using rule-based logic.

### 🔢 Automatic Repetition Counter  
- Counts reps accurately using joint movement logic.  
- Displays live rep count on screen.

### 🗣️ Voice Feedback  
- Integrated **Text-to-Speech** speaks current action aloud, so users can **focus on movement, not the screen**.

### 🧘 Clean, Responsive UI  
- Built with **React** and **Material UI** for a sleek, mobile-friendly interface.  
- Exercise selection, rep tracking, and feedback are all clearly visible and intuitive.

### 🔌 Real-Time Communication  
- Utilizes **WebSockets** for low-latency video stream processing between frontend and backend.

---

## 🧰 Tech Stack

| Layer        | Technologies Used |
|--------------|-------------------|
| **Frontend** | React.js, Vite, Material UI, WebSockets, Web Speech API |
| **Backend**  | Python, FastAPI, Uvicorn, MediaPipe, OpenCV, NumPy |

---

## 📸 How It Works

1. **User selects an exercise** (Squats or Push-ups).
2. **Webcam feed is captured** and streamed to the backend via WebSocket.
3. **MediaPipe** estimates pose landmarks.
4. **Joint angles are calculated** to assess correctness.
5. **Rules are applied** to detect posture and count repetitions.
6. **Feedback is shown** and spoken using **Web Speech API**.

---

## ⚙️ Getting Started

### ✅ Prerequisites

- [Python 3.8+](https://www.python.org/downloads/)
- [Node.js & npm](https://nodejs.org/en/download/)
- [Git](https://git-scm.com/downloads)
- [Visual Studio Code](https://code.visualstudio.com/)
- A **working webcam**

