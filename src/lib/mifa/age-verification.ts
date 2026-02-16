// Age verification and supervision mode logic for Mifa

export function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
}

export type SupervisionMode = "guided" | "trusted" | "adult";
export type AgeBracket = "12-14" | "15-17" | "18+";

export function getSupervisionMode(age: number): SupervisionMode {
  if (age < 12) throw new Error("Must be at least 12 years old");
  if (age <= 14) return "guided";
  if (age <= 17) return "trusted";
  return "adult";
}

export function getAgeBracket(age: number): AgeBracket {
  if (age >= 12 && age <= 14) return "12-14";
  if (age >= 15 && age <= 17) return "15-17";
  return "18+";
}

export function isMinor(age: number): boolean {
  return age < 18;
}

export function validateBirthdate(birthdate: Date): { valid: boolean; error?: string } {
  const age = calculateAge(birthdate);

  if (age < 12) {
    return { valid: false, error: "L'utilisateur doit avoir au moins 12 ans" };
  }

  if (age > 120) {
    return { valid: false, error: "Date de naissance invalide" };
  }

  return { valid: true };
}
