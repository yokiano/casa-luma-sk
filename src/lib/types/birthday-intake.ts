export interface BirthdayIntakeFormData {
  parentName: string;
  phone: string;
  email?: string;
  childName: string;
  turningAge: number;
  eventDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  selectedPackage: 'mon-sat' | 'sunday' | 'smaller-setup';
  kidsCount: number;
  includePlayground: boolean;
  smallerSetupBuffet: boolean;
  smallerSetupCake: boolean;
  smallerSetupDecorations: boolean;
  mainCourse: 'nuggets-fries' | 'hot-dogs' | 'sandwiches' | null;
  addonFacePainting: boolean;
  addonMovementActivity: boolean;
  addonPlantingWorkshop: boolean;
  specialNotes: string;
  rulesAccepted: boolean;
  estimatedTotal: number;
}

export interface BirthdayBookingResult {
  success: boolean;
  message?: string;
  bookingReference?: string;
}
