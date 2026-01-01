/**
 * More Screen
 * Settings and additional options with modern styling.
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../services/AuthContext';
import { syncService } from '../../services/SyncService';
import Colors from '../../constants/Colors';

export default function MoreScreen() {
    const router = useRouter();
    const { user, logout, preloadData } = useAuth();
    const insets = useSafeAreaInsets();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleSync = async () => {
        const result = await syncService.triggerSync();
        if (result.skipped) {
            Alert.alert('Sync', 'Unable to sync - check your connection');
        } else {
            Alert.alert('Sync Complete', `Synced: ${result.synced}, Failed: ${result.failed}`);
        }
    };

    const handleRefreshCache = async () => {
        setIsRefreshing(true);
        try {
            await preloadData();
            Alert.alert('Cache Refreshed', 'All offline data has been updated');
        } catch (error) {
            Alert.alert('Refresh Failed', 'Could not refresh data. Check your connection.');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/login');
                    }
                },
            ]
        );
    };

    const MenuItem = ({ icon, title, subtitle, onPress, color = Colors.text, iconBg = Colors.waterLight }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.menuIconContainer, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color }]}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
            <ScrollView>
                {/* User Info Card */}
                <View style={[styles.userCard, { paddingTop: insets.top + 24 }]}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{user?.names?.[0]?.toUpperCase() || 'U'}</Text>
                        </View>
                        <View style={styles.onlineIndicator} />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.names || 'User'}</Text>
                        <View style={styles.roleChip}>
                            <Text style={styles.roleText}>{user?.user_class || 'Agent'}</Text>
                        </View>
                        {user?.shop_details && (
                            <View style={styles.shopRow}>
                                <Ionicons name="location" size={12} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.userShop}>{user.shop_details.name}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Data Management */}
                <Text style={styles.sectionTitle}>Data Management</Text>
                <View style={styles.section}>
                    <MenuItem icon="cube" title="Stock Management" iconBg={`${Colors.primary}20`} color={Colors.primary} onPress={() => router.push('/stock')} />
                    <MenuItem icon="wallet" title="Expenses History" iconBg={`${Colors.warning}20`} color={Colors.warning} onPress={() => router.push('/expense')} />
                    <MenuItem icon="card" title="Credit Payments" iconBg={`${Colors.secondary}20`} color={Colors.secondary} onPress={() => router.push('/credit')} />
                    <MenuItem icon="speedometer" title="Meter Readings" iconBg={`${Colors.primary}20`} color={Colors.primaryLight} onPress={() => router.push('/meter-reading')} />
                    <MenuItem icon="time" title="Sync Queue" subtitle="View pending transactions" iconBg={`${Colors.info}20`} color={Colors.info} onPress={() => router.push('/sync-queue')} />
                </View>

                {/* Tools - SMS for all, Reports for Directors only */}
                <Text style={styles.sectionTitle}>Tools</Text>
                <View style={styles.section}>
                    <MenuItem icon="chatbubbles" title="SMS" iconBg={`${Colors.info}20`} color={Colors.info} onPress={() => router.push('/sms')} />
                    {(user?.user_class === 'Director' || user?.user_class === 'DIRECTOR') && (
                        <MenuItem icon="bar-chart" title="Reports" iconBg={`${Colors.success}20`} color={Colors.success} onPress={() => router.push('/analytics')} />
                    )}
                </View>

                {/* Settings */}
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.section}>
                    <MenuItem
                        icon="cloud-upload"
                        title="Sync Data"
                        subtitle="Sync pending transactions"
                        onPress={handleSync}
                    />
                    <MenuItem
                        icon="refresh"
                        title={isRefreshing ? "Refreshing..." : "Refresh Cache"}
                        subtitle="Reload all offline data"
                        onPress={handleRefreshCache}
                    />
                </View>

                {/* Account */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.section}>
                    <MenuItem
                        icon="key"
                        title="Change Password"
                        iconBg={`${Colors.primary}20`}
                        color={Colors.primary}
                        onPress={() => router.push('/change-password')}
                    />
                    <MenuItem
                        icon="log-out"
                        title="Logout"
                        color={Colors.error}
                        iconBg={Colors.error + '15'}
                        onPress={handleLogout}
                    />
                </View>

                <Text style={styles.version}>HAMU Water v3.0.0</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        padding: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarText: {
        color: Colors.textOnPrimary,
        fontSize: 28,
        fontWeight: 'bold',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.success,
        borderWidth: 3,
        borderColor: Colors.primary,
    },
    userInfo: {
        marginLeft: 18,
        flex: 1,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.textOnPrimary,
    },
    roleChip: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textOnPrimary,
    },
    shopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    userShop: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginHorizontal: 20,
        marginTop: 24,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    section: {
        backgroundColor: Colors.surface,
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    menuIconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContent: {
        flex: 1,
        marginLeft: 14,
    },
    menuTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    menuSubtitle: {
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 2,
    },
    version: {
        textAlign: 'center',
        color: Colors.textLight,
        fontSize: 12,
        marginVertical: 30,
    },
});
