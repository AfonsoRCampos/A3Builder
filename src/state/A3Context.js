"use client";

import { createContext, useContext, useState, useEffect } from "react";

const A3s = createContext();

export function A3Provider({ children }) {
  const [a3s, setA3s] = useState([]);

  useEffect(() => {
    fetch('/api/a3s')
      .then(res => res.json())
      .then(data => setA3s(data));
  }, []);

  return (
    <A3s.Provider value={{ a3s, setA3s }}>
      {children}
    </A3s.Provider>
  );
}

export function useA3s() {
  return useContext(A3s);
}