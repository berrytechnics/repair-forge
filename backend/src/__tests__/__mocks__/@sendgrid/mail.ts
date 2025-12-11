// Manual mock for @sendgrid/mail
import { jest } from '@jest/globals';

const mockSetApiKey = jest.fn();
const mockSend = jest.fn();

// Type definition for global mocks
interface SendGridMailMocks {
  setApiKey: jest.Mock;
  send: jest.Mock;
}

declare global {
  // eslint-disable-next-line no-var
  var __sendgridMailMocks: SendGridMailMocks | undefined;
}

// Store mocks globally so tests can access them
global.__sendgridMailMocks = {
  setApiKey: mockSetApiKey,
  send: mockSend,
};

const mockMail = {
  setApiKey: mockSetApiKey,
  send: mockSend,
};

export default mockMail;
export { mockSetApiKey as setApiKey, mockSend as send };
