import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Container, Typography } from '@material-ui/core';

function App() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3001/api/process-message', { message });
      setResponse(res.data.message);
    } catch (error) {
      setResponse('Error processing message');
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
        <Button type="submit" variant="contained" color="primary">
          Submit
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
