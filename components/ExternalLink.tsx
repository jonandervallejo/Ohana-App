import { Link } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { type ComponentProps } from 'react';
import * as React from 'react';

// Safely import Platform
let isWeb = false;
try {
  // Dynamically import Platform to avoid direct dependency
  const { Platform } = require('react-native');
  isWeb = Platform.OS === 'web';
} catch (error) {
  console.warn('Failed to load Platform module:', error);
  // Default to mobile behavior if we can't determine platform
  isWeb = false;
}

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (!isWeb) {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          await openBrowserAsync(href);
        }
      }}
    />
  );
}