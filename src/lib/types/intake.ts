export interface IntakeFormData {
  familyName: string;
  mainPhone: string;
  email?: string;
  kids: Kid[];
  caregivers: Caregiver[];
  livesInPhangan: boolean | null;
  nationality?: string;
  dietaryPreference: string;
  howDidYouHear: string;
  specialNotes: string;
}

export interface Kid {
  id: string;
  name: string;
  gender: 'Boy' | 'Girl';
  dob: string; // YYYY-MM-DD (from <input type="date" />)
  notes?: string;
}

export interface Caregiver {
  id: string;
  name: string;
  caregiverRole: 'Parent' | 'Caregiver';
  contactMethod: 'Thai Phone' | 'WhatsApp';
  phone: string;
  notes?: string;
}
