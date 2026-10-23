import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { useAuthStore } from '../../store/useAuthStore';

interface Message {
  id: string;
  problemId?: string;
  senderUserId: string;
  senderName?: string;
  body: string;
  sentAt: string;
  read?: boolean;
}

interface CaseChatProps {
  problemId: string;
}

const fetchMessages = async (problemId: string): Promise<Message[]> => {
  const { data } = await apiClient.get(`/marketplace/problems/${problemId}/messages`);
  return Array.isArray(data) ? data : [];
};

export function CaseChat({ problemId }: CaseChatProps) {
  const [inputText, setInputText] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['case-messages', problemId],
    queryFn: () => fetchMessages(problemId),
    refetchInterval: 5000, // Poll every 5s for active thread
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await apiClient.post(`/marketplace/problems/${problemId}/messages`, { body: text });
      return data;
    },
    onSuccess: () => {
      setInputText('');
      queryClient.invalidateQueries({ queryKey: ['case-messages', problemId] });
    },
  });

  const handleSend = () => {
    if (!inputText.trim() || sendMutation.isPending) return;
    sendMutation.mutate(inputText.trim());
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isMe = item.senderUserId === user?.id;

          return (
            <View style={[styles.bubbleContainer, isMe ? styles.myBubbleContainer : styles.otherBubbleContainer]}>
              {!isMe && (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.senderName || 'U').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                {!isMe && <Text style={styles.senderName}>{item.senderName || 'Participant'}</Text>}
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                  {item.body}
                </Text>
                <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.otherTimeText]}>
                  {item.sentAt
                    ? new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={32} color={theme.colors.muted} />
            <Text style={styles.emptyText}>No messages in this case file yet. Say hello — messages are private.</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Write a message..."
          placeholderTextColor={theme.colors.muted}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 350,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  center: { padding: 20, alignItems: 'center' },
  messageList: { padding: 12, paddingBottom: 16 },
  bubbleContainer: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  myBubbleContainer: { justifyContent: 'flex-end' },
  otherBubbleContainer: { justifyContent: 'flex-start' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  avatarText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: theme.borderRadius.md },
  myBubble: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 2 },
  otherBubble: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 2,
  },
  senderName: { fontSize: 11, fontWeight: 'bold', color: theme.colors.muted, marginBottom: 2 },
  messageText: { fontSize: 14, lineHeight: 18 },
  myMessageText: { color: '#FFF' },
  otherMessageText: { color: theme.colors.text },
  timeText: { fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
  myTimeText: { color: 'rgba(255,255,255,0.7)' },
  otherTimeText: { color: theme.colors.muted },
  empty: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...theme.typography.small, color: theme.colors.muted, textAlign: 'center', marginTop: 8 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
    color: theme.colors.text,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: theme.colors.border },
});
