import { type Kid, type Caregiver, type IntakeFormData } from '$lib/types/intake';
import { STEPS, type StepDef } from './steps';

export class IntakeFormState {
  // Form data
  familyName = $state('');
  mainPhone = $state('');
  email = $state('');
  kids = $state<Kid[]>([
    {
      id: crypto.randomUUID(),
      name: '',
      gender: 'Boy',
      dob: '',
      notes: ''
    }
  ]);
  caregivers = $state<Caregiver[]>([
    {
      id: crypto.randomUUID(),
      name: '',
      caregiverRole: 'Parent',
      contactMethod: 'WhatsApp',
      phone: '',
      notes: ''
    }
  ]);
  livesInPhangan = $state<boolean | null>(null);
  nationality = $state('');
  dietaryPreference = $state('None');
  howDidYouHear = $state('');
  specialNotes = $state('');

  // Step navigation
  currentStep = $state(0);
  direction = $state<'forward' | 'backward'>('forward');

  // Rules
  rulesAccepted = $state(false);

  // Phone check
  foundCustomer = $state<{ name: string; code?: string } | null>(null);

  // Submission state
  submitting = $state(false);
  success = $state(false);
  customerCode = $state<string | undefined>(undefined);

  // Flow control
  isVisitor = $derived(this.livesInPhangan === false);

  /**
   * Filtered list of steps based on whether the user is a visitor or resident.
   */
  visibleSteps = $derived.by(() => {
    return STEPS.filter(step => {
      if (this.isVisitor && step.residentOnly) return false;
      return true;
    });
  });

  totalSteps = $derived(this.visibleSteps.length);
  isLastStep = $derived(this.currentStep === this.totalSteps - 1);
  currentStepDef = $derived(this.visibleSteps[this.currentStep]) as StepDef;

  /**
   * Validates if the user can proceed from the current step.
   */
  canProceed(): boolean {
    const step = this.currentStepDef;
    if (!step) return false;

    switch (step.id) {
      case 'residency':
        return this.livesInPhangan !== null;
      case 'family-name':
        return this.familyName.trim().length > 0;
      case 'phone':
        // Basic phone validation - just non-empty for now as per plan
        return this.mainPhone.trim().length > 0;
      case 'guardians':
        if (this.isVisitor) return true;
        // If guardians step exists but is not required (from StepDef), always allow proceeding
        if (!this.currentStepDef.required) return true;
        // Residents must have at least one caregiver with a name
        return this.caregivers.length > 0 && this.caregivers.every(c => c.name.trim().length > 0);
      case 'kids':
        // Kids are optional, but if any are added, they must have names
        return this.kids.every(k => k.name.trim().length > 0);
      case 'extras':
        return true;
      case 'rules':
        return this.rulesAccepted;
      default:
        return true;
    }
  }

  next() {
    if (this.canProceed()) {
      if (this.currentStep < this.totalSteps - 1) {
        this.direction = 'forward';
        this.currentStep++;
      }
    }
  }

  back() {
    if (this.currentStep > 0) {
      this.direction = 'backward';
      this.currentStep--;
    }
  }

  /**
   * Skips the current step if it's not required.
   * According to plan: "same as next but doesn't validate"
   */
  skip() {
    if (this.currentStep < this.totalSteps - 1) {
      this.direction = 'forward';
      this.currentStep++;
    }
  }

  addKid() {
    this.kids.push({
      id: crypto.randomUUID(),
      name: '',
      gender: 'Boy',
      dob: '',
      notes: ''
    });
  }

  removeKid(id: string) {
    this.kids = this.kids.filter(k => k.id !== id);
  }

  addCaregiver() {
    this.caregivers.push({
      id: crypto.randomUUID(),
      name: '',
      caregiverRole: 'Parent',
      contactMethod: 'WhatsApp',
      phone: this.mainPhone, // Default to main phone
      notes: ''
    });
  }

  removeCaregiver(id: string) {
    this.caregivers = this.caregivers.filter(c => c.id !== id);
  }

  /**
   * Resets the form state to initial values.
   */
  reset() {
    this.familyName = '';
    this.mainPhone = '';
    this.email = '';
    this.kids = [
      {
        id: crypto.randomUUID(),
        name: '',
        gender: 'Boy',
        dob: '',
        notes: ''
      }
    ];
    this.caregivers = [
      {
        id: crypto.randomUUID(),
        name: '',
        caregiverRole: 'Parent',
        contactMethod: 'WhatsApp',
        phone: '',
        notes: ''
      }
    ];
    this.livesInPhangan = null;
    this.nationality = '';
    this.dietaryPreference = 'None';
    this.howDidYouHear = '';
    this.specialNotes = '';
    this.currentStep = 0;
    this.direction = 'forward';
    this.rulesAccepted = false;
    this.submitting = false;
    this.success = false;
    this.customerCode = undefined;
  }

  /**
   * Serializes the current state into IntakeFormData for submission.
   */
  toFormData(): IntakeFormData {
    return {
      familyName: this.familyName,
      mainPhone: this.mainPhone,
      email: this.email || undefined,
      kids: this.kids.filter(k => k.name.trim() !== ''),
      caregivers: this.caregivers.filter(c => c.name.trim() !== ''),
      livesInPhangan: this.livesInPhangan,
      nationality: this.nationality || undefined,
      dietaryPreference: this.dietaryPreference,
      howDidYouHear: this.howDidYouHear,
      specialNotes: this.specialNotes,
    };
  }
}
