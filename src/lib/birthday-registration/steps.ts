export interface BirthdayStepDef {
  id: string;
  title: string;
  explainer?: string;
  required: boolean;
}

export const BIRTHDAY_STEPS: BirthdayStepDef[] = [
  {
    id: 'organizer',
    title: 'Tell us about yourself',
    explainer: 'We need your contact info to coordinate your child\'s special day.',
    required: true
  },
  {
    id: 'child-details',
    title: 'Who are we celebrating?',
    explainer: 'Tell us about the birthday child.',
    required: true
  },
  {
    id: 'event-details',
    title: 'When should we celebrate?',
    explainer: 'Choose your preferred date and time. We calculate the day of week automatically.',
    required: true
  },
  {
    id: 'capacity-choice',
    title: 'How many kids are you planning for?',
    explainer: 'Choose your expected capacity bucket to see the base pricing.',
    required: true
  },
  {
    id: 'kids-count',
    title: 'Precise guest count',
    explainer: 'Tell us exactly how many children you expect so we can prepare accordingly.',
    required: true
  },
  {
    id: 'playground-choice',
    title: 'Include the indoor playground?',
    explainer:
      'Optional add-on with guaranteed access when selected. Priced separately from the birthday base.',
    required: true
  },
  {
    id: 'derived-track-summary',
    title: 'Your birthday setup',
    explainer: 'We selected the matching pricing track from your answers.',
    required: false
  },
  {
    id: 'simple-table-upgrades',
    title: 'Would you like us to add anything to the table setup?',
    explainer: 'Simple table birthdays are parent-led by default. Add only what you want Casa Luma to provide.',
    required: false
  },
  {
    id: 'buffet-menu',
    title: 'Select main course',
    explainer: 'Our buffet includes starters, desserts, and drinks. Select one main course option.',
    required: true
  },
  {
    id: 'add-on-activities',
    title: 'Add-on activities',
    explainer: 'These are optional extras and are priced separately from the birthday setup.',
    required: false
  },
  {
    id: 'notes',
    title: 'Special notes & requests',
    explainer: 'Tell us about allergies, dietary restrictions, preferred themes, timing needs, or special setups.',
    required: false
  },
  {
    id: 'rules',
    title: 'Notes & venue rules',
    explainer: 'Please review and accept our guidelines for a safe, comfortable celebration.',
    required: true
  }
];
