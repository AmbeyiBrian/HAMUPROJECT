import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import eventEmitter from '../services/EventEmitter';

// Toast notification types with their colors and icons
const TOAST_TYPES = {
  SUCCESS: {
    backgroundColor: '#4CAF50',
    icon: 'checkmark-circle',
    color: '#fff'
  },
  ERROR: {
    backgroundColor: '#F44336',
    icon: 'alert-circle',
    color: '#fff'
  },
  WARNING: {
    backgroundColor: '#FF9800',
    icon: 'warning',
    color: '#fff'
  },
  INFO: {
    backgroundColor: '#2196F3',
    icon: 'information-circle',
    color: '#fff'
  }
};

const { width } = Dimensions.get('window');

const Toast = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('INFO');
  const [autoHide, setAutoHide] = useState(true);
  const translateY = useRef(new Animated.Value(-100)).current;
  const timeout = useRef(null);

  // Effect to listen for toast events
  useEffect(() => {
    // Event listeners for different toast types
    const successListener = eventEmitter.on('toast:success', showSuccess);
    const errorListener = eventEmitter.on('toast:error', showError);
    const warningListener = eventEmitter.on('toast:warning', showWarning);
    const infoListener = eventEmitter.on('toast:info', showInfo);
    
    // Authentication-specific events
    const tokenRefreshListener = eventEmitter.on('tokenRefreshSuccess', 
      () => showInfo('Your session has been refreshed', true));
    
    const sessionExpiredListener = eventEmitter.on('sessionExpired', 
      (msg) => showError(msg || 'Your session has expired. Please log in again.', false));

    return () => {
      // Clean up all listeners
      successListener();
      errorListener();
      warningListener();
      infoListener();
      tokenRefreshListener();
      sessionExpiredListener();
      
      // Clear any pending timeouts
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  // Animation to show the toast
  const showToast = () => {
    setVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start();

    // Auto-hide the toast after a delay if autoHide is true
    if (autoHide) {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(hideToast, 3000);
    }
  };

  // Animation to hide the toast
  const hideToast = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setVisible(false);
      translateY.setValue(-100);
    });
  };

  // Show a success toast
  const showSuccess = (msg, autohide = true) => {
    setMessage(msg);
    setType('SUCCESS');
    setAutoHide(autohide);
    showToast();
  };

  // Show an error toast
  const showError = (msg, autohide = true) => {
    setMessage(msg);
    setType('ERROR');
    setAutoHide(autohide);
    showToast();
  };

  // Show a warning toast
  const showWarning = (msg, autohide = true) => {
    setMessage(msg);
    setType('WARNING');
    setAutoHide(autohide);
    showToast();
  };

  // Show an info toast
  const showInfo = (msg, autohide = true) => {
    setMessage(msg);
    setType('INFO');
    setAutoHide(autohide);
    showToast();
  };

  // Don't render anything if not visible
  if (!visible) return null;

  const toastStyle = TOAST_TYPES[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: toastStyle.backgroundColor, transform: [{ translateY }] }
      ]}
    >
      <Ionicons name={toastStyle.icon} size={24} color={toastStyle.color} />
      <Text style={[styles.message, { color: toastStyle.color }]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 0,
    zIndex: 9999,
    elevation: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  message: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  }
});

export default Toast;