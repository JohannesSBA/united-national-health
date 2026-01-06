"use client";

export function useCheckInDialog() {
  const confirm = async (patientDisplayName?: string) => {
    return window.confirm(
      `Mark ${patientDisplayName ?? "this patient"} as arrived?`,
    );
  };
  return { confirm };
}


