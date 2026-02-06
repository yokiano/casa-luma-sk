export interface StepDef {
  id: string;
  title: string;
  explainer?: string;
  required: boolean;
  visitorOnly?: boolean;  // if true, only shown in visitor flow
  residentOnly?: boolean; // if true, only shown in resident flow
}

export const STEPS: StepDef[] = [
  { 
    id: 'residency', 
    title: 'Welcome to Casa Luma', 
    required: true, 
    explainer: 'Discounts available for long-term residents on some packages' 
  },
  { 
    id: 'family-name', 
    title: "What's your family name?", 
    required: true 
  },
  { 
    id: 'phone', 
    title: 'Your phone number', 
    required: true, 
    explainer: 'This is only for safety and in case we need to contact you! We will never call or message you without reason.' 
  },
  { 
    id: 'guardians', 
    title: 'The Parents/Guardians', 
    required: false, 
    residentOnly: true, 
    explainer: "In case you'd like more people we can reach if needed" 
  },
  { 
    id: 'kids', 
    title: 'Tell us about your kids', 
    required: false, 
    residentOnly: true, 
    explainer: 'We offer birthday perks and benefits. Also helps us know your kids by name.' 
  },
  { 
    id: 'extras', 
    title: 'A few more details (Optional)', 
    required: false, 
    residentOnly: true, 
    explainer: 'Helps us personalize your experience' 
  },
  { 
    id: 'rules', 
    title: 'Before we finish', 
    required: true, 
    explainer: 'Please read and accept before submitting' 
  },
];
