import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { aiApi } from '../../../api/ai';
import { AIRagDocument } from '../../../types/ai';
import { AppTheme } from '../../../theme/DarkTheme';
import { GradientHeader } from '../../../theme/MobileDesignSystem';
import { useAuth } from '../../../context/AuthContext';

interface DocumentAsset {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
}

export default function KnowledgeBaseScreen({ navigation }: { navigation: any }) {
  const theme = useTheme() as AppTheme;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [documents, setDocuments] = useState<AIRagDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload Mode: File vs Direct Text
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<DocumentAsset | null>(null);

  // Direct Text Input State
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');

  // Common Audience State
  const [audience, setAudience] = useState<'public' | 'staff_only'>('public');

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await aiApi.getRagDocuments();
      setDocuments(data || []);
    } catch (error: any) {
      console.warn('Failed to fetch RAG documents:', error.message);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDocuments().finally(() => setLoading(false));
  }, [fetchDocuments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
  }, [fetchDocuments]);

  // Safe Dynamic Document Picker
  const handlePickDocument = async () => {
    try {
      let DocumentPicker: any;
      try {
        DocumentPicker = await import('expo-document-picker');
      } catch {
        DocumentPicker = null;
      }

      if (!DocumentPicker || typeof DocumentPicker.getDocumentAsync !== 'function') {
        Alert.alert(
          'Thiếu thư viện native ExpoDocumentPicker',
          'Ứng dụng đang chạy trên bản build native chưa tích hợp ExpoDocumentPicker (cần build lại qua "npx expo run:android").\n\nBạn hãy chuyển sang tab "Nhập văn bản trực tiếp" để dán nội dung tri thức ngay!',
        );
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/plain',
          'text/markdown',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name,
          uri: asset.uri,
          size: asset.size,
          mimeType: asset.mimeType,
        });
      }
    } catch (error: any) {
      if (
        error?.message?.includes('ExpoDocumentPicker') ||
        error?.message?.includes('native module') ||
        error?.message?.includes('Cannot find native module')
      ) {
        Alert.alert(
          'Chưa cài đặt native module',
          'Bản build trên thiết bị hiện tại chưa tích hợp module ExpoDocumentPicker.\n\n👉 Bạn có thể chọn tab "Nhập văn bản trực tiếp" để nạp tài liệu vào AI ngay lập tức mà không cần build lại app!',
        );
      } else {
        Alert.alert('Lỗi chọn file', error?.message || 'Không thể chọn file từ thiết bị.');
      }
    }
  };

  // Upload Selected File
  const handleUploadFile = async () => {
    if (!selectedFile) {
      Alert.alert('Chưa chọn file', 'Vui lòng chọn một file PDF, TXT hoặc Word để tải lên.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        formData.append('file', blob, selectedFile.name);
      } else {
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/octet-stream',
        } as any);
      }

      formData.append('audience', audience);

      const res = await aiApi.uploadRagDocument(formData);
      Alert.alert(
        'Thành công 🎉',
        `Tài liệu "${selectedFile.name}" đã được phân thành ${res.data?.chunksCount || 0} đoạn và nạp vào vector database (${audience === 'public' ? 'Công khai' : 'Nội bộ'}).`,
      );

      setSelectedFile(null);
      await fetchDocuments();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Tải file thất bại.';
      Alert.alert('Lỗi tải lên', msg);
    } finally {
      setUploading(false);
    }
  };

  // Upload Direct Text
  const handleUploadText = async () => {
    const trimmedTitle = docTitle.trim();
    const trimmedContent = docContent.trim();

    if (!trimmedTitle) {
      Alert.alert('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề hoặc tên tài liệu tri thức (VD: Quy định mượn sách).');
      return;
    }
    if (!trimmedContent) {
      Alert.alert('Thiếu nội dung', 'Vui lòng dán hoặc nhập nội dung văn bản tri thức cần nạp cho AI.');
      return;
    }

    setUploading(true);
    try {
      const res = await aiApi.uploadRagText(trimmedTitle, trimmedContent, audience);
      Alert.alert(
        'Nạp tri thức thành công 🎉',
        `Văn bản "${trimmedTitle}" đã được phân đoạn (${res.data?.chunksCount || 0} chunks) và lưu vào ChromaDB (${audience === 'public' ? 'Công khai' : 'Nội bộ'}).`,
      );

      setDocTitle('');
      setDocContent('');
      await fetchDocuments();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Nạp văn bản thất bại.';
      Alert.alert('Lỗi nạp văn bản', msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc: AIRagDocument) => {
    if (!isAdmin) {
      Alert.alert('Không có quyền', 'Chỉ quản trị viên (Admin) mới có quyền xóa tài liệu tri thức.');
      return;
    }

    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa tài liệu "${doc.source}" khỏi hệ thống tri thức AI? AI sẽ không còn nhớ kiến thức từ file này.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await aiApi.deleteRagDocument(doc.source);
              setDocuments((prev) => prev.filter((d) => d.source !== doc.source));
              Alert.alert('Đã xóa', `Đã xóa tài liệu "${doc.source}" khỏi ChromaDB.`);
            } catch (err: any) {
              Alert.alert('Lỗi xóa', err?.response?.data?.error || err?.message || 'Không thể xóa tài liệu.');
            }
          },
        },
      ],
    );
  };

  const renderDocItem = ({ item }: { item: AIRagDocument }) => {
    const isPublic = item.audience === 'public';
    const isPdf = item.source.toLowerCase().endsWith('.pdf');

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.fileIconWrapper}>
              <MaterialCommunityIcons
                name={isPdf ? 'file-pdf-box' : 'file-document-outline'}
                size={32}
                color={isPdf ? '#DC2626' : theme.colors.primary}
              />
            </View>

            <View style={styles.fileInfo}>
              <Text variant="titleSmall" style={styles.docTitle} numberOfLines={1}>
                {item.docTitle || item.source}
              </Text>
              <Text variant="bodySmall" style={styles.docSource} numberOfLines={1}>
                {item.source}
              </Text>
              <View style={styles.metaRow}>
                <Chip
                  compact
                  style={[
                    styles.audienceChip,
                    { backgroundColor: isPublic ? '#10B98120' : '#F59E0B20' },
                  ]}
                  textStyle={{ color: isPublic ? '#059669' : '#D97706', fontSize: 11 }}
                >
                  {isPublic ? '🌐 Công khai (Độc giả)' : '🔒 Nội bộ (Staff)'}
                </Chip>
                <Text variant="labelSmall" style={styles.chunkText}>
                  {item.chunksCount} chunks
                </Text>
                {item.fileSize ? (
                  <Text variant="labelSmall" style={styles.sizeText}>
                    • {item.fileSize}
                  </Text>
                ) : null}
              </View>
            </View>

            {isAdmin && (
              <IconButton
                icon="trash-can-outline"
                size={20}
                iconColor={theme.colors.error}
                onPress={() => handleDelete(item)}
              />
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <GradientHeader
        title="Knowledge Base (RAG)"
        subtitle="Cung cấp tri thức văn bản cho AI"
        icon="book-open-page-variant"
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={documents}
        keyExtractor={(item) => item.source}
        renderItem={renderDocItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          isAdmin ? (
            <Surface style={[styles.uploadSection, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="cloud-upload" size={22} color={theme.colors.primary} />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Thêm tri thức cho AI
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.sectionSubtitle}>
                AI sẽ phân tích, tách đoạn và lưu trữ vector vào ChromaDB để trả lời độc giả và nhân viên.
              </Text>

              {/* Mode Selector */}
              <SegmentedButtons
                value={inputMode}
                onValueChange={(val) => setInputMode(val as 'file' | 'text')}
                buttons={[
                  {
                    value: 'file',
                    label: 'Tải file tệp tin',
                    icon: 'file-upload',
                  },
                  {
                    value: 'text',
                    label: 'Nhập văn bản',
                    icon: 'text-box-plus',
                  },
                ]}
                density="small"
                style={styles.modeSelector}
              />

              {inputMode === 'file' ? (
                /* File Mode */
                <View>
                  <TouchableOpacity
                    style={[
                      styles.dropZone,
                      { borderColor: selectedFile ? theme.colors.primary : theme.colors.outlineVariant },
                    ]}
                    activeOpacity={0.7}
                    onPress={handlePickDocument}
                  >
                    <MaterialCommunityIcons
                      name={selectedFile ? 'check-circle-outline' : 'file-upload-outline'}
                      size={36}
                      color={selectedFile ? '#10B981' : theme.colors.primary}
                    />
                    <Text variant="bodyMedium" style={styles.dropZoneText}>
                      {selectedFile ? selectedFile.name : 'Chạm để chọn file (PDF, TXT, MD, DOCX)'}
                    </Text>
                    {selectedFile?.size ? (
                      <Text variant="labelSmall" style={styles.dropZoneSubtext}>
                        Kích thước: {(selectedFile.size / 1024).toFixed(1)} KB
                      </Text>
                    ) : (
                      <Text variant="labelSmall" style={styles.dropZoneSubtext}>
                        Hỗ trợ PDF, TXT, Markdown, Word
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Audience selector */}
                  <View style={styles.audienceSelector}>
                    <Text variant="labelMedium" style={styles.audienceLabel}>
                      Phạm vi truy cập:
                    </Text>
                    <SegmentedButtons
                      value={audience}
                      onValueChange={(val) => setAudience(val as 'public' | 'staff_only')}
                      buttons={[
                        {
                          value: 'public',
                          label: 'Công khai',
                          icon: 'earth',
                        },
                        {
                          value: 'staff_only',
                          label: 'Nội bộ Staff',
                          icon: 'shield-account',
                        },
                      ]}
                      density="small"
                    />
                  </View>

                  <Button
                    mode="contained"
                    icon="lightning-bolt"
                    onPress={handleUploadFile}
                    loading={uploading}
                    disabled={!selectedFile || uploading}
                    style={styles.uploadBtn}
                  >
                    {uploading ? 'Đang vector hóa...' : 'Nạp file vào Knowledge Base'}
                  </Button>
                </View>
              ) : (
                /* Direct Text Mode */
                <View style={styles.textInputSection}>
                  <TextInput
                    mode="outlined"
                    label="Tên tài liệu / Tiêu đề"
                    placeholder="VD: Quy_dinh_muon_tra_2026"
                    value={docTitle}
                    onChangeText={setDocTitle}
                    style={styles.textInputTitle}
                  />

                  <TextInput
                    mode="outlined"
                    label="Nội dung tri thức văn bản"
                    placeholder="Dán hoặc nhập nội dung các quy định, thông báo, hướng dẫn..."
                    value={docContent}
                    onChangeText={setDocContent}
                    multiline
                    numberOfLines={6}
                    style={styles.textInputContent}
                  />

                  {/* Audience selector */}
                  <View style={styles.audienceSelector}>
                    <Text variant="labelMedium" style={styles.audienceLabel}>
                      Phạm vi truy cập:
                    </Text>
                    <SegmentedButtons
                      value={audience}
                      onValueChange={(val) => setAudience(val as 'public' | 'staff_only')}
                      buttons={[
                        {
                          value: 'public',
                          label: 'Công khai',
                          icon: 'earth',
                        },
                        {
                          value: 'staff_only',
                          label: 'Nội bộ Staff',
                          icon: 'shield-account',
                        },
                      ]}
                      density="small"
                    />
                  </View>

                  <Button
                    mode="contained"
                    icon="content-save-check"
                    onPress={handleUploadText}
                    loading={uploading}
                    disabled={!docTitle.trim() || !docContent.trim() || uploading}
                    style={styles.uploadBtn}
                  >
                    {uploading ? 'Đang phân đoạn & nạp...' : 'Lưu văn bản vào Knowledge Base'}
                  </Button>
                </View>
              )}
            </Surface>
          ) : (
            <Surface style={[styles.infoBanner, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
              <MaterialCommunityIcons name="information" size={20} color={theme.colors.primary} />
              <Text variant="bodySmall" style={styles.infoText}>
                Bạn đang xem danh sách tri thức RAG hiện tại của hệ thống thư viện.
              </Text>
            </Surface>
          )
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="bodySmall" style={styles.emptyText}>
                Đang tải danh sách tài liệu...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="file-question-outline" size={48} color={theme.colors.outline} />
              <Text variant="bodyMedium" style={styles.emptyText}>
                Chưa có tài liệu nào trong Knowledge Base.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  uploadSection: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#6B7280',
    marginBottom: 14,
  },
  modeSelector: {
    marginBottom: 14,
  },
  dropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.01)',
    marginBottom: 14,
  },
  dropZoneText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  dropZoneSubtext: {
    color: '#6B7280',
  },
  textInputSection: {
    gap: 10,
    marginBottom: 10,
  },
  textInputTitle: {
    fontSize: 14,
  },
  textInputContent: {
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  audienceSelector: {
    marginVertical: 8,
    gap: 6,
  },
  audienceLabel: {
    fontWeight: '600',
  },
  uploadBtn: {
    borderRadius: 10,
    marginTop: 4,
  },
  card: {
    borderRadius: 12,
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  docTitle: {
    fontWeight: '600',
  },
  docSource: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  audienceChip: {
    height: 24,
  },
  chunkText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  sizeText: {
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: '#6B7280',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
  },
});
