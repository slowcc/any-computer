import React, { useState, useEffect, use } from 'react';
import { useAppStore } from '../stores/appStore';
import LogoEN from "../assets/any.svg?react";
import MaterialIcon from './MaterialIcon';
import RadioSwitch from './RadioSwitch';
import { AppContext } from '../contexts/AppContext';

const PadHeader: React.FC = () => {
  const { 
    apiKeySettings, 
    setApiKey, 
    currentTheme, 
    setTheme 
  } = useAppStore();
  

  const { theme } = use(AppContext);


  return (
    <header className="h-[38px] flex items-center justify-between p-2 px-3 border-b border-border-secondary">
      <title>PATH COMPUTER</title>
      <link rel="icon" href="/any-icon.svg" />
      <LogoEN width="105" height="20" />
      <div className="flex items-center space-x-4">
        <RadioSwitch
          items={[
            { value: 'light', icon: 'light_mode' },
            { value: 'dark', icon: 'dark_mode' },
          ]}
          value={currentTheme === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : currentTheme}
          onChange={(value) => setTheme(value as 'light' | 'dark')}
          size="sm"
        />
      </div>
    </header>
  );
};

export default PadHeader;
