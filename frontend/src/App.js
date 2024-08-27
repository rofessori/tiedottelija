import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Container, Typography, CircularProgress } from '@material-ui/core';

function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post('http://localhost:3001/api/process-message', { message: input });
      setOutput(res.data.message);
    } catch (error) {
      setOutput('Error processing message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        Announcement Generator
      </Typography>
      <Typography variant="body1" gutterBottom>
        Hello! I'm here to make your announcement better. Give me input about the event.
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          label="Event Details"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          margin="normal"
        />
        <Button type="submit" variant="contained" color="primary" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : 'Generate Announcement'}
        </Button>
      </form>
      {output && (
        <Typography variant="body1" style={{ marginTop: 20, whiteSpace: 'pre-wrap' }}>
          {output}
        </Typography>
      )}
    </Container>
  );
}

export default App;