import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import Webcam from 'react-webcam';
import axios from 'axios';

const TestRoom = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const [suspiciousActivities, setSuspiciousActivities] = useState(0);
  const [isTestActive, setIsTestActive] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [faceBoxes, setFaceBoxes] = useState([]);
  const canvasRef = useRef(null);

  const captureAndProcess = async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      setProcessing(true);
      const blob = await fetch(imageSrc).then(res => res.blob());
      const formData = new FormData();
      formData.append('image', blob, 'webcam.jpg');

      const response = await axios.post(
        `http://localhost:5000/api/process-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = response.data;
      setLastResult(data);
      setFaceBoxes(data.face_boxes || []);
      setHistory(prev => [data, ...prev].slice(0, 10));
      if (data.suspicious_activity) {
        setSuspiciousActivities(prev => prev + 1);
      }
    } catch (err) {
      setError('Error processing image');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(captureAndProcess, 5000); // Capture every 5 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const webcam = webcamRef.current;
    if (!canvas || !webcam) return;

    const video = webcam.video;
    const width = video?.videoWidth || 640;
    const height = video?.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ff00';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#00ff00';

    faceBoxes.forEach(box => {
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.fillText('Face', box.x, Math.max(box.y - 4, 10));
    });
  }, [faceBoxes]);

  const handleEndTest = async () => {
    try {
      await axios.post(`http://localhost:5000/api/end-test/${testId}`);
      setIsTestActive(false);
      navigate('/dashboard');
    } catch (err) {
      setError('Error ending test');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h4" component="h1" gutterBottom align="center">
                Test Room
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
            </Grid>
            <Grid item xs={12} md={8}>
              <Box sx={{ position: 'relative', width: '100%', maxWidth: 640 }}>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width="100%"
                  videoConstraints={{
                    width: 640,
                    height: 480,
                    facingMode: "user"
                  }}
                />
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    borderRadius: 4
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Test Information
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Test ID: {testId}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Suspicious Activities Detected: {suspiciousActivities}
                </Typography>
                {processing && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography>Processing image...</Typography>
                  </Box>
                )}
                {lastResult && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Last Analysis:
                    </Typography>
                    <Typography variant="body2">
                      Edge Density: {(lastResult.edge_density * 100).toFixed(2)}%
                    </Typography>
                    <Typography variant="body2">
                      Faces Detected: {lastResult.faces_detected}
                    </Typography>
                    <Typography variant="body2" color={lastResult.suspicious_activity ? 'error' : 'success'}>
                      Status: {lastResult.suspicious_activity ? 'Suspicious Activity Detected' : 'Normal'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(lastResult.processed_at).toLocaleTimeString()}
                    </Typography>
                  </Box>
                )}
                {history.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Detection History
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {history.map((entry, index) => (
                        <Box
                          key={`${entry.processed_at}-${index}`}
                          sx={{
                            py: 1,
                            borderBottom: index === history.length - 1 ? 'none' : '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {new Date(entry.processed_at).toLocaleTimeString()}
                          </Typography>
                          <Typography variant="body2">
                            Faces: {entry.faces_detected}
                          </Typography>
                          <Typography
                            variant="body2"
                            color={entry.suspicious_activity ? 'error' : 'text.secondary'}
                          >
                            {entry.suspicious_activity ? 'Suspicious' : 'Normal'} · Edge Density:{' '}
                            {(entry.edge_density * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
                {isTestActive && (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleEndTest}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    End Test
                  </Button>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default TestRoom; 