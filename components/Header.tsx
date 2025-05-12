import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface HeaderProps {
  showSearch?: boolean;
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ showSearch = true, userName = 'Usuario' }) => {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.centerSection}>
        <Text style={styles.title}>{userName}</Text>
      </View>
      
      <View style={styles.rightSection}>
        {showSearch && (
          <TouchableOpacity onPress={() => router.push('/')}>
            <FontAwesome5 name="search" size={20} color="#333" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

export default Header; 