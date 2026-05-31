import { type BirthdayIntakeFormData } from '$lib/types/birthday-intake';
import {
	calculateBirthdayQuote,
	deriveBirthdayTrack,
	type BirthdayCapacityBucket
} from '$lib/birthday-pricing';
import { BIRTHDAY_STEPS, type BirthdayStepDef } from './steps';

export class BirthdayFormState {
  // 1. Core Contact & Child Fields
  parentName = $state('');
  phone = $state('');
  email = $state('');
  childName = $state('');
  turningAge = $state<number | null>(null);
  eventDate = $state('');
  startTime = $state('');

  // 2. Capacity & Format
  capacityBucket = $state<BirthdayCapacityBucket | null>(null);
  kidsCount = $state<number | null>(null);
  includePlayground = $state<boolean | null>(null);

  // 3. Derived Booking Track (The "Package")
  derivedTrack = $derived.by(() =>
    deriveBirthdayTrack(this.eventDate, this.capacityBucket)
  );

  // 4. Smaller Setup specific options (Upgrades)
  simpleTableBuffet = $state(false);
  simpleTableCake = $state(false);
  simpleTableDecorations = $state(false);

  // 5. Buffet Main Course
  mainCourse = $state<'nuggets-fries' | 'hot-dogs' | 'sandwiches' | null>(null);

  // 6. Activities Add-ons
  addonFacePainting = $state(false);
  addonMovementActivity = $state(false);
  addonPlantingWorkshop = $state(false);

  // 7. Comments & Agreement
  specialNotes = $state('');
  rulesAccepted = $state(false);

  // 8. Navigation State
  currentStepIndex = $state(0);
  direction = $state<'forward' | 'backward'>('forward');
  submitting = $state(false);
  success = $state(false);
  bookingReference = $state<string | undefined>(undefined);

  constructor() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      this.parentName = params.get('parentName') || '';
      this.phone = params.get('phone') || '';
      this.email = params.get('email') || '';
      this.childName = params.get('childName') || '';
      const age = params.get('turningAge');
      this.turningAge = age ? parseInt(age) : null;
      this.eventDate = params.get('eventDate') || '';
      this.startTime = params.get('startTime') || '';
      this.capacityBucket = (params.get('capacityBucket') as BirthdayCapacityBucket | null) || null;
      const kids = params.get('kidsCount');
      this.kidsCount = kids ? parseInt(kids) : null;
      const playground = params.get('includePlayground');
      this.includePlayground =
        playground === 'true' ? true : playground === 'false' ? false : null;
      this.simpleTableBuffet = params.get('simpleTableBuffet') === 'true';
      this.simpleTableCake = params.get('simpleTableCake') === 'true';
      this.simpleTableDecorations = params.get('simpleTableDecorations') === 'true';
      this.mainCourse = params.get('mainCourse') as any || null;
      this.addonFacePainting = params.get('addonFacePainting') === 'true';
      this.addonMovementActivity = params.get('addonMovementActivity') === 'true';
      this.addonPlantingWorkshop = params.get('addonPlantingWorkshop') === 'true';
      this.specialNotes = params.get('specialNotes') || '';
      const step = params.get('step');
      this.currentStepIndex = step ? parseInt(step) : 0;
    }

    $effect(() => {
      if (typeof window === 'undefined') return;
      
      const params = new URLSearchParams();
      if (this.parentName) params.set('parentName', this.parentName);
      if (this.phone) params.set('phone', this.phone);
      if (this.email) params.set('email', this.email);
      if (this.childName) params.set('childName', this.childName);
      if (this.turningAge) params.set('turningAge', this.turningAge.toString());
      if (this.eventDate) params.set('eventDate', this.eventDate);
      if (this.startTime) params.set('startTime', this.startTime);
      if (this.capacityBucket) params.set('capacityBucket', this.capacityBucket);
      if (this.kidsCount) params.set('kidsCount', this.kidsCount.toString());
      if (this.includePlayground !== null) {
        params.set('includePlayground', this.includePlayground ? 'true' : 'false');
      }
      if (this.simpleTableBuffet) params.set('simpleTableBuffet', 'true');
      if (this.simpleTableCake) params.set('simpleTableCake', 'true');
      if (this.simpleTableDecorations) params.set('simpleTableDecorations', 'true');
      if (this.mainCourse) params.set('mainCourse', this.mainCourse);
      if (this.addonFacePainting) params.set('addonFacePainting', 'true');
      if (this.addonMovementActivity) params.set('addonMovementActivity', 'true');
      if (this.addonPlantingWorkshop) params.set('addonPlantingWorkshop', 'true');
      if (this.specialNotes) params.set('specialNotes', this.specialNotes);
      if (this.currentStepIndex > 0) params.set('step', this.currentStepIndex.toString());

      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    });
  }

  quote = $derived.by(() =>
    calculateBirthdayQuote({
      eventDate: this.eventDate,
      capacityBucket: this.capacityBucket,
      kidsCount: this.kidsCount || 0,
      includePlayground: this.includePlayground,
      simpleTableBuffet: this.simpleTableBuffet,
      simpleTableCake: this.simpleTableCake,
      simpleTableDecorations: this.simpleTableDecorations,
      addonFacePainting: this.addonFacePainting,
      addonMovementActivity: this.addonMovementActivity,
      addonPlantingWorkshop: this.addonPlantingWorkshop
    })
  );

  /**
   * Filter steps dynamically depending on the selected format and upgrades.
   */
  visibleSteps = $derived.by(() => {
    return BIRTHDAY_STEPS.filter(step => {
      if (step.id === 'simple-table-upgrades') {
        return this.capacityBucket === 'up-to-8';
      }
      if (step.id === 'buffet-menu') {
        const includesBuffet = this.capacityBucket === 'up-to-15';
        const upgradedToBuffet = this.capacityBucket === 'up-to-8' && this.simpleTableBuffet;
        return includesBuffet || upgradedToBuffet;
      }
      return true;
    });
  });

  currentStepDef = $derived(this.visibleSteps[this.currentStepIndex]) as BirthdayStepDef;
  totalSteps = $derived(this.visibleSteps.length);
  isLastStep = $derived(this.currentStepIndex === this.totalSteps - 1);

  estimatedTotal = $derived(this.quote.total);

  /**
   * Evaluates validation for the current step (derived so Next button stays in sync).
   */
  canProceed = $derived.by(() => {
    const step = this.currentStepDef;
    if (!step) return false;

    switch (step.id) {
      case 'organizer':
        return this.parentName.trim().length > 0 && this.phone.trim().length > 0;
      case 'child-details':
        return (
          this.childName.trim().length > 0 &&
          this.turningAge !== null &&
          this.turningAge > 0
        );
      case 'event-details':
        return (
          this.eventDate !== '' &&
          this.startTime !== ''
        );
      case 'capacity-choice':
        return this.capacityBucket !== null;
      case 'kids-count':
        return this.kidsCount !== null && this.kidsCount > 0;
      case 'playground-choice':
        return this.includePlayground !== null;
      case 'simple-table-upgrades':
        return true;
      case 'buffet-menu':
        return this.mainCourse !== null;
      case 'add-on-activities':
        return true;
      case 'notes':
        return true;
      case 'rules':
        return this.rulesAccepted;
      default:
        return true;
    }
  });

  selectCapacity(value: BirthdayCapacityBucket) {
    this.capacityBucket = value;
    this.next();
  }

  selectPlayground(value: boolean) {
    this.includePlayground = value;
    this.next();
  }

  next() {
    if (this.canProceed && this.currentStepIndex < this.totalSteps - 1) {
      this.direction = 'forward';
      this.currentStepIndex++;
    }
  }

  back() {
    if (this.currentStepIndex > 0) {
      this.direction = 'backward';
      this.currentStepIndex--;
    }
  }

  skip() {
    if (this.currentStepIndex < this.totalSteps - 1) {
      this.direction = 'forward';
      this.currentStepIndex++;
    }
  }

  reset() {
    this.parentName = '';
    this.phone = '';
    this.email = '';
    this.childName = '';
    this.turningAge = null;
    this.eventDate = '';
    this.startTime = '';
    this.capacityBucket = null;
    this.kidsCount = null;
    this.includePlayground = null;
    this.simpleTableBuffet = false;
    this.simpleTableCake = false;
    this.simpleTableDecorations = false;
    this.mainCourse = null;
    this.addonFacePainting = false;
    this.addonMovementActivity = false;
    this.addonPlantingWorkshop = false;
    this.specialNotes = '';
    this.rulesAccepted = false;
    this.currentStepIndex = 0;
    this.direction = 'forward';
    this.submitting = false;
    this.success = false;
    this.bookingReference = undefined;
  }

  toFormData(): BirthdayIntakeFormData {
    return {
      parentName: this.parentName,
      phone: this.phone,
      email: this.email || undefined,
      childName: this.childName,
      turningAge: this.turningAge || 0,
      eventDate: this.eventDate,
      startTime: this.startTime,
      selectedPackage: this.derivedTrack!,
      kidsCount: this.kidsCount || 0,
      includePlayground: this.includePlayground === true,
      smallerSetupBuffet: this.simpleTableBuffet,
      smallerSetupCake: this.simpleTableCake,
      smallerSetupDecorations: this.simpleTableDecorations,
      mainCourse: this.mainCourse,
      addonFacePainting: this.addonFacePainting,
      addonMovementActivity: this.addonMovementActivity,
      addonPlantingWorkshop: this.addonPlantingWorkshop,
      specialNotes: this.specialNotes,
      rulesAccepted: this.rulesAccepted,
      estimatedTotal: this.estimatedTotal
    };
  }
}
