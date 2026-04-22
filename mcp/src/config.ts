export const config = {
  backendUrl:
    process.env['VIBEAHACK_BACKEND_URL'] ?? 'http://localhost:3000/api/v1',
} as const;
