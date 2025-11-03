# Svelte 5 example and cheatsheet.

This is an example of a svelte 5 syntax component. 
It tries to demonstrate the most common use cases for the new svelte 5 syntax, tryig to highlihgt the differences between v4 and v5.

this component is a simple counter with a label and a value.

```ts
<script lang="ts">
  import { Component, Snippet } from 'svelte';

  interface Props {
    label: string;
    icon: Component;
    value: number;

    // (optional) children snippet -a snippet used to render all un-named slots of the component. instead of <slot /> in svelte 4.
    children?: Snippet;

    // we can also name the snippet/slots and pass arguments to them.
    displaySnippet?: Snippet<[number]>;
  }

  let {
    label,
    value = $bindable(0), // to make a property bindable, we use the $bindable decorator.
    
    children,
    displaySnippet,

    // Renaming so we can use it as component in the markup.
    icon : Icon,
  }: Props = $props();

  // We can define $state runes for anything that we want to be reactive and/or we want to mutate it later. replaces the "let multiplier = 100" in svelte 4.
  // State of complex objects (array/object) is deeply reactive, and they should be passed using getters/setters if passed by value.
  let multiplier = $state(100);

  // We can also create derived values from state (properties passed to component are automatically state runes )
  const value100x = $derived(value * multiplier);

  let maximumNumber = $state(2000);

  const valueMax = $derived.by(() => {
    if (value100x > maximumNumber) return maximumNumber;
    else return value100x;
  });

  // For tracking on runes (state/derived) we can use $inspect which will print to the console everytime the value updtes. good for troubleshooting.
  $inspect(valueMax);

  // We can also create effects to react to state changes. Any state rune inside the effect will trigger the effect to run. effects also run on component mount.
  // This is used instead of the $: syntax in svelte 4.
  // Effects should be avoided as much as possible, $derived is usually covers most of the use cases.
  $effect(() => {
    if (valueMax > maximumNumber) {
      console.error(
        'valueMax is greater than maximumNumber, unexpected behavior!'
      );
    }
  });
</script>

<!-- Snippets can also be defined in the component to reuse code (instead of creating a new component). -->
{#snippet defaultDisplay()}
  <div class="flex items-center gap-2">
    
    <!-- in svelte 5 we can use any variable that contains a component as long it has uppercase first letter. this replaces <svelte:component this={icon} /> -->
    <Icon />

    <span class="text-primary bg-secondary">{valueMax}</span>
  </div>
{/snippet}

<div>
  <label for="value"
    >{label}
    <input id="value" type="number" bind:value />
  </label>
  <label for="multiplier"
    >Multiplier
    <input id="multiplier" type="number" bind:value={multiplier} />
  </label>
  <label for="maximumNumber"
    >Maximum Number
    <input id="maximumNumber" type="number" bind:value={maximumNumber} />
  </label>

  {#if displaySnippet}
    <!-- this is how we render snippets. -->
    {@render displaySnippet(value)}
  {:else}
    {@render defaultDisplay()}
  {/if}

  {#if children}
    {@render children()}
  {/if}
</div>

## Usage Examples

### Default Display
```ts
<Counter label="Counter 1" icon={someIcon} />
```

### Custom Display
```ts
<Counter label="Counter 1" icon={someIcon} >
{#snippet displaySnippet(value: number)}
  <div class="card">
    <span class="text-red-500">{value}</span>
  </div>
{/snippet}
</Counter>
```

### With Children
```ts
<Counter label="Counter 1" icon={someIcon} >
    <span class="text-red-500 text-sm">this counter was built with svelte 5</span>
</Counter>
```
## More things that have changed since svelte 4

- the `<Component let:something>` syntax is working only on non-runes mode. in runes mode the way to pass variables to component children is using the snippet properties.
- the `on:event` syntax is replaced with `onevent`. So on:click becomes onclick. 
- To allow passing html attributes to the component, the props interface should extend `HTMLAttributes<HTMLSomeElement>`. i.e `interface Props extends HTMLAttributes<HTMLInputElement> { ... }`. Then using `...props` will pass all the html attributes to the component.

## Common Mistakes and Corrections

### Snippets Location in the file

The snippet definition ({#snippet}{/snippet}) should be located inside the markup, not in the script block. perferably after the script block before the markup.

### ❌ Overusing $effect

**Problem**: `$effect` adds unnecessary reactivity overhead. It's often the wrong tool.

**Wrong** - Using effect for simple initialization:
```ts
$effect.pre(() => {
  loadData();
});
```

**Better** - Just call the function directly:
```ts
async function loadData() {
  // fetch logic
}

loadData();
```

**When to use $effect**: 
- Side effects that must re-run when specific state changes
- Cleanup operations (using `return () => { cleanup() }`)
- Very rarely needed in practice - prefer `$derived` instead

**Better alternative for computed values** - Use `$derived`:
```ts
// ❌ Don't do this with effect
$effect(() => {
  totalPrice = items.reduce((sum, item) => sum + item.price, 0);
});

// ✅ Use $derived instead
const totalPrice = $derived(items.reduce((sum, item) => sum + item.price, 0));
```

---

### Props Typing

❌ Wrong:
```ts
let { data } = $props<Props>() 
```
✅ Correct:
```ts
let {data} : Props = $props()
```

No Need for declaring state in the prop. all props are automatically state runes. I think.
```ts
let { something = $state(0) } : Props = $props()
```

### Derived Values

❌ Wrong (using derived instead of derived.by):
```ts
const some = $derived(() => {
  // something
});
```
✅ Correct:
```ts
const some = $derived.by(() => {
  // something
});
```

### Derived Calculations

❌ Wrong (not assigning the result):
```ts
$derived.by(() => {
  // something
});
```
✅ Correct:
```ts
const some = $derived.by(() => {
  // something
});
```