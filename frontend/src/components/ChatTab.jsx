import React from 'react';
import ChatPanel from './Chat/ChatPanel';

export default function ChatTab({
  collections,
  selectedCollection,
  setSelectedCollection,
  selectedModel,
  setSelectedModel,
  settings,
}) {
  return (
    <ChatPanel
      collections={collections}
      selectedCollection={selectedCollection}
      selectedModel={selectedModel}
      settings={settings}
    />
  );
}
