import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

// Bottom Tab Screens
import { HomeScreen } from '../screens/HomeScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { BudgetsScreen } from '../screens/BudgetsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// Modals
import { AddEditTransactionModal } from '../screens/modals/AddEditTransactionModal';
import { ReceiptScannerModal } from '../screens/modals/ReceiptScannerModal';
import { TransferModal } from '../screens/modals/TransferModal';
import { AIAssistantModal } from '../screens/modals/AIAssistantModal';
import { WalletsListModal } from '../screens/modals/WalletsListModal';
import { AddEditWalletModal } from '../screens/modals/AddEditWalletModal';
import { GoalsListModal } from '../screens/modals/GoalsListModal';
import { AddEditGoalModal } from '../screens/modals/AddEditGoalModal';
import { DepositGoalModal } from '../screens/modals/DepositGoalModal';
import { RecurringListModal } from '../screens/modals/RecurringListModal';
import { AddEditRecurringModal } from '../screens/modals/AddEditRecurringModal';
import { CategoryManagerModal } from '../screens/modals/CategoryManagerModal';
import { ExportBackupModal } from '../screens/modals/ExportBackupModal';
import { AuthLockScreen } from '../screens/modals/AuthLockScreen';

// Icons
import {
  Home,
  Receipt,
  PieChart,
  Target,
  Settings as SettingsIcon,
  Plus,
} from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function FloatingAddButton({
  onPress,
  colors,
}: {
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.floatingButton,
        {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
        },
      ]}
    >
      <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

function MainTabNavigator({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, 12);
  const tabHeight = 56 + bottomInset;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: tabHeight,
            paddingBottom: bottomInset,
            paddingTop: 6,
            elevation: 8,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{
            tabBarLabel: 'History',
            tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="AddPlaceholder"
          component={View}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('AddEditTransactionModal');
            },
          }}
          options={{
            tabBarLabel: '',
            tabBarButton: () => (
              <FloatingAddButton
                onPress={() => navigation.navigate('AddEditTransactionModal')}
                colors={colors}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            tabBarLabel: 'Analytics',
            tabBarIcon: ({ color, size }) => <PieChart size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Budgets"
          component={BudgetsScreen}
          options={{
            tabBarLabel: 'Budgets',
            tabBarIcon: ({ color, size }) => <Target size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }) => <SettingsIcon size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

export function AppNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen
        name="AddEditTransactionModal"
        component={AddEditTransactionModal}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="ReceiptScannerModal"
        component={ReceiptScannerModal}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="TransferModal"
        component={TransferModal}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="AIAssistantModal"
        component={AIAssistantModal}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="WalletsListModal" component={WalletsListModal} />
      <Stack.Screen name="AddEditWalletModal" component={AddEditWalletModal} />
      <Stack.Screen name="GoalsListModal" component={GoalsListModal} />
      <Stack.Screen name="AddEditGoalModal" component={AddEditGoalModal} />
      <Stack.Screen name="DepositGoalModal" component={DepositGoalModal} />
      <Stack.Screen name="RecurringListModal" component={RecurringListModal} />
      <Stack.Screen name="AddEditRecurringModal" component={AddEditRecurringModal} />
      <Stack.Screen name="CategoryManagerModal" component={CategoryManagerModal} />
      <Stack.Screen name="ExportBackupModal" component={ExportBackupModal} />
      <Stack.Screen
        name="AuthLockScreen"
        component={AuthLockScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    top: -18,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
