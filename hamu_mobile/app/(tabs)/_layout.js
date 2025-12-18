import { Tabs } from 'expo-router';
import React from 'react';
import { useAuth } from '../../services/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Import the local Colors file
import Colors from '../Colors';

export default function TabLayout() {
  const { user, isDirector } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Log user role information for debugging
  console.log('TabLayout - User info:', 
              user ? `${user.names} (${user.user_class})` : 'No user', 
              'Is Director:', isDirector ? 'Yes' : 'No');

  // If no user is logged in, we shouldn't show the tabs at all
  if (!user) return null;

  // Function to navigate to profile screen
  const navigateToProfile = () => {
    router.push('/profile');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.border,
          height: Platform.OS === 'android' ? 70 + insets.bottom : 60,
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors.header,
          height: Platform.OS === 'ios' ? 90 : 70,
          elevation: 4,
          shadowOpacity: 0.2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
        },
        headerTintColor: Colors.headerText,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        // Add status bar padding for iOS
        headerTitleContainerStyle: {
          paddingTop: Platform.OS === 'ios' ? 10 : 0,
        },
        // Make header safe for status bar
        headerTopInsetEnabled: true,
        // Add profile icon to the right of all tab headers
        headerRight: () => (
          <TouchableOpacity 
            onPress={navigateToProfile}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="person-circle-outline" size={28} color={Colors.headerText} />
          </TouchableOpacity>
        ),
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: Colors.headerText }}>
                Dashboard
              </Text>
              {user?.shop && !isDirector && (
                <Text style={{ marginLeft: 8, fontSize: 14, color: Colors.headerText, opacity: 0.8 }}>
                  ({user.shop.name})
                </Text>
              )}
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Inventory',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: Colors.headerText }}>
                Inventory
              </Text>
              {user?.shop && !isDirector && (
                <Text style={{ marginLeft: 8, fontSize: 14, color: Colors.headerText, opacity: 0.8 }}>
                  ({user.shop.name})
                </Text>
              )}
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: Colors.headerText }}>
                Sales
              </Text>
              {user?.shop && !isDirector && (
                <Text style={{ marginLeft: 8, fontSize: 14, color: Colors.headerText, opacity: 0.8 }}>
                  ({user.shop.name})
                </Text>
              )}
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="refills"
        options={{
          title: 'Refills',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: Colors.headerText }}>
                Refills
              </Text>
              {user?.shop && !isDirector && (
                <Text style={{ marginLeft: 8, fontSize: 14, color: Colors.headerText, opacity: 0.8 }}>
                  ({user.shop.name})
                </Text>
              )}
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="water" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="meter_readings"
        options={{
          title: 'Meters',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: Colors.headerText }}>
                Meter Readings
              </Text>
              {user?.shop && !isDirector && (
                <Text style={{ marginLeft: 8, fontSize: 14, color: Colors.headerText, opacity: 0.8 }}>
                  ({user.shop.name})
                </Text>
              )}
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="speedometer" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: Colors.headerText }}>
                Expenses
              </Text>
              {user?.shop && !isDirector && (
                <Text style={{ marginLeft: 8, fontSize: 14, color: Colors.headerText, opacity: 0.8 }}>
                  ({user.shop.name})
                </Text>
              )}
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: Colors.headerText }}>
                Customers
              </Text>
              {user?.shop && !isDirector && (
                <Text style={{ marginLeft: 8, fontSize: 14, color: Colors.headerText, opacity: 0.8 }}>
                  ({user.shop.name})
                </Text>
              )}
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      
      {/* Profile screen is now hidden from the tab bar but still accessible from the header icon */}
      <Tabs.Screen
        name="profile"
        options={{
          title:'Profile',
          href: null, // This hides it from the tab bar
        }}
      />
    </Tabs>
  );
}