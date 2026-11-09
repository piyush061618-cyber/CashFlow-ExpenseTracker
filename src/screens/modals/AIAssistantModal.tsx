import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { askFinancialAssistant } from '../../utils/aiEngine';
import { getSetting, setSetting } from '../../database/settingsRepo';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Send,
  Sparkles,
  Settings,
  HelpCircle,
  Shield,
  Bot,
  User,
  Zap,
} from 'lucide-react-native';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  provider?: string;
}

const SUGGESTED_PROMPTS = [
  'How much did I spend this month?',
  'What is my biggest expense category?',
  'Compare this month with last month.',
  'Am I exceeding my budget?',
  'How can I reduce unnecessary spending?',
  'How much can I safely spend per day?',
];

export const AIAssistantModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<any>(null);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text:
        'Hello! I am your CashFlow AI Financial Advisor. I analyze your actual SQLite financial records locally to give you accurate insights on budgets, expenses, and savings.\n\nAsk me anything or tap one of the quick suggestions below!',
      timestamp: 'Now',
      provider: 'CashFlow Local Advisor',
    },
  ]);

  // Config Modal State
  const [showConfig, setShowConfig] = useState(false);
  const [aiProvider, setAiProvider] = useState<'local' | 'gemini' | 'openai'>('local');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    async function loadConfig() {
      const p = await getSetting<'local' | 'gemini' | 'openai'>('ai_provider', 'local');
      const k = await getSetting<string>('ai_api_key', '');
      setAiProvider(p);
      setApiKey(k);
    }
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    await setSetting('ai_provider', aiProvider);
    await setSetting('ai_api_key', apiKey.trim());
    setShowConfig(false);
    Alert.alert('Settings Saved', `AI Assistant configured to use ${aiProvider.toUpperCase()} mode.`);
  };

  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputQuery).trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: 'msg_u_' + Date.now(),
      sender: 'user',
      text: q,
      timestamp: 'Now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const result = await askFinancialAssistant(q);
      const assistantMsg: ChatMessage = {
        id: 'msg_a_' + Date.now(),
        sender: 'assistant',
        text: result.answer,
        timestamp: 'Now',
        provider: result.provider,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        sender: 'assistant',
        text: `Sorry, I encountered an issue analyzing your request: ${err.message || 'Unknown error'}.`,
        timestamp: 'Now',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="AI Financial Advisor"
        subtitle="Private • Local Database Analysis"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setShowConfig(true)}
            style={[styles.configIconBtn, { backgroundColor: colors.surfaceVariant }]}
          >
            <Settings size={18} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <View
              key={m.id}
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              {!isUser && (
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Bot size={16} color="#FFFFFF" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  isUser
                    ? [styles.bubbleUser, { backgroundColor: colors.primary }]
                    : [
                        styles.bubbleAssistant,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ],
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: isUser ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {m.text}
                </Text>
                {m.provider && (
                  <Text
                    style={[
                      styles.providerTag,
                      { color: isUser ? '#E0E7FF' : colors.textSecondary },
                    ]}
                  >
                    {m.provider}
                  </Text>
                )}
              </View>
              {isUser && (
                <View style={[styles.avatar, { backgroundColor: colors.surfaceVariant }]}>
                  <User size={16} color={colors.text} />
                </View>
              )}
            </View>
          );
        })}

        {loading && (
          <View style={styles.thinkingRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Bot size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.thinkingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>
                Querying database and generating financial insights...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Suggested Prompts Horizon Scroll */}
      <View style={[styles.suggestedSection, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SUGGESTED_PROMPTS.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              onPress={() => handleSend(prompt)}
              style={[styles.suggestedChip, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
            >
              <Sparkles size={12} color={colors.primary} />
              <Text style={[styles.suggestedText, { color: colors.text }]}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input Row */}
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
        <TextInput
          placeholder="Ask a question about your finances..."
          placeholderTextColor={colors.textMuted}
          value={inputQuery}
          onChangeText={setInputQuery}
          style={[styles.chatInput, { color: colors.text, backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity
          onPress={() => handleSend()}
          disabled={!inputQuery.trim() || loading}
          style={[
            styles.sendButton,
            { backgroundColor: inputQuery.trim() ? colors.primary : colors.border },
          ]}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* AI Configuration Modal */}
      <Modal visible={showConfig} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.configModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.configModalTitle, { color: colors.text }]}>
              AI Advisor Configuration
            </Text>
            <Text style={[styles.configModalSub, { color: colors.textSecondary }]}>
              CashFlow provides full local rule-based intelligence offline. You can also optionally connect your own Gemini or OpenAI API key.
            </Text>

            {/* Provider Picker */}
            <Text style={[styles.configLabel, { color: colors.textSecondary }]}>PROVIDER</Text>
            <View style={styles.providerOptionsRow}>
              {(['local', 'gemini', 'openai'] as const).map((prov) => {
                const isSelected = aiProvider === prov;
                return (
                  <TouchableOpacity
                    key={prov}
                    onPress={() => setAiProvider(prov)}
                    style={[
                      styles.provChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.provChipText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {prov === 'local' ? 'Local (Offline)' : prov.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {aiProvider !== 'local' && (
              <Input
                label="API Key"
                value={apiKey}
                onChangeText={setApiKey}
                placeholder={`Paste your ${aiProvider.toUpperCase()} API key here`}
                secureTextEntry
                containerStyle={{ marginTop: 12 }}
              />
            )}

            <View style={styles.configActionsRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowConfig(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Settings"
                onPress={handleSaveConfig}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  configIconBtn: {
    padding: 8,
    borderRadius: 12,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 16,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  providerTag: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: '600',
  },
  thinkingRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  thinkingText: {
    fontSize: 12,
  },
  suggestedSection: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginRight: 8,
  },
  suggestedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  chatInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  configModalCard: {
    padding: 20,
    borderRadius: 20,
  },
  configModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  configModalSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  providerOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  provChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  provChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  configActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
});
