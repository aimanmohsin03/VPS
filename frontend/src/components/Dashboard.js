import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
} from '@mui/material';
import axios from 'axios';

const Dashboard = () => {
  const [tests, setTests] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchTests();
  }, [navigate]);

  const fetchTests = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/tests');
      setTests(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Failed to fetch tests');
      }
    }
  };

  const handleStartTest = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/start-test');
      if (response.status === 201) {
        navigate(`/test/${response.data.test_id}`);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Failed to start test');
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h4" component="h1" gutterBottom align="center">
                Dashboard
              </Typography>
              {error && (
                <Typography color="error" align="center" gutterBottom>
                  {error}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleStartTest}
                fullWidth
                sx={{ mb: 3 }}
              >
                Start New Test
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Test History
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Test ID</TableCell>
                      <TableCell>Start Time</TableCell>
                      <TableCell>End Time</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Suspicious Activities</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>{test.id}</TableCell>
                        <TableCell>
                          {new Date(test.start_time).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {test.end_time
                            ? new Date(test.end_time).toLocaleString()
                            : 'In Progress'}
                        </TableCell>
                        <TableCell>{test.status}</TableCell>
                        <TableCell>{test.suspicious_activities}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Dashboard; 