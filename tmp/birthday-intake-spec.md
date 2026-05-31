# Birthday Intake Wizard - Technical Spec & Implementation Plan

This spec defines the code structure, Svelte 5 runes design, transitions, and style conventions for implementing the Birthday Booking Intake Form.

---

## 1. Directory & File Structure

We will mirror the successful pattern used in the general customer intake flow:

```text
src/
├── lib/
│   ├── birthday-registration/
│   │   ├── birthday-form.state.svelte.ts  <-- Svelte 5 state class managing all form variables & validation
│   │   ├── steps.ts                       <-- Array of step definitions & condition matching
│   │   ├── BirthdayIntakeStepForm.svelte  <-- Main container displaying current step
│   │   ├── BirthdayStepShell.svelte       <-- Step layout showing title, progress dots, back/skip/next buttons, and live price estimator
│   │   └── components/
│   │       ├── PackageSelectStep.svelte   <-- Custom gorgeous cards for Package Selection
│   │       └── RulesStep.svelte           <-- Birthday-specific contract & notes agreement checkboxes
│   └── types/
│       └── birthday-intake.ts             <-- Interface definitions for booking payload
└── routes/
    └── birthdays/
        └── book/
            ├── +page.svelte               <-- Mounts <BirthdayIntakeStepForm />
            └── +page.server.ts            <-- Actions to validate and send payload to Notion / trigger notifications
```

---

## 2. State Management via Svelte 5 Rune State Class

Following the design rules of Casa Luma, we will avoid `$effect` for state calculations and heavily leverage `$derived` and `$derived.by` for reactive derived values, keeping side-effects to an absolute minimum.

File: `src/lib/birthday-registration/birthday-form.state.svelte.ts`

```typescript
import { type BirthdayIntakeFormData } from '$lib/types/birthday-intake';
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

  // 2. Package selection & Capacity
  selectedPackage = $state<'mon-sat' | 'sunday' | 'smaller-setup' | null>(null);
  kidsCount = $state<number | null>(null);

  // 3. Smaller Setup specific options (Upgrades)
  smallerSetupBuffet = $state(false);
  smallerSetupCake = $state(false);
  smallerSetupDecorations = $state(false);

  // 4. Buffet Main Course
  mainCourse = $state<'nuggets-fries' | 'hot-dogs' | 'sandwiches' | null>(null);

  // 5. Activities Add-ons
  addonFacePainting = $state(false);
  addonMovementActivity = $state(false);
  addonPlantingWorkshop = $state(false);

  // 6. Comments & Agreement
  specialNotes = $state('');
  rulesAccepted = $state(false);

  // 7. Navigation State
  currentStepIndex = $state(0);
  direction = $state<'forward' | 'backward'>('forward');
  submitting = $state(false);
  success = $state(false);
  bookingReference = $state<string | undefined>(undefined);

  // --- Derived Calculations (No $effect!) ---

  /**
   * Filter steps dynamically depending on the selected package and state.
   */
  visibleSteps = $derived.by(() => {
    return BIRTHDAY_STEPS.filter(step => {
      if (step.id === 'smaller-setup-upgrades' && this.selectedPackage !== 'smaller-setup') {
        return false;
      }
      if (step.id === 'buffet-menu') {
        // Shown only if package includes buffet, or small setup upgraded to buffet
        const includesBuffet = this.selectedPackage === 'mon-sat' || this.selectedPackage === 'sunday';
        const upgradedToBuffet = this.selectedPackage === 'smaller-setup' && this.smallerSetupBuffet;
        return includesBuffet || upgradedToBuffet;
      }
      return true;
    });
  });

  currentStepDef = $derived(this.visibleSteps[this.currentStepIndex]) as BirthdayStepDef;
  totalSteps = $derived(this.visibleSteps.length);
  isLastStep = $derived(this.currentStepIndex === this.totalSteps - 1);

  /**
   * Real-time Quote Estimator
   */
  estimatedTotal = $derived.by(() => {
    if (!this.selectedPackage) return 0;
    
    let total = 0;
    const kids = this.kidsCount || 0;

    if (this.selectedPackage === 'mon-sat') {
      total += 12000;
      if (kids > 15) {
        total += (kids - 15) * 700;
      }
    } else if (this.selectedPackage === 'sunday') {
      total += 10000;
      if (kids > 15) {
        total += (kids - 15) * 500;
      }
    } else if (this.selectedPackage === 'smaller-setup') {
      total += 0; // Base is table booking
      if (this.smallerSetupBuffet) {
        total += kids * 500;
      }
      if (this.smallerSetupCake) {
        total += 700;
      }
      if (this.smallerSetupDecorations) {
        total += 500;
      }
    }

    // Add activity add-ons
    if (this.addonFacePainting) total += 3000;
    if (this.addonMovementActivity) total += 5000;
    if (this.addonPlantingWorkshop) total += 6000; // minimum price

    return total;
  });

  /**
   * Evaluates validation for the current step.
   */
  canProceed(): boolean {
    const step = this.currentStepDef;
    if (!step) return false;

    switch (step.id) {
      case 'organizer':
        return this.parentName.trim().length > 0 && this.phone.trim().length > 0;
      case 'child-details':
        return (
          this.childName.trim().length > 0 &&
          this.turningAge !== null &&
          this.turningAge > 0 &&
          this.eventDate !== '' &&
          this.startTime !== ''
        );
      case 'package':
        return this.selectedPackage !== null;
      case 'kids-count':
        return this.kidsCount !== null && this.kidsCount > 0;
      case 'smaller-setup-upgrades':
        return true; // Optional step
      case 'buffet-menu':
        return this.mainCourse !== null;
      case 'add-on-activities':
        return true; // Optional step
      case 'notes':
        return true; // Optional step
      case 'rules':
        return this.rulesAccepted;
      default:
        return true;
    }
  }

  next() {
    if (this.canProceed() && this.currentStepIndex < this.totalSteps - 1) {
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
    this.selectedPackage = null;
    this.kidsCount = null;
    this.smallerSetupBuffet = false;
    this.smallerSetupCake = false;
    this.smallerSetupDecorations = false;
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
      selectedPackage: this.selectedPackage!,
      kidsCount: this.kidsCount || 0,
      smallerSetupBuffet: this.smallerSetupBuffet,
      smallerSetupCake: this.smallerSetupCake,
      smallerSetupDecorations: this.smallerSetupDecorations,
      mainCourse: this.mainCourse,
      addonFacePainting: this.addonFacePainting,
      addonMovementActivity: this.addonMovementActivity,
      addonPlantingWorkshop: this.addonPlantingWorkshop,
      specialNotes: this.specialNotes,
      estimatedTotal: this.estimatedTotal
    };
  }
}
```

---

## 3. UI and Transitions (Casa Luma Esthetics)

- **Layout Structure**: We will reuse `StepShell.svelte` patterns, adjusted to display an elegantly placed, real-time updated budget estimator.
- **Eclectic Warm Style**: Keep elements light and organic. Package selections will use larger, luxurious borders with high-fidelity hover interactions and deep custom shadows.
- **Directional Fly Transitions**: Page-level sliding matches forward/backward direction, rendering a sleek native-app-like feel.

---

## 4. Phase Plan

1. **Phase 1: Docs & Proposal Review (This Step)**
   - Align with the user on flow logic, packages, pricing rules, and tech structure.
2. **Phase 2: Types & Steps Definitions**
   - Create `src/lib/types/birthday-intake.ts` and `src/lib/birthday-registration/steps.ts`.
3. **Phase 3: Svelte 5 Runes State Class**
   - Implement `birthday-form.state.svelte.ts` with derived estimations.
4. **Phase 4: Component Implementation**
   - Create package select cards, rules checklist, main step forms, and shell.
5. **Phase 5: Route Booking Page Mount & server action hookups**
   - Connect Svelte route `/birthdays/book` to mount the wizard and send bookings to Notion.
