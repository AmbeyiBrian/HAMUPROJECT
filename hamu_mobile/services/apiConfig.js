import Constants from 'expo-constants';

// Configure fetch to improve logging and error handling
export const configureFetch = () => {
  const originalFetch = global.fetch;
  
  global.fetch = (url, options = {}) => {
    console.log(`Making network request to: ${url}`);
    
    // Add any required headers
    const modifiedOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };
    
    return originalFetch(url, modifiedOptions)
      .catch(error => {
        console.error('Network request failed with error:', error);
        throw error;
      });
  };
};

// Initialize the fetch configuration
export const initializeNetworking = () => {
  configureFetch();
  console.log('Network configuration initialized');
  console.log(`API URL: ${Constants.expoConfig.extra.apiUrl}`);
};
