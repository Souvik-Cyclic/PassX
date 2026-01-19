import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss: () => void;
}

export function CustomAlert({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
}: CustomAlertProps) {
  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onDismiss();
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return 'text-red-500';
      case 'cancel':
        return 'text-slate-400';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable 
        className="flex-1 bg-black/50 items-center justify-center px-6"
        onPress={onDismiss}
      >
        <Pressable className="w-full max-w-sm">
          <View className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
            {/* Header */}
            <View className="px-6 pt-6 pb-4">
              <Text className="text-xl font-bold text-white mb-2">
                {title}
              </Text>
              {message && (
                <Text className="text-base text-slate-300 leading-6">
                  {message}
                </Text>
              )}
            </View>

            {/* Buttons */}
            <View className="border-t border-slate-700">
              {buttons.length === 1 ? (
                <TouchableOpacity
                  onPress={() => handleButtonPress(buttons[0])}
                  className="py-4 items-center"
                  activeOpacity={0.7}
                >
                  <Text className={`text-base font-semibold ${getButtonStyle(buttons[0].style)}`}>
                    {buttons[0].text}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row">
                  {buttons.map((button, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <View className="w-px bg-slate-700" />}
                      <TouchableOpacity
                        onPress={() => handleButtonPress(button)}
                        className="flex-1 py-4 items-center"
                        activeOpacity={0.7}
                      >
                        <Text className={`text-base font-semibold ${getButtonStyle(button.style)}`}>
                          {button.text}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
