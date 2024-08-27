// File: ~/tiedottaja/frontend/src/App.js
import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Container, Typography, CircularProgress } from '@material-ui/core';

function App() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post('http://localhost:3001/api/process-message', { message });
      setResponse(res.data.message);
    } catch (error) {
      setResponse('Error processing message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        Message Handler
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          margin="normal"
        />
        <Button type="submit" variant="contained" color="primary" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : 'Submit'}
        </Button>
      </form>
      {response && (
        <Typography variant="body1" style={{ marginTop: 20 }}>
          {response}
        </Typography>
      )}
    </Container>
  );
}

export default App;
