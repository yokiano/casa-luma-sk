<script lang="ts">
	import type { Event as WorkshopEvent } from '$lib/types/workshops';
	import type { EventSource, DietaryRestriction } from '$lib/types/workshops';
	import { submitRSVP } from '$lib/workshops.remote';

	interface Props {
		event: WorkshopEvent;
	}

	let { event }: Props = $props();

	let submitting = $state(false);
	let submitted = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	const isAvailable = $derived(
		event.registrationStatus === 'Open' && event.availableSpots > 0
	);

	const dietaryOptions: DietaryRestriction[] = [
		'Vegetarian',
		'Vegan',
		'Gluten-Free',
		'Dairy-Free',
		'Nut Allergy',
		'Other'
	];

	const sourceOptions: EventSource[] = ['Website', 'Instagram', 'Friend', 'Other'];

	async function handleSubmit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		submitting = true;
		errorMessage = null;
		successMessage = null;

		try {
			const formData = new FormData(e.currentTarget);
			
			// Convert FormData to RSVPFormData object
			const acceptsTerms = formData.get('acceptTerms') === 'on';
			
			if (!acceptsTerms) {
				errorMessage = 'You must accept the terms and conditions';
				return;
			}
			
			const data = {
				eventId: formData.get('eventId') as string,
				guestName: formData.get('guestName') as string,
				email: formData.get('email') as string,
				phone: (formData.get('phone') as string) || undefined,
				numberOfGuests: parseInt(formData.get('numberOfGuests') as string, 10),
				dietaryRestrictions: formData.getAll('dietaryRestrictions') as string[],
				notes: (formData.get('notes') as string) || undefined,
				source: (formData.get('source') as string) || undefined,
				acceptTerms: true as const
			};

			const result = await submitRSVP(data);

			if (result.success) {
				submitted = true;
				successMessage = result.message;
				e.currentTarget.reset();
			} else {
				errorMessage = result.message || 'Failed to submit RSVP';
			}
		} catch (error) {
			errorMessage = 'An unexpected error occurred. Please try again.';
			console.error('RSVP submission error:', error);
		} finally {
			submitting = false;
		}
	}
</script>

<div class="rounded-lg bg-white p-6 shadow-lg border border-gray-200">
	<h2 class="mb-4 text-2xl font-bold text-gray-900">Reserve Your Spot</h2>

	{#if !isAvailable}
		<div class="rounded-lg bg-orange-50 border border-orange-200 p-4">
			<p class="font-medium text-orange-800">
				{#if event.registrationStatus === 'Closed'}
					Registration is currently closed for this event.
				{:else if event.availableSpots === 0}
					This event is sold out. Join the waitlist to be notified if spots open up.
				{:else}
					Registration is currently on waitlist only.
				{/if}
			</p>
		</div>
	{:else if submitted && successMessage}
		<div class="rounded-lg bg-green-50 border border-green-200 p-4">
			<div class="flex items-start gap-3">
				<span class="text-2xl">✅</span>
				<div>
					<p class="font-medium text-green-800">{successMessage}</p>
					<p class="mt-2 text-sm text-green-700">
						Please check your email for confirmation details.
					</p>
				</div>
			</div>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="space-y-4">
			<input type="hidden" name="eventId" value={event.id} />

			{#if errorMessage}
				<div class="rounded-lg bg-red-50 border border-red-200 p-3">
					<p class="text-sm text-red-800">{errorMessage}</p>
				</div>
			{/if}

			<div>
				<label for="guestName" class="block text-sm font-medium text-gray-700 mb-1">
					Full Name *
				</label>
				<input
					id="guestName"
					name="guestName"
					type="text"
					required
					minlength="2"
					maxlength="100"
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
					placeholder="Your full name"
				/>
			</div>

			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
					Email *
				</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
					placeholder="your.email@example.com"
				/>
			</div>

			<div>
				<label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
					Phone Number
				</label>
				<input
					id="phone"
					name="phone"
					type="tel"
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
					placeholder="+34 123 456 789"
				/>
			</div>

			<div>
				<label for="numberOfGuests" class="block text-sm font-medium text-gray-700 mb-1">
					Number of Guests *
				</label>
				<input
					id="numberOfGuests"
					name="numberOfGuests"
					type="number"
					required
					min="1"
					max={Math.min(10, event.availableSpots)}
					value="1"
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
				/>
				<p class="mt-1 text-xs text-gray-500">
					Maximum {Math.min(10, event.availableSpots)} guests
				</p>
			</div>

			<div>
				<span class="block text-sm font-medium text-gray-700 mb-2">
					Dietary Restrictions
				</span>
				<div class="space-y-2">
					{#each dietaryOptions as option}
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								name="dietaryRestrictions"
								value={option}
								class="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
							/>
							<span class="text-sm text-gray-700">{option}</span>
						</label>
					{/each}
				</div>
			</div>

			<div>
				<label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
					Special Notes or Requests
				</label>
				<textarea
					id="notes"
					name="notes"
					rows="3"
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
					placeholder="Any special requirements or questions?"
				></textarea>
			</div>

			<div>
				<label for="source" class="block text-sm font-medium text-gray-700 mb-1">
					How did you hear about us?
				</label>
				<select
					id="source"
					name="source"
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
				>
					<option value="">Select an option</option>
					{#each sourceOptions as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-start gap-2">
				<input
					id="acceptTerms"
					type="checkbox"
					name="acceptTerms"
					value="true"
					required
					class="mt-1 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
				/>
				<label for="acceptTerms" class="text-sm text-gray-700">
					I accept the terms and conditions and understand the cancellation policy *
				</label>
			</div>

			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-400"
			>
				{submitting ? 'Submitting...' : 'Reserve Your Spot'}
			</button>

			<p class="text-xs text-gray-500 text-center">
				* Required fields
			</p>
		</form>
	{/if}
</div>

