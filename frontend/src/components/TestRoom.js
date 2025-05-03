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

      setLastResult(response.data);
      if (response.data.suspicious_activity) {
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
                    <Typography variant="body2" color={lastResult.suspicious_activity ? 'error' : 'success'}>
                      Status: {lastResult.suspicious_activity ? 'Suspicious Activity Detected' : 'Normal'}
                    </Typography>
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