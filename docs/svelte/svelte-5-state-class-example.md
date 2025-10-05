# Svelte 5 State Management Classes Example

This document demonstrates how to create and use state management classes in Svelte 5, including regular classes, singletons, and context management.

## Basic State Class Example

Here's an example of a basic state management class:

```ts
// CounterState.svelte.ts
export class CounterState {
    count = $state(0);
    multiplier = $state(2);
    
    // Derived values work in classes too!
    doubleCount = $derived(this.count * this.multiplier);
    
    // You can also use $derived.by for more complex computations
    isEven = $derived.by(() => {
        return this.count % 2 === 0;
    });

    increment() {
        this.count++;
    }

    decrement() {
        this.count--;
    }

    setMultiplier(value: number) {
        this.multiplier = value;
    }

    reset() {
        this.count = 0;
        this.multiplier = 2;
    }
}
```

### Usage in a Component

```svelte
<script lang="ts">
    import { CounterState } from './CounterState.svelte.ts';
    
    const counter = new CounterState();
</script>

<div>
    <h2>Counter: {counter.count}</h2>
    <p>Double Count: {counter.doubleCount}</p>
    <p>Is Even: {counter.isEven}</p>
    
    <button onclick={() => counter.increment()}>+</button>
    <button onclick={() => counter.decrement()}>-</button>
    <button onclick={() => counter.reset()}>Reset</button>
    
    <label>
        Multiplier:
        <input 
            type="number" 
            value={counter.multiplier}
            onchange={(e) => counter.setMultiplier(Number(e.currentTarget.value))}
        />
    </label>
</div>
```

## Singleton State Class Example

Here's an example of a singleton state class that can be used across multiple components:

```ts
// ThemeState.svelte.ts
export class ThemeState {
    private static instance: ThemeState;
    
    theme = $state<'light' | 'dark'>('light');
    fontSize = $state(16);
    
    // Derived state works in singletons too
    isDarkMode = $derived(this.theme === 'dark');
    
    private constructor() {
        // Initialize any state here
        // Load from localStorage, etc.
        this.loadPreferences();
    }
    
    static getInstance(): ThemeState {
        if (!ThemeState.instance) {
            ThemeState.instance = new ThemeState();
        }
        return ThemeState.instance;
    }
    
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.savePreferences();
    }
    
    setFontSize(size: number) {
        this.fontSize = size;
        this.savePreferences();
    }
    
    private loadPreferences() {
        if (typeof window === 'undefined') return;
        
        const saved = localStorage.getItem('theme-preferences');
        if (saved) {
            const prefs = JSON.parse(saved);
            this.theme = prefs.theme;
            this.fontSize = prefs.fontSize;
        }
    }
    
    private savePreferences() {
        if (typeof window === 'undefined') return;
        
        localStorage.setItem('theme-preferences', JSON.stringify({
            theme: this.theme,
            fontSize: this.fontSize
        }));
    }
}
```

### Usage of Singleton

```svelte
<script lang="ts">
    import { ThemeState } from './ThemeState.svelte.ts';
    
    const themeState = ThemeState.getInstance();
</script>

<div style="font-size: {themeState.fontSize}px">
    <h2>Current Theme: {themeState.theme}</h2>
    <button onclick={() => themeState.toggleTheme()}>
        Toggle Theme
    </button>
    
    <label>
        Font Size:
        <input 
            type="range" 
            min="12" 
            max="24" 
            value={themeState.fontSize}
            onchange={(e) => themeState.setFontSize(Number(e.currentTarget.value))}
        />
    </label>
</div>
```

## Context Management in Svelte 5

Svelte's context API is still useful for passing data down the component tree. Here's how to use it with TypeScript:

```ts
// contexts.ts
import { getContext, setContext } from 'svelte';

// Define your context key (using Symbol is recommended)
const THEME_KEY = Symbol('theme');

// Type for your context value
interface ThemeContext {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

// Helper functions to set/get context with type safety
export function setThemeContext(context: ThemeContext) {
    setContext(THEME_KEY, context);
}

export function getThemeContext(): ThemeContext {
    return getContext(THEME_KEY);
}
```

### Using Context in Components

```svelte
<!-- Parent.svelte -->
<script lang="ts">
    import { setThemeContext } from './contexts';
    import Child from './Child.svelte';
    
    let theme = $state<'light' | 'dark'>('light');
    
    function toggleTheme() {
        theme = theme === 'light' ? 'dark' : 'light';
    }
    
    // Set the context for child components
    setThemeContext({
        theme,
        toggleTheme
    });
</script>

<div class="theme-{theme}">
    <Child />
</div>

<!-- Child.svelte -->
<script lang="ts">
    import { getThemeContext } from './contexts';
    
    const { theme, toggleTheme } = getThemeContext();
</script>

<div>
    <p>Current Theme: {theme}</p>
    <button onclick={toggleTheme}>Toggle Theme</button>
</div>
```

> **⚠️ Important:** getContext and setContext can be called ONLY during component initialization. 
> But the context itself (either class or not) can be mutated at any time.
## Best Practices

1. **State Initialization**
   - Initialize all state in the constructor
   - Use TypeScript for better type safety
   - Consider using private fields for internal state

2. **Reactivity**
   - Use `$state` for mutable values
   - Use `$derived` for computed values
   - Use `$derived.by` for complex computations

3. **Singletons**
   - Use private constructors
   - Implement getInstance() method
   - Consider initialization timing
   - Handle SSR cases appropriately

4. **Context**
   - Use Symbols for context keys
   - Provide type-safe helper functions
   - Keep context values immutable when possible

5. **Memory Management**
   - Clean up subscriptions and event listeners
   - Implement destroy methods when needed
   - Be careful with circular references

6. **Debugging**
   - Use `$inspect` to track state changes during development
   - Use `$state.snapshot` when you need to log or serialize state
   - Consider creating debug-only inspections that can be removed in production
   - Use descriptive labels in `$inspect` calls to easily identify the source

## Advanced Features

### Using SvelteMap for Reactive Collections

```ts
class StateManager {
    items = $state(new SvelteMap<string, Item>());
    
    addItem(id: string, item: Item) {
        this.items.set(id, item);
    }
    
    removeItem(id: string) {
        this.items.delete(id);
    }
    
    // Derived values work with SvelteMap too
    itemCount = $derived(this.items.size);
}
```

### State Snapshots

```ts
class StateManager {
    data = $state({ count: 0, items: [] });
    
    logSnapshot() {
        // Get a snapshot of the current state
        // Useful when you need a non-reactive version of a complex object
        // The reactive version would usually be a proxy, making it hard to inspect or serialize
        const snapshot = $state.snapshot(this.data);
        console.log('Current State:', snapshot);
    }
}
```

### Effects in Classes

```ts
class StateManager {
    value = $state(0);
    
    constructor() {
        // Effects in classes should be wrapped in $effect.root
        // This ensures proper cleanup when the instance is destroyed
        $effect.root(() => {
            $effect(() => {
                console.log('Value changed:', this.value);
                // Do something when value changes
            });
        });
    }
}
```

### Debugging with $inspect

```ts
class DebugStateManager {
    count = $state(0);
    multiplier = $state(2);
    
    // Use $inspect to log state changes during development
    total = $derived.by(() => {
        const result = this.count * this.multiplier;
        // $inspect will log every time the value changes
        $inspect(result, 'Total value changed to:');
        return result;
    });
    
    constructor() {
        // You can also inspect individual state values
        $inspect(this.count, 'Count changed:');
        
        // Or multiple values at once
        $inspect([this.count, this.multiplier], 'Count or multiplier changed:');
    }
}
```

### Getters, Setters and Validation

Svelte automatically creates getters and setters for class properties, making them reactive. However, you can also define your own accessors for validation and encapsulation:

```ts
const MAX_SIZE = 100;

class Box {
    // Private state properties using # prefix
    #width = $state(0);
    #height = $state(0);
    
    // Derived values can use the getters
    area = $derived(this.width * this.height);
    
    constructor(width: number, height: number) {
        // Initialize using the setters to ensure validation
        this.width = width;
        this.height = height;
    }
    
    // Getters - provide read access to private state
    get width() {
        return this.#width;
    }
    
    get height() {
        return this.#height;
    }
    
    // Setters - validate values before updating state
    set width(value: number) {
        this.#width = Math.max(0, Math.min(MAX_SIZE, value));
    }
    
    set height(value: number) {
        this.#height = Math.max(0, Math.min(MAX_SIZE, value));
    }
    
    // Methods will use the validated setters
    embiggen(amount: number) {
        this.width += amount;  // Uses the setter, so value is validated
        this.height += amount; // Uses the setter, so value is validated
    }
}
```

### Usage with Validation

```svelte
<script lang="ts">
    import { Box } from './Box.svelte.ts';
    
    const box = new Box(50, 50);
</script>

<div>
    <h2>Box Dimensions</h2>
    
    <!-- These bindings will use the getters/setters automatically -->
    <label>
        Width:
        <input 
            type="range" 
            min="0" 
            max="150" 
            bind:value={box.width}
        />
        {box.width}
    </label>
    
    <label>
        Height:
        <input 
            type="range" 
            min="0" 
            max="150" 
            bind:value={box.height}
        />
        {box.height}
    </label>
    
    <p>Area: {box.area}</p>
    
    <!-- Even when calling methods, values are validated -->
    <button onclick={() => box.embiggen(10)}>
        Make Bigger
    </button>
</div>
```

Key points about getters and setters in Svelte 5:
- Use private fields (with `#` prefix) to encapsulate state
- Getters and setters are automatically reactive
- Validation in setters affects all ways of updating the value (bindings, method calls, etc.)
- Derived values can use getters and will update correctly
- TypeScript provides better type safety for accessors 