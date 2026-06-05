import React, { createContext, useContext } from 'react';

const NoCodeSDKContext = createContext({ isReady: true });

export const useNoCodeSDK = () => useContext(NoCodeSDKContext);

// 简化版 Provider — 直接渲染 children，不依赖 NoCode SDK
export const NoCodeProvider = ({ children }) => {
  return (
    <NoCodeSDKContext.Provider value={{ isReady: true }}>
      {children}
    </NoCodeSDKContext.Provider>
  );
};
