// Example test file to ensure Jest is working
describe('Jest Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have test environment variables set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});

