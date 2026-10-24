import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/axiosClient';
import { theme } from '../../styles/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { mediaUrl } from '../../utils/media';
import { showAlert } from '../../utils/alert';

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

interface PendingAttachment {
  name: string;
  url: string;
}

const fetchMessages = async (problemId: string): Promise<Message[]> => {
  const { data } = await apiClient.get(`/marketplace/problems/${problemId}/messages`);
  return Array.isArray(data) ? data : [];
};

const isImageUrl = (url: string) => /\.(jpeg|jpg|png|webp|gif)($|\?)/i.test(url);

export function CaseChat({ problemId }: CaseChatProps) {
  const [inputText, setInputText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['case-messages', problemId],
    queryFn: () => fetchMessages(problemId),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await apiClient.post(`/marketplace/problems/${problemId}/messages`, { body: text });
      return data;
    },
    onSuccess: () => {
      setInputText('');
      setPendingAttachment(null);
      queryClient.invalidateQueries({ queryKey: ['case-messages', problemId] });
    },
    onError: (err: any) => {
      showAlert('Error', err?.response?.data?.message || 'Message could not be sent.');
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handlePickDocument = async () => {
    if (isUploading) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        setIsUploading(true);

        const formData = new FormData();
        formData.append('files', {
          uri: asset.uri,
          name: asset.name || 'document',
          type: asset.mimeType || 'application/octet-stream',
        } as any);

        const uploadRes = await apiClient.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const urls = uploadRes.data?.urls;
        const uploadedUrl = (Array.isArray(urls) && urls[0]) || uploadRes.data?.url || uploadRes.data?.fileUrl;

        if (uploadedUrl) {
          setPendingAttachment({
            name: asset.name || 'Attachment',
            url: uploadedUrl,
          });
        } else {
          showAlert('Upload Failed', 'Server did not return a valid file URL.');
        }
      }
    } catch (err: any) {
      showAlert('Upload Failed', err?.response?.data?.message || err?.message || 'Could not upload selected file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = () => {
    let fullBody = inputText.trim();
    if (pendingAttachment) {
      const attachRef = `📎 ${pendingAttachment.name}: ${pendingAttachment.url}`;
      fullBody = fullBody ? `${fullBody}\n${attachRef}` : attachRef;
    }
    if (!fullBody || sendMutation.isPending) return;
    sendMutation.mutate(fullBody);
  };

  const renderBubbleContent = (body: string, isMe: boolean) => {
    // Check for attachment URL pattern: https?://... or /uploads/...
    const urlRegex = /(https?:\/\/[^\s]+|\/uploads\/[^\s]+)/g;
    const matches = body.match(urlRegex);

    if (!matches || matches.length === 0) {
      return (
        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
          {body}
        </Text>
      );
    }

    const firstUrl = matches[0];
    const fullMediaUrl = mediaUrl(firstUrl);
    // Remove the URL portion for cleaner text display
    const textWithoutUrl = body.replace(urlRegex, '').replace(/📎\s*[^:\n]+:\s*/, '').trim();

    return (
      <View>
        {textWithoutUrl.length > 0 && (
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText, { marginBottom: 6 }]}>
            {textWithoutUrl}
          </Text>
        )}
        {isImageUrl(firstUrl) ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Linking.openURL(fullMediaUrl)}
            style={styles.imageThumbContainer}
          >
            <Image source={{ uri: fullMediaUrl }} style={styles.imageThumbnail} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <Ionicons name="expand-outline" size={14} color="#FFF" />
              <Text style={styles.overlayText}>View image</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Linking.openURL(fullMediaUrl)}
            style={[styles.docChip, isMe ? styles.myDocChip : styles.otherDocChip]}
          >
            <Ionicons name="document-attach" size={18} color={isMe ? '#FFF' : theme.colors.primary} />
            <Text
              style={[styles.docName, isMe ? styles.myDocName : styles.otherDocName]}
              numberOfLines={1}
            >
              Document Attachment
            </Text>
            <Ionicons name="open-outline" size={14} color={isMe ? '#FFF' : theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
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
        ref={flatListRef}
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
                {renderBubbleContent(item.body, isMe)}
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

      {/* Pending Attachment Preview Bar */}
      {pendingAttachment && (
        <View style={styles.attachmentBar}>
          <Ionicons name="document-attach-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.attachmentName} numberOfLines={1}>
            {pendingAttachment.name}
          </Text>
          <TouchableOpacity onPress={() => setPendingAttachment(null)}>
            <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handlePickDocument}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name="attach" size={22} color={theme.colors.primary} />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Write a message..."
          placeholderTextColor={theme.colors.muted}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() && !pendingAttachment) || sendMutation.isPending ? styles.sendButtonDisabled : {},
          ]}
          onPress={handleSend}
          disabled={(!inputText.trim() && !pendingAttachment) || sendMutation.isPending}
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
    height: 380,
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
  attachmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 8,
  },
  attachmentName: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  attachButton: {
    padding: 6,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
  imageThumbContainer: {
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    marginTop: 4,
    width: 180,
    height: 120,
    backgroundColor: '#000',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overlayText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    marginTop: 4,
  },
  myDocChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  otherDocChip: {
    backgroundColor: theme.colors.primaryLight,
  },
  docName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  myDocName: {
    color: '#FFF',
  },
  otherDocName: {
    color: theme.colors.primary,
  },
});
