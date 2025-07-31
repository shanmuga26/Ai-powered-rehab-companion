# AI Rehab Companion

An AI-powered full-stack web application designed to act as a personal rehabilitation and exercise assistant. It leverages real-time computer vision to analyze user form during exercises, provides immediate feedback, counts repetitions, and offers voice guidance to help users perform movements correctly.

This project showcases the integration of modern frontend frameworks (React with Material UI) with a high-performance Python backend (FastAPI) for real-time AI inference (MediaPipe).

## Features

* **Real-time Pose Estimation:** Utilizes Google's MediaPipe to detect and track 33 key anatomical landmarks on the user's body from a live webcam feed.

* **Exercise Selection:** Allows users to choose between different exercises (currently Squats and Push-ups).

* **Rule-Based Form Analysis:** Provides immediate, contextual feedback on exercise form (e.g., "Go deeper!", "Keep body straight!") based on joint angles and body positioning.

* **Automatic Repetition Counting:** Tracks and displays completed repetitions for the selected exercise.

* **Voice Guidance:** Speaks the "Current Action" feedback aloud, making the assistant more interactive and allowing users to focus on their form without constantly looking at the screen.

* **Responsive & Attractive UI:** Built with Material UI for a clean, modern, and adaptive user interface.

* **Real-time Communication:** Uses WebSockets for low-latency streaming of video frames and feedback between the frontend and backend.

## Tech Stack

**Frontend (Client-side):**

* **React.js:** JavaScript library for building dynamic user interfaces.

* **Material UI (MUI):** A comprehensive React component library implementing Google's Material Design for a polished UI.

* **WebSockets:** Enables real-time, bidirectional communication with the backend for video streaming and feedback.

* **Web Speech API:** Browser-native API used for Text-to-Speech (TTS) to provide voice guidance.

* **Vite:** A fast and efficient build tool for modern web development.

**Backend (Server-side):**

* **Python:** The core programming language for server logic and AI processing.

* **FastAPI:** A modern, high-performance web framework for building APIs and handling WebSockets.

* **Uvicorn:** An ASGI server that runs the FastAPI application.

* **MediaPipe Pose:** Google's pre-trained AI model for robust human pose estimation.

* **OpenCV (`cv2`):** Used for image processing tasks like decoding/encoding video frames.

* **NumPy:** Fundamental library for numerical operations on pose data.

## Setup Instructions

Follow these steps to get the project running on your local machine.

### Prerequisites

* **Python 3.8+:** [Download from python.org](https://www.python.org/downloads/)

* **Node.js & npm:** [Download LTS version from nodejs.org](https://nodejs.org/en/download/)

* **Git:** [Download from git-scm.com](https://git-scm.com/downloads)

* **Visual Studio Code (VS Code):** Recommended IDE. [Download from code.visualstudio.com](https://code.google.com/url?q=https://code.visualstudio.com/&sa=D&sntz=1&usg=AOvVaw2B176g41_zG_z0tN_d_3-B)

* **Webcam:** Required for pose estimation.




