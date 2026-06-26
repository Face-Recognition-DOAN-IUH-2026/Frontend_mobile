import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';
import { AIPendingAction } from '../../types/ai';
import { AppTheme } from '../../theme/DarkTheme';

interface ConfirmDialogProps {
  visible: boolean;
  pendingAction: AIPendingAction | null;
  onApprove: () => void;
  onReject: () => void;
  onDismiss: () => void;
}

export default function ConfirmDialog({ visible, pendingAction, onApprove, onReject, onDismiss }: ConfirmDialogProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!pendingAction) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Xac nhan hanh dong</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.description}>
            {pendingAction.description}
          </Text>
          {Object.keys(pendingAction.params).length > 0 && (
            <Text variant="bodySmall" style={styles.params}>
              {JSON.stringify(pendingAction.params, null, 2)}
            </Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onReject} textColor={theme.colors.error}>Tu choi</Button>
          <Button onPress={onApprove}>Dong y</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    dialog: {
      backgroundColor: theme.colors.surface,
    },
    title: {
      fontWeight: '600',
    },
    description: {
      marginBottom: 8,
    },
    params: {
      backgroundColor: theme.colors.surfaceVariant,
      padding: 8,
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 12,
    },
  });
}
