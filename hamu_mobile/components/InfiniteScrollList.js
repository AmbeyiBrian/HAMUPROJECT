import React, { useEffect, useState, useRef } from 'react';
import { FlatList, ActivityIndicator, RefreshControl, View, Text, StyleSheet } from 'react-native';
import Colors from '../app/Colors';

/**
 * A reusable component for displaying lists with infinite scrolling pagination
 * 
 * @param {Function} fetchData - Function that returns a Promise with paginated data
 * @param {Function} renderItem - Function to render each item
 * @param {Object} filters - Filters to apply to the data fetch
 * @param {String} emptyMessage - Message to display when no items are found
 * @param {Object} listProps - Additional props to pass to the FlatList component
 */
const InfiniteScrollList = ({
  fetchData,
  renderItem,
  filters = {},
  emptyMessage = "No items found",
  listProps = {},
}) => {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [error, setError] = useState(null);
  // Use a ref instead of state for the counter to avoid synchronization issues
  const uniqueIdCounter = useRef(0);
  // Create a unique component instance ID to ensure no collisions between different list instances
  const instanceId = useRef(`inst_${Math.random().toString(36).substring(2, 9)}`);

  // Function to generate a truly unique identifier
  const getNextUniqueId = () => {
    // Increment the counter directly with the ref
    const nextId = uniqueIdCounter.current++;
    // Combine instance ID, timestamp, and counter for guaranteed uniqueness
    return `${instanceId.current}_${nextId}`;
  };

  // Reset the counter when filters change
  useEffect(() => {
    // Don't reset the uniqueIdCounter here, we want it to keep incrementing
    // even when filters change to maintain uniqueness
  }, [JSON.stringify(filters)]);

  // Load initial data
  useEffect(() => {
    loadData(true); // Always treat filter changes as a refresh
  }, [JSON.stringify(filters)]); // Reload when filters change

  // Function to load data from the API
  const loadData = async (refresh = false) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // If refreshing, reset to page 1
      const currentPage = refresh ? 1 : page;
      
      // Fetch data from the API
      const response = await fetchData(currentPage, filters);
      
      if (!response || !response.results) {
        throw new Error("Invalid API response format");
      }
      
      // Process the results to ensure each item has a unique ID
      const processResults = (items) => {
        return items.map(item => {
          // Use object ID if available, or generate a unique one
          const itemId = item.id ? `${item.id}` : getNextUniqueId();
          return {
            ...item,
            _uniqueId: `${instanceId.current}_${currentPage}_${itemId}`
          };
        });
      };
      
      // Update the data state
      if (refresh) {
        setData(processResults(response.results));
      } else {
        setData(prevData => [...prevData, ...processResults(response.results)]);
      }
      
      // Check if there are more pages
      setHasMoreData(response.next !== null);
      
      // If not refreshing and there are more pages, increment the page number
      if (!refresh && response.next !== null) {
        setPage(currentPage + 1);
      } else if (refresh) {
        setPage(2); // Reset to page 2 for next load if refreshing
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Function to handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  // Function to handle load more
  const handleLoadMore = () => {
    if (hasMoreData && !isLoading) {
      loadData();
    }
  };

  // Render the footer (loading indicator)
  const renderFooter = () => {
    if (!isLoading) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  // Render the empty state
  const renderEmpty = () => {
    if (isLoading && page === 1) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  };

  // Render the error state
  const renderError = () => {
    if (!error) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  };

  // Custom key extractor that guarantees uniqueness
  const keyExtractor = (item, index) => {
    // First try to use our generated unique ID
    if (item._uniqueId) {
      return item._uniqueId;
    }
    
    // If the item has an ID, use that combined with the instance ID
    if (item.id) {
      return `${instanceId.current}_${item.id}`;
    }
    
    // Last resort: use index with instance ID
    return `${instanceId.current}_idx_${index}`;
  };

  return (
    <View style={styles.container}>
      {renderError()}
      
      <FlatList
        removeClippedSubviews={true}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        maxToRenderPerBatch={10}
        windowSize={15}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
        {...listProps}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray,
  },
  errorContainer: {
    padding: 15,
    backgroundColor: '#ffdddd',
    marginBottom: 10,
    borderRadius: 5,
  },
  errorText: {
    color: '#ff0000',
  },
});

export default InfiniteScrollList;