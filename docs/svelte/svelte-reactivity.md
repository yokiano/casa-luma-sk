What are runes?
On this page
What are runes?
rune /ro͞on/ noun

A letter or mark used as a mystical or magic symbol.

Runes are symbols that you use in .svelte and .svelte.js / .svelte.ts files to control the Svelte compiler. If you think of Svelte as a language, runes are part of the syntax — they are keywords.

Runes have a $ prefix and look like functions:


let message = $state('hello');
They differ from normal JavaScript functions in important ways, however:

You don’t need to import them — they are part of the language
They’re not values — you can’t assign them to a variable or pass them as arguments to a function
Just like JavaScript keywords, they are only valid in certain positions (the compiler will help you if you put them in the wrong place)



$state
On this page
$state
$state.raw
$state.snapshot
Passing state into functions
The $state rune allows you to create reactive state, which means that your UI reacts when it changes.


<script>
	let count = $state(0);
</script>

<button onclick={() => count++}>
	clicks: {count}
</button>
Unlike other frameworks you may have encountered, there is no API for interacting with state — count is just a number, rather than an object or a function, and you can update it like you would update any other variable.

Deep state
If $state is used with an array or a simple object, the result is a deeply reactive state proxy. Proxies allow Svelte to run code when you read or write properties, including via methods like array.push(...), triggering granular updates.

Classes like Set and Map will not be proxied, but Svelte provides reactive implementations for various built-ins like these that can be imported from svelte/reactivity.

State is proxified recursively until Svelte finds something other than an array or simple object. In a case like this...


let todos = $state([
	{
		done: false,
		text: 'add more todos'
	}
]);
...modifying an individual todo’s property will trigger updates to anything in your UI that depends on that specific property:


todos[0].done = !todos[0].done;
If you push a new object to the array, it will also be proxified:


todos.push({
	done: false,
	text: 'eat lunch'
});
When you update properties of proxies, the original object is not mutated.

Note that if you destructure a reactive value, the references are not reactive — as in normal JavaScript, they are evaluated at the point of destructuring:


let { done, text } = todos[0];

// this will not affect the value of `done`
todos[0].done = !todos[0].done;
Classes
You can also use $state in class fields (whether public or private):


class Todo {
	done = $state(false);
	text = $state();

	constructor(text) {
		this.text = text;
	}

	reset() {
		this.text = '';
		this.done = false;
	}
}
The compiler transforms done and text into get / set methods on the class prototype referencing private fields. This means the properties are not enumerable.

When calling methods in JavaScript, the value of this matters. This won’t work, because this inside the reset method will be the <button> rather than the Todo:


<button onclick={todo.reset}>
	reset
</button>
You can either use an inline function...


<button onclick={() => todo.reset()}>
	reset
</button>
...or use an arrow function in the class definition:


class Todo {
	done = $state(false);
	text = $state();

	constructor(text) {
		this.text = text;
	}

	reset = () => {
		this.text = '';
		this.done = false;
	}
}
$state.raw
In cases where you don’t want objects and arrays to be deeply reactive you can use $state.raw.

State declared with $state.raw cannot be mutated; it can only be reassigned. In other words, rather than assigning to a property of an object, or using an array method like push, replace the object or array altogether if you’d like to update it:


let person = $state.raw({
	name: 'Heraclitus',
	age: 49
});

// this will have no effect
person.age += 1;

// this will work, because we're creating a new person
person = {
	name: 'Heraclitus',
	age: 50
};
This can improve performance with large arrays and objects that you weren’t planning to mutate anyway, since it avoids the cost of making them reactive. Note that raw state can contain reactive state (for example, a raw array of reactive objects).

$state.snapshot
To take a static snapshot of a deeply reactive $state proxy, use $state.snapshot:


<script>
	let counter = $state({ count: 0 });

	function onclick() {
		// Will log `{ count: ... }` rather than `Proxy { ... }`
		console.log($state.snapshot(counter));
	}
</script>
This is handy when you want to pass some state to an external library or API that doesn’t expect a proxy, such as structuredClone.

Passing state into functions
JavaScript is a pass-by-value language — when you call a function, the arguments are the values rather than the variables. In other words:

index


function add(a: number, b: number) {
	return a + b;
}

let a = 1;
let b = 2;
let total = add(a, b);
console.log(total); // 3

a = 3;
b = 4;
console.log(total); // still 3!
If add wanted to have access to the current values of a and b, and to return the current total value, you would need to use functions instead:

index


function add(getA: () => number, getB: () => number) {
	return () => getA() + getB();
}

let a = 1;
let b = 2;
let total = add(() => a, () => b);
console.log(total()); // 3

a = 3;
b = 4;
console.log(total()); // 7
State in Svelte is no different — when you reference something declared with the $state rune...


let a = $state(1);
let b = $state(2);
...you’re accessing its current value.

Note that ‘functions’ is broad — it encompasses properties of proxies and get/set properties...

index


function add(input: { a: number, b: number }) {
	return {
		get value() {
			return input.a + input.b;
		}
	};
}

let input = $state({ a: 1, b: 2 });
let total = add(input);
console.log(total.value); // 3

input.a = 3;
input.b = 4;
console.log(total.value); // 7
...though if you find yourself writing code like that, consider using classes instead.


$derived
On this page
$derived
$derived.by
Understanding dependencies
Derived state is declared with the $derived rune:


<script>
	let count = $state(0);
	let doubled = $derived(count * 2);
</script>

<button onclick={() => count++}>
	{doubled}
</button>

<p>{count} doubled is {doubled}</p>
The expression inside $derived(...) should be free of side-effects. Svelte will disallow state changes (e.g. count++) inside derived expressions.

As with $state, you can mark class fields as $derived.

Code in Svelte components is only executed once at creation. Without the $derived rune, doubled would maintain its original value even when count changes.

$derived.by
Sometimes you need to create complex derivations that don’t fit inside a short expression. In these cases, you can use $derived.by which accepts a function as its argument.


<script>
	let numbers = $state([1, 2, 3]);
	let total = $derived.by(() => {
		let total = 0;
		for (const n of numbers) {
			total += n;
		}
		return total;
	});
</script>

<button onclick={() => numbers.push(numbers.length + 1)}>
	{numbers.join(' + ')} = {total}
</button>
In essence, $derived(expression) is equivalent to $derived.by(() => expression).

Understanding dependencies
Anything read synchronously inside the $derived expression (or $derived.by function body) is considered a dependency of the derived state. When the state changes, the derived will be marked as dirty and recalculated when it is next read.

To exempt a piece of state from being treated as a dependency, use untrack.


$effect
On this page
$effect
$effect.pre
$effect.tracking
$effect.root
When not to use $effect
Effects are what make your application do things. When Svelte runs an effect function, it tracks which pieces of state (and derived state) are accessed (unless accessed inside untrack), and re-runs the function when that state later changes.

Most of the effects in a Svelte app are created by Svelte itself — they’re the bits that update the text in <h1>hello {name}!</h1> when name changes, for example.

But you can also create your own effects with the $effect rune, which is useful when you need to synchronize an external system (whether that’s a library, or a <canvas> element, or something across a network) with state inside your Svelte app.

Avoid overusing $effect! When you do too much work in effects, code often becomes difficult to understand and maintain. See when not to use $effect to learn about alternative approaches.

Your effects run after the component has been mounted to the DOM, and in a microtask after state changes (demo):


<script>
	let size = $state(50);
	let color = $state('#ff3e00');

	let canvas;

	$effect(() => {
		const context = canvas.getContext('2d');
		context.clearRect(0, 0, canvas.width, canvas.height);

		// this will re-run whenever `color` or `size` change
		context.fillStyle = color;
		context.fillRect(0, 0, size, size);
	});
</script>

<canvas bind:this={canvas} width="100" height="100" />
Re-runs are batched (i.e. changing color and size in the same moment won’t cause two separate runs), and happen after any DOM updates have been applied.

You can place $effect anywhere, not just at the top level of a component, as long as it is called during component initialization (or while a parent effect is active). It is then tied to the lifecycle of the component (or parent effect) and will therefore destroy itself when the component unmounts (or the parent effect is destroyed).

You can return a function from $effect, which will run immediately before the effect re-runs, and before it is destroyed (demo).


<script>
	let count = $state(0);
	let milliseconds = $state(1000);

	$effect(() => {
		// This will be recreated whenever `milliseconds` changes
		const interval = setInterval(() => {
			count += 1;
		}, milliseconds);

		return () => {
			// if a callback is provided, it will run
			// a) immediately before the effect re-runs
			// b) when the component is destroyed
			clearInterval(interval);
		};
	});
</script>

<h1>{count}</h1>

<button onclick={() => (milliseconds *= 2)}>slower</button>
<button onclick={() => (milliseconds /= 2)}>faster</button>
Understanding dependencies
$effect automatically picks up any reactive values ($state, $derived, $props) that are synchronously read inside its function body and registers them as dependencies. When those dependencies change, the $effect schedules a rerun.

Values that are read asynchronously — after an await or inside a setTimeout, for example — will not be tracked. Here, the canvas will be repainted when color changes, but not when size changes (demo):


$effect(() => {
	const context = canvas.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);

	// this will re-run whenever `color` changes...
	context.fillStyle = color;

	setTimeout(() => {
		// ...but not when `size` changes
		context.fillRect(0, 0, size, size);
	}, 0);
});
An effect only reruns when the object it reads changes, not when a property inside it changes. (If you want to observe changes inside an object at dev time, you can use $inspect.)


<script>
	let state = $state({ value: 0 });
	let derived = $derived({ value: state.value * 2 });

	// this will run once, because `state` is never reassigned (only mutated)
	$effect(() => {
		state;
	});

	// this will run whenever `state.value` changes...
	$effect(() => {
		state.value;
	});

	// ...and so will this, because `derived` is a new object each time
	$effect(() => {
		derived;
	});
</script>

<button onclick={() => (state.value += 1)}>
	{state.value}
</button>

<p>{state.value} doubled is {derived.value}</p>
An effect only depends on the values that it read the last time it ran. If a is true, changes to b will not cause this effect to rerun:


$effect(() => {
	console.log('running');

	if (a || b) {
		console.log('inside if block');
	}
});
$effect.pre
In rare cases, you may need to run code before the DOM updates. For this we can use the $effect.pre rune:


<script>
	import { tick } from 'svelte';

	let div = $state();
	let messages = $state([]);

	// ...

	$effect.pre(() => {
		if (!div) return; // not yet mounted

		// reference `messages` array length so that this code re-runs whenever it changes
		messages.length;

		// autoscroll when new messages are added
		if (div.offsetHeight + div.scrollTop > div.scrollHeight - 20) {
			tick().then(() => {
				div.scrollTo(0, div.scrollHeight);
			});
		}
	});
</script>

<div bind:this={div}>
	{#each messages as message}
		<p>{message}</p>
	{/each}
</div>
Apart from the timing, $effect.pre works exactly like $effect.

$effect.tracking
The $effect.tracking rune is an advanced feature that tells you whether or not the code is running inside a tracking context, such as an effect or inside your template (demo):


<script>
	console.log('in component setup:', $effect.tracking()); // false

	$effect(() => {
		console.log('in effect:', $effect.tracking()); // true
	});
</script>

<p>in template: {$effect.tracking()}</p> <!-- true -->
This allows you to (for example) add things like subscriptions without causing memory leaks, by putting them in child effects. Here’s a readable function that listens to changes from a callback function as long as it’s inside a tracking context:


import { tick } from 'svelte';

export default function readable<T>(
	initial_value: T,
	start: (callback: (update: (v: T) => T) => T) => () => void
) {
	let value = $state(initial_value);

	let subscribers = 0;
	let stop: null | (() => void) = null;

	return {
		get value() {
			// If in a tracking context ...
			if ($effect.tracking()) {
				$effect(() => {
					// ...and there's no subscribers yet...
					if (subscribers === 0) {
						// ...invoke the function and listen to changes to update state
						stop = start((fn) => (value = fn(value)));
					}

					subscribers++;

					// The return callback is called once a listener unlistens
					return () => {
						tick().then(() => {
							subscribers--;
							// If it was the last subscriber...
							if (subscribers === 0) {
								// ...stop listening to changes
								stop?.();
								stop = null;
							}
						});
					};
				});
			}

			return value;
		}
	};
}
$effect.root
The $effect.root rune is an advanced feature that creates a non-tracked scope that doesn’t auto-cleanup. This is useful for nested effects that you want to manually control. This rune also allows for the creation of effects outside of the component initialisation phase.


<script>
	let count = $state(0);

	const cleanup = $effect.root(() => {
		$effect(() => {
			console.log(count);
		});

		return () => {
			console.log('effect root cleanup');
		};
	});
</script>
When not to use $effect
In general, $effect is best considered something of an escape hatch — useful for things like analytics and direct DOM manipulation — rather than a tool you should use frequently. In particular, avoid using it to synchronise state. Instead of this...


<script>
	let count = $state(0);
	let doubled = $state();

	// don't do this!
	$effect(() => {
		doubled = count * 2;
	});
</script>
...do this:


<script>
	let count = $state(0);
	let doubled = $derived(count * 2);
</script>
For things that are more complicated than a simple expression like count * 2, you can also use $derived.by.

You might be tempted to do something convoluted with effects to link one value to another. The following example shows two inputs for “money spent” and “money left” that are connected to each other. If you update one, the other should update accordingly. Don’t use effects for this (demo):


<script>
	let total = 100;
	let spent = $state(0);
	let left = $state(total);

	$effect(() => {
		left = total - spent;
	});

	$effect(() => {
		spent = total - left;
	});
</script>

<label>
	<input type="range" bind:value={spent} max={total} />
	{spent}/{total} spent
</label>

<label>
	<input type="range" bind:value={left} max={total} />
	{left}/{total} left
</label>
Instead, use callbacks where possible (demo):


<script>
	let total = 100;
	let spent = $state(0);
	let left = $state(total);

	function updateSpent(e) {
		spent = +e.target.value;
		left = total - spent;
	}

	function updateLeft(e) {
		left = +e.target.value;
		spent = total - left;
	}
</script>

<label>
	<input type="range" value={spent} oninput={updateSpent} max={total} />
	{spent}/{total} spent
</label>

<label>
	<input type="range" value={left} oninput={updateLeft} max={total} />
	{left}/{total} left
</label>
If you need to use bindings, for whatever reason (for example when you want some kind of “writable $derived”), consider using getters and setters to synchronise state (demo):


<script>
	let total = 100;
	let spent = $state(0);

	let left = {
		get value() {
			return total - spent;
		},
		set value(v) {
			spent = total - v;
		}
	};
</script>

<label>
	<input type="range" bind:value={spent} max={total} />
	{spent}/{total} spent
</label>

<label>
	<input type="range" bind:value={left.value} max={total} />
	{left.value}/{total} left
</label>
If you absolutely have to update $state within an effect and run into an infinite loop because you read and write to the same $state, use untrack.

