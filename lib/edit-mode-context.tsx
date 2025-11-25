"use client";

/**
 * Edit Mode Context
 *
 * Global context to manage view/edit mode across the application
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EditModeContextType {
  isEditMode: boolean;
  enableEditMode: () => void;
  disableEditMode: () => void;
  toggleEditMode: () => void;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);

  const enableEditMode = () => setIsEditMode(true);
  const disableEditMode = () => setIsEditMode(false);
  const toggleEditMode = () => setIsEditMode(prev => !prev);

  return (
    <EditModeContext.Provider value={{ isEditMode, enableEditMode, disableEditMode, toggleEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
}
