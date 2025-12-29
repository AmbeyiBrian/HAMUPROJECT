import { Stack } from 'expo-router';
import Colors from '../../constants/Colors';

export default function SMSLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.textOnPrimary,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="index" options={{ title: 'SMS History' }} />
            <Stack.Screen name="send" options={{ title: 'Send SMS' }} />
        </Stack>
    );
}
