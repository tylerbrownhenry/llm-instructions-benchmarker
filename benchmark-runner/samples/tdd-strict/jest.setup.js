// Add custom jest matchers from jest-dom
import '@testing-library/jest-dom';

// Fix TextEncoder/TextDecoder not defined in jsdom
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock localStorage
let store = {};

const localStorageMock = {
  getItem: jest.fn(function(key) {
    return store[key] || null;
  }),
  setItem: jest.fn(function(key, value) {
    store[key] = value.toString();
  }),
  removeItem: jest.fn(function(key) {
    delete store[key];
  }),
  clear: jest.fn(function() {
    store = {};
  })
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});