<script lang="ts">
	import type { Event as WorkshopEvent } from '$lib/types/workshops';
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

	async function handleSubmit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		submitting = true;
		errorMessage = null;
		successMessage = null;

		try {
			const formData = new FormData(e.currentTarget);

			if (formData.get('acceptTerms') !== 'on') {
				errorMessage = 'Please accept the terms to continue';
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
		} catch (err) {
			errorMessage = 'Unexpected error. Try again.';
			console.error(err);
		} finally {
			submitting = false;
		}
	}
</script>

<div class="bg-white p-6 sm:p-8 border-2 border-[#333]">
	<h2 class="mb-4 text-xl font-extrabold tracking-tight text-[#333]">
		Reserve Your Spot
	</h2>

	{#if !isAvailable}
		<div class="bg-[#F9EDE8] border border-[#dfbc69] p-4 text-[#333]">
			<p class="font-semibold">
				{#if event.registrationStatus === 'Closed'}Registration Closed{:else if event.availableSpots === 0}Sold Out{:else}Waitlist Only{/if}
			</p>
		</div>
	{:else if submitted && successMessage}
		<div class="bg-[#A8C3A0]/20 border border-[#A8C3A0] p-4 text-[#333]">
			<p class="font-semibold">{successMessage}</p>
			<p class="mt-1 text-sm">Check your email for confirmation.</p>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="space-y-4">
			<input type="hidden" name="eventId" value={event.id} />

			{#if errorMessage}
				<div class="bg-red-50 border border-red-200 p-3 text-red-800 text-sm">{errorMessage}</div>
			{/if}

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-1 block text-xs font-bold uppercase tracking-wide text-[#333]">Full Name *</span>
					<input name="guestName" required minlength="2" maxlength="100" class="w-full border-2 border-[#333] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#dfbc69]" />
				</label>
				<label class="block">
					<span class="mb-1 block text-xs font-bold uppercase tracking-wide text-[#333]">Email *</span>
					<input type="email" name="email" required class="w-full border-2 border-[#333] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#dfbc69]" />
				</label>
				<label class="block">
					<span class="mb-1 block text-xs font-bold uppercase tracking-wide text-[#333]">Phone</span>
					<input type="tel" name="phone" class="w-full border-2 border-[#333] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#dfbc69]" />
				</label>
				<label class="block">
					<span class="mb-1 block text-xs font-bold uppercase tracking-wide text-[#333]">Guests *</span>
					<input type="number" name="numberOfGuests" required min="1" max={Math.min(10, event.availableSpots)} value="1" class="w-full border-2 border-[#333] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#dfbc69]" />
				</label>
			</div>

			<label class="block">
				<span class="mb-1 block text-xs font-bold uppercase tracking-wide text-[#333]">Dietary</span>
				<div class="grid grid-cols-2 gap-2 text-sm">
					{#each ['Vegetarian','Vegan','Gluten-Free','Dairy-Free','Nut Allergy','Other'] as opt}
						<label class="inline-flex items-center gap-2">
							<input type="checkbox" name="dietaryRestrictions" value={opt} class="accent-[#dfbc69]" />
							<span>{opt}</span>
						</label>
					{/each}
				</div>
			</label>

			<label class="block">
				<span class="mb-1 block text-xs font-bold uppercase tracking-wide text-[#333]">Notes</span>
				<textarea name="notes" rows="3" class="w-full border-2 border-[#333] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#dfbc69]"></textarea>
			</label>

			<label class="block">
				<span class="mb-1 block text-xs font-bold uppercase tracking-wide text-[#333]">How did you hear?</span>
				<select name="source" class="w-full border-2 border-[#333] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#dfbc69]">
					<option value="">Select</option>
					<option>Website</option>
					<option>Instagram</option>
					<option>Friend</option>
					<option>Other</option>
				</select>
			</label>

			<label class="flex items-start gap-2 text-sm">
				<input type="checkbox" name="acceptTerms" value="true" required class="mt-1 accent-[#dfbc69]" />
				<span>I accept the terms and understand the cancellation policy</span>
			</label>

			<button type="submit" disabled={submitting} class="w-full bg-[#333] px-6 py-3 font-extrabold uppercase tracking-wide text-white transition hover:bg-black disabled:opacity-60">
				{submitting ? 'Submitting…' : 'Reserve'}
			</button>
		</form>
	{/if}
</div>


