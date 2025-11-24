"use client";

import { createContext, useContext, useState, useEffect } from "react";

const Employees = createContext();

export function EmployeesProvider({ children }) {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => setEmployees(data));
  }, []);

  return (
    <Employees.Provider value={{ employees, setEmployees }}>
      {children}
    </Employees.Provider>
  );
}

export function useEmployees() {
  return useContext(Employees);
}