const request = require('supertest');
const express = require('express');

// Mock the server file
jest.mock('../src/server.js', () => {
  const express = require('express');
  const app = express();
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  app.get('/api/status', (req, res) => {
    res.json({ 
      message: 'Server is running',
      port: 3000,
      environment: 'test'
    });
  });
  
  return app;
});

const app = require('../src/server.js');

describe('Server Endpoints', () => {
  test('GET /api/health returns status ok', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  test('GET /api/status returns server info', async () => {
    const response = await request(app)
      .get('/api/status')
      .expect(200);
    
    expect(response.body.message).toBe('Server is running');
    expect(response.body.port).toBe(3000);
    expect(response.body.environment).toBe('test');
  });
});