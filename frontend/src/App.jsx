// rehab-companion/frontend/src/App.jsx

import React, { useRef, useEffect, useState, useCallback } from 'react'; // Added useCallback
import './App.css';

// Import Material UI components
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Alert,
  AlertTitle,
  Stack,
  useTheme,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

// Import Material UI Icons
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CameraAltIcon from '@mui/icons-material/CameraAlt';


function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const ws = useRef(null);
  const intervalRef = useRef(null); // Ref to store interval ID for clearing

  const [isConnected, setIsConnected] = useState(false);
  const [feedback, setFeedback] = useState("Connecting to server...");
  const [metricData, setMetricData] = useState([]);
  const [repsCompleted, setRepsCompleted] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [cameraAccessDenied, setCameraAccessDenied] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraAspectRatio, setCameraAspectRatio] = useState(16 / 9);

  const [selectedExercise, setSelectedExercise] = useState('squat');

  const theme = useTheme();

  // Ref to store the last spoken feedback and its timestamp for rate limiting
  const lastSpokenFeedback = useRef({ text: '', timestamp: 0 });
  const SPEAK_COOLDOWN_MS = 2000; // Only speak if 2 seconds have passed since last speech

  // --- REFINED: sendFrame as useCallback. Now correctly depends on selectedExercise ---
  // This function will be recreated whenever selectedExercise changes, ensuring it captures the latest value.
  const sendFrame = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && videoRef.current && videoRef.current.readyState === 4) {
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;

      const targetWidth = 320;
      const scaleFactor = targetWidth / videoWidth;
      
      const canvas = document.createElement('canvas'); // Create canvas locally for each sendFrame call
      const ctx = canvas.getContext('2d');
      
      canvas.width = targetWidth;
      canvas.height = videoHeight * scaleFactor;

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL('image/jpeg', 0.5);

      // This will now use the latest selectedExercise because sendFrame is recreated when it changes
      ws.current.send(JSON.stringify({ image: imageData, exercise: selectedExercise }));
    }
  }, [selectedExercise]); // Dependency array: selectedExercise is now a dependency

  // --- REFINED: Main useEffect for WebSocket setup and cleanup (runs once on mount) ---
  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8000/ws");

    ws.current.onopen = () => {
      console.log("WebSocket connected!");
      setIsConnected(true);
      setFeedback("Webcam initializing...");
      // Removed startWebcam call from here. It will be called by the `useEffect` below.
    };

    ws.current.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        const imgUrl = response.image;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          if (cameraLoading && img.width > 0 && img.height > 0) {
            setCameraAspectRatio(img.width / img.height);
            setCameraLoading(false);
          }
        };
        img.src = imgUrl;

        if (response.feedback) {
          setFeedback(response.feedback);
        }

        setRepsCompleted(response.reps_completed || 0);
        setCurrentStage(response.stage || '');
        
        const newMetrics = [];
        if (response.knee_angle) { newMetrics.push(`Knee Angle: ${response.knee_angle}°`); }
        if (response.elbow_angle) { newMetrics.push(`Elbow Angle: ${response.elbow_angle}°`); }
        if (response.body_straightness) { newMetrics.push(`Body Straightness: ${response.body_straightness}°`); }
        setMetricData(newMetrics);

      } catch (error) {
        console.error("Failed to parse WebSocket message:", error, event.data);
        setFeedback("Error processing server response.");
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected.");
      setIsConnected(false);
      setFeedback("Disconnected. Please refresh.");
      setMetricData([]);
      setRepsCompleted(0);
      setCurrentStage('');
      setCameraLoading(true);
      clearInterval(intervalRef.current); // Ensure interval is cleared
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setFeedback("Error connecting to server. Check backend and refresh.");
      setMetricData([]);
      setRepsCompleted(0);
      setCurrentStage('');
      setCameraLoading(true);
      clearInterval(intervalRef.current); // Ensure interval is cleared
    };

    // Cleanup WebSocket and interval on unmount
    return () => {
      if (ws.current) { ws.current.close(); }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      clearInterval(intervalRef.current);
    };
  }, []); // Empty dependency array: WebSocket setup runs only once on mount


  // --- NEW useEffect to manage camera access and the frame sending interval ---
  // This useEffect will re-run whenever isConnected, cameraAccessDenied, or sendFrame changes.
  // When sendFrame changes (because selectedExercise changed), this effect will clear and restart the interval.
  useEffect(() => {
    const setupCameraAndInterval = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setFeedback("Browser does not support webcam.");
        setCameraAccessDenied(true);
        setCameraLoading(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        videoRef.current.onloadedmetadata = () => {
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          if (videoWidth > 0 && videoHeight > 0) {
            setCameraAspectRatio(videoWidth / videoHeight);
            setCameraLoading(false);
          }
        };
        setFeedback("Webcam started. Processing video...");
        setCameraAccessDenied(false);

        // Clear any existing interval before setting a new one
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(sendFrame, 1000 / 10); // Start the new interval

      } catch (err) {
        console.error("Error accessing webcam: ", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setFeedback("Webcam access denied. Please allow camera permissions.");
          setCameraAccessDenied(true);
        } else {
          setFeedback("Error accessing webcam. Please check your device.");
        }
        setCameraLoading(false);
      }
    };

    // Only set up camera and interval if connected and not denied, and if it's not already running/set up.
    // The `sendFrame` dependency will cause this effect to re-run and reset the interval when selectedExercise changes.
    if (isConnected && !cameraAccessDenied) {
        // We only call setupCameraAndInterval if the interval is not yet running OR if sendFrame has changed (due to exercise selection)
        // A simple check like this ensures we don't spam webcam access or interval setup
        if (!intervalRef.current) { // Only set up if not already running a valid interval
          setupCameraAndInterval();
        } else {
          // If interval is already running, but sendFrame dependency changed, it means selectedExercise changed.
          // In this case, we need to clear and restart the interval immediately to pick up the new sendFrame.
          // This is handled by the `return () => { clearInterval(intervalRef.current); }` cleanup,
          // which will clear the old interval before this effect re-runs.
          // Then, a new interval will be set up by the next effect cycle.
          clearInterval(intervalRef.current); // Manually clear the old interval
          intervalRef.current = setInterval(sendFrame, 1000 / 10); // Start the new interval
        }
    } else { // If disconnected or camera denied, ensure interval is cleared
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup function for this useEffect
    // This runs before the effect re-runs or when the component unmounts.
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null; // Ensure ref is nulled
      }
    };
  }, [isConnected, cameraAccessDenied, sendFrame]); // Crucial dependencies: sendFrame (which depends on selectedExercise)

  // --- NEW useEffect for Speech Synthesis (Voice Output) ---
  useEffect(() => {
    // Only speak if feedback is not empty, and if a certain cooldown has passed since the last speech
    const currentTime = Date.now();
    if (
      feedback &&
      feedback !== lastSpokenFeedback.current.text && // Avoid speaking the same feedback repeatedly
      (currentTime - lastSpokenFeedback.current.timestamp > SPEAK_COOLDOWN_MS)
    ) {
      const utterance = new SpeechSynthesisUtterance(feedback);
      // Optional: Configure voice properties (you can choose a specific voice, pitch, rate)
      // For example, to find available voices:
      // speechSynthesis.onvoiceschanged = () => {
      //   console.log(speechSynthesis.getVoices());
      // };
      // utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === 'Google US English');
      utterance.pitch = 1; // Default is 1, range 0 to 2
      utterance.rate = 1; // Default is 1, range 0.1 to 10

      speechSynthesis.speak(utterance);

      // Update the ref with the spoken feedback and timestamp
      lastSpokenFeedback.current = { text: feedback, timestamp: currentTime };
    }
  }, [feedback]); // Dependency array: Re-run this effect when `feedback` changes

  const handleExerciseChange = (event) => {
    const newExercise = event.target.value;
    setSelectedExercise(newExercise);
    setMetricData([]);
    setRepsCompleted(0);
    setCurrentStage('');
    setFeedback(`Selected: ${newExercise}. Adjust position for ${newExercise}.`);
    // The change in selectedExercise will cause sendFrame to be recreated,
    // which in turn will trigger the interval-managing useEffect to restart the interval.
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Stack
        spacing={2}
        mb={3}
        p={3}
        bgcolor={theme.palette.background.paper}
        borderRadius={2}
        boxShadow={6}
        width="100%"
        maxWidth="md"
      >
        <Typography variant="h4" component="h1" color="primary.main" textAlign="center">
          AI Rehab Companion
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
          {isConnected ? (
            <CheckCircleOutlineIcon sx={{ color: 'secondary.main' }} />
          ) : (
            <ErrorOutlineIcon sx={{ color: 'error.main' }} />
          )}
          <Typography variant="h6" fontWeight="fontWeightMedium">
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </Typography>
        </Stack>

        {/* Exercise Selection Dropdown */}
        <FormControl fullWidth sx={{ mt: 2, mb: 1 }}>
          <InputLabel id="exercise-select-label">Exercise</InputLabel>
          <Select
            labelId="exercise-select-label"
            id="exercise-select"
            value={selectedExercise}
            label="Exercise"
            onChange={handleExerciseChange}
          >
            <MenuItem value="squat">Squat</MenuItem>
            <MenuItem value="pushup">Push-up</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="h5" fontWeight="fontWeightBold" color="info.main" textAlign="center">
          Current Action:{" "}
          <Typography component="span" color={isConnected ? 'secondary.main' : 'error.main'}>
            {feedback}
          </Typography>
        </Typography>

        {/* Reps and Stage Display */}
        <Stack direction="row" spacing={4} justifyContent="center" mt={1}>
          <Typography variant="h6" fontWeight="bold" p={1} bgcolor="primary.dark" borderRadius={1}>
            Reps: {repsCompleted}
          </Typography>
          {currentStage && (
            <Typography variant="subtitle1" fontWeight="bold" p={1} bgcolor="primary.dark" borderRadius={1}>
              Stage: {currentStage.toUpperCase()}
            </Typography>
          )}
        </Stack>

        {/* Dynamic Metric Display */}
        {metricData.length > 0 && (
          <Stack spacing={0.5} mt={1}>
            {metricData.map((metric, index) => (
              <Typography key={index} variant="subtitle1" fontWeight="fontWeightBold" p={1} bgcolor="primary.dark" borderRadius={1} textAlign="center">
                {metric}
              </Typography>
            ))}
          </Stack>
        )}

        {!isConnected && (
          <Button variant="contained" color="primary" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
            Reconnect
          </Button>
        )}

        {cameraAccessDenied && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 1 }}>
            <AlertTitle>Camera Access Denied</AlertTitle>
            Please enable camera permissions in your browser settings.
          </Alert>
        )}
      </Stack>

      <Box
        sx={{
          position: 'relative',
          width: { xs: '100%', sm: '640px', md: '720px' },
          height: 0,
          paddingBottom: `${(1 / cameraAspectRatio) * 100}%`,
          bgcolor: 'black',
          borderRadius: 3,
          boxShadow: 8,
          border: `3px solid ${theme.palette.primary.main}`,
          overflow: 'hidden',
          mt: 4,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

        {(cameraLoading || !videoRef.current?.srcObject) && !cameraAccessDenied && isConnected ? (
            <Skeleton
                variant="rectangular"
                sx={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    bgcolor: 'grey.900'
                }}
            >
                <Stack
                    sx={{
                        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
                        bgcolor: 'rgba(0,0,0,0.7)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <CircularProgress size={80} sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ mt: 3 }}>
                        Waiting for camera feed...
                    </Typography>
                </Stack>
            </Skeleton>
        ) : null}

        {cameraAccessDenied && !isConnected && (
            <Stack
                sx={{
                    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
                    bgcolor: 'rgba(0,0,0,0.9)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <CameraAltIcon sx={{ fontSize: '3em', color: 'text.disabled' }} />
                <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
                    Camera Unavailable
                </Typography>
            </Stack>
        )}
      </Box>

      {/* Future Enhancements Section */}
      <Box
        sx={{
          mt: 5,
          p: 3,
          bgcolor: theme.palette.background.paper,
          borderRadius: 2,
          boxShadow: 4,
          width: '100%',
          maxWidth: 'md',
        }}
      >
        <Typography variant="h6" component="h2" color="primary.light" mb={2}>
          Future Enhancements
        </Typography>
        <Typography variant="body1">
          Here you could add features like:
        </Typography>
        <Stack component="ul" spacing={1} sx={{ mt: 1, pl: 3 }}>
            <li><Typography variant="body2">- Session History & Performance Graphs</Typography></li>
            <li><Typography variant="body2">- More Exercises & AI Form Models</Typography></li>
            <li><Typography variant="body2">- Personalized Workout Plans</Typography></li>
            <li><Typography variant="body2">- (If database is revisited): User Login/Registration</Typography></li>
        </Stack>
      </Box>
    </Box>
  );
}

export default App;