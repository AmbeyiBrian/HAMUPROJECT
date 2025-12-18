import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../Colors';
import api from '../../services/api';

// Screen options with proper error handling
export const options = {
  title: "SMS History",
  headerTitleAlign: 'center',
  headerStyle: {
    backgroundColor: Colors?.header || '#0077B6',
  },
  headerTintColor: Colors?.headerText || '#FFFFFF',
  headerTitleStyle: {
    fontWeight: 'bold',
  },
};

export default function SMSHistoryScreen() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [loadRetries, setLoadRetries] = useState(0);

  const router = useRouter();

  // Load SMS history
  useEffect(() => {
    loadMessages();
  }, []);

  // Load messages from the API with retry logic
  const loadMessages = async (refresh = false) => {
    try {
      // Reset error state
      setError(null);
      
      if (refresh) {
        setIsRefreshing(true);
        setPage(1);
      } else if (isLoading === false && !refresh) {
        // Loading more items
        setPage(prevPage => prevPage + 1);
      } else {
        setIsLoading(true);
      }

      const pageToLoad = refresh ? 1 : page;
      const response = await api.getSMSHistory(pageToLoad);
      
      const newMessages = response?.results || [];
      
      if (refresh || pageToLoad === 1) {
        setMessages(newMessages);
        console.log('SMS history refreshed:', newMessages);
      } else {
        setMessages(prevMessages => [...prevMessages, ...newMessages]);
      }
      
      setHasMore(response?.next !== null);
      setLoadRetries(0); // Reset retry counter on success
      
    } catch (error) {
      console.error('Failed to load SMS history:', error);
      setError('Failed to load SMS messages. Pull down to retry.');
      
      // Implement retry logic (max 3 attempts)
      if (loadRetries < 3) {
        console.log(`Retrying load (${loadRetries + 1}/3)...`);
        setLoadRetries(prev => prev + 1);
        setTimeout(() => loadMessages(refresh), 1000 * (loadRetries + 1));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    loadMessages(true);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if date is today
    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show full date
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Render item
  const renderItem = ({ item }) => (
    <View style={styles.messageItem}>
      <View style={styles.messageHeader}>
        <Text style={styles.phoneNumber}>{item.target_phone}</Text>
        <Text style={styles.messageDate}>{formatDate(item.sent_at)}</Text>
      </View>
      
      <Text style={styles.messageContent} numberOfLines={3}>
        {item.message_body}
      </Text>
      
      {item.sender_name && (
        <Text style={styles.senderId}>Sender: {item.sender_name}</Text>
      )}
    </View>
  );

  // Render list footer
  const renderFooter = () => {
    if (!isLoading || messages.length === 0) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading more messages...</Text>
      </View>
    );
  };
  // Render empty content
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {error ? (
        <>
          <Ionicons name="alert-circle-outline" size={80} color={Colors.warning} />
          <Text style={styles.emptyText}>{error}</Text>
        </>
      ) : (
        <>
          <Ionicons name="chatbubble-outline" size={80} color={Colors.lightText} />
          <Text style={styles.emptyText}>No SMS messages found</Text>
        </>
      )}
      <TouchableOpacity
        style={styles.newButton}
        onPress={() => router.push('/sms/bulk')}
      >
        <Text style={styles.newButtonText}>Send New SMS</Text>
      </TouchableOpacity>
    </View>
  );

  // Show error state when api call fails but we have no messages to display
  if (error && messages.length === 0 && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color={Colors?.warning || '#FFC107'} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoadRetries(0);
              loadMessages(true);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
        ListEmptyComponent={!isLoading && renderEmpty()}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors?.primary || '#0077B6']}
          />
        }
        onEndReached={() => {
          if (hasMore && !isLoading && !isRefreshing) {
            loadMessages();
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={
          messages.length === 0 ? styles.listEmptyContent : styles.listContent
        }
      />
      
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => router.push('/sms/bulk')}
      >
        <Ionicons name="send" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors?.primary || '#0077B6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  messageItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  messageDate: {
    fontSize: 12,
    color: Colors.lightText,
  },
  messageContent: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  senderId: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 8,
    fontStyle: 'italic',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.lightText,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: Colors.lightText,
    marginTop: 16,
    marginBottom: 24,
  },
  newButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});