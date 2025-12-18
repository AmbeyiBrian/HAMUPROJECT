// A simple component to test API connection
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { testConnection, testLogin } from './test_connection';

export default function ApiTest() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Redirect console logs to the screen
  const customConsole = {
    log: (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      setLogs(prev => [...prev, {type: 'log', message}]);
      console.log(...args);
    },
    error: (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      setLogs(prev => [...prev, {type: 'error', message}]);
      console.error(...args);
    }
  };

  const handleTestConnection = async () => {
    setLogs([]);
    setLoading(true);
    
    try {
      // Override global console temporarily
      const originalLog = console.log;
      const originalError = console.error;
      console.log = customConsole.log;
      console.error = customConsole.error;
      
      await testConnection();
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;
    } catch (error) {
      customConsole.error('Test failed:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    if (!phone || !password) {
      customConsole.error('Please enter both phone number and password');
      return;
    }
    
    setLogs([]);
    setLoading(true);
    
    try {
      // Override global console temporarily
      const originalLog = console.log;
      const originalError = console.error;
      console.log = customConsole.log;
      console.error = customConsole.error;
      
      await testLogin(phone, password);
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;
    } catch (error) {
      customConsole.error('Test failed:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Connection Test</Text>
      
      <Button 
        title="Test Basic Connection" 
        onPress={handleTestConnection}
        disabled={loading}
      />
      
      <View style={styles.loginContainer}>
        <Text style={styles.subtitle}>Test Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button
          title="Test Login"
          onPress={handleTestLogin}
          disabled={loading}
        />
      </View>
      
      <Text style={styles.logsTitle}>Test Logs:</Text>
      <ScrollView style={styles.logs}>
        {logs.map((log, i) => (
          <Text 
            key={i} 
            style={[
              styles.logLine, 
              log.type === 'error' ? styles.errorLog : styles.normalLog
            ]}
          >
            {log.message}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
  },
  loginContainer: {
    marginVertical: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 10,
    padding: 8,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  logs: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  logLine: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 3,
  },
  errorLog: {
    color: 'red',
  },
  normalLog: {
    color: 'black',
  },
});
