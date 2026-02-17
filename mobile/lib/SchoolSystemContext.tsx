import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type SchoolSystem = "fr" | "uk";

interface SchoolSystemContextValue {
  schoolSystem: SchoolSystem;
  setSchoolSystem: (s: SchoolSystem) => void;
}

const SchoolSystemContext = createContext<SchoolSystemContextValue>({
  schoolSystem: "fr",
  setSchoolSystem: () => {},
});

export function SchoolSystemProvider({ children }: { children: ReactNode }) {
  const [schoolSystem, setSchoolSystem] = useState<SchoolSystem>("fr");
  return (
    <SchoolSystemContext.Provider value={{ schoolSystem, setSchoolSystem }}>
      {children}
    </SchoolSystemContext.Provider>
  );
}

export function useSchoolSystem() {
  return useContext(SchoolSystemContext);
}
