import React, { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import Colors from '../Colors';

export default function Index() {
  // Add error handling for the redirect
  const [isLoading, setIsLoading] = useState(true);
  
  // Wait a moment before redirecting to ensure everything is initialized
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Small delay to ensure navigation is ready
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color={Colors?.primary || '#0077B6'} />
        <Text style={{ marginTop: 10, color: '#6C757D' }}>Loading SMS features...</Text>
      </View>
    );
  }
  
  // Redirect with fallback handling
  return <Redirect href="/sms/bulk" />;
}
