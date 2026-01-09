export interface IntakeFormData {
  familyName: string;
  email?: string;
  kids: Kid[];
  guardians: Guardian[];
  livesInPhangan: boolean | null;
  nationality?: string;
  dietaryPreference: string;
  howDidYouHear: string;
  specialNotes: string;
}

export interface Kid {
  id: string;
  name: string;
  gender: 'boy' | 'girl';
  age: number;
  notes?: string;
}

export interface Guardian {
  id: string;
  name: string;
  contactType: 'thai' | 'whatsapp';
  phone: string;
  notes?: string;
}
