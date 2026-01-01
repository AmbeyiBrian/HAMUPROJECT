// Create a config file if it doesn't exist
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://backend.hamuwater.com/api'
  : 'http://localhost:8000/api';

// You might also want to add webapp URL for other frontend configurations
const WEBAPP_URL = process.env.NODE_ENV === 'production'
  ? 'https://webapp.hamuwater.com'
  : 'http://localhost:3000';

export default API_BASE_URL;
export { WEBAPP_URL };
