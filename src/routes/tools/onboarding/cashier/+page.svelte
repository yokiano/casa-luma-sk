<script lang="ts">
	import type { PageData } from './$types';

	type Props = { data: PageData };
	let { data }: Props = $props();

	let activeTab = $state<'study' | 'quiz'>('study');
	
	// Quiz State
	let currentQuestionIndex = $state(0);
	let selectedOption = $state<string | null>(null);
	let answered = $state(false);
	let score = $state(0);
	let quizFinished = $state(false);
	let answersHistory = $state<{ questionId: string; selected: string; correct: boolean }[]>([]);

	const currentQuestion = $derived(data.questions[currentQuestionIndex]);
	const totalQuestions = $derived(data.questions.length);

	function selectOption(optionId: string) {
		if (answered) return;
		selectedOption = optionId;
		answered = true;
		
		const isCorrect = optionId === currentQuestion.correctOption;
		if (isCorrect) {
			score += 1;
		}
		
		answersHistory.push({
			questionId: currentQuestion.id,
			selected: optionId,
			correct: isCorrect
		});
	}

	function nextQuestion() {
		if (currentQuestionIndex + 1 < totalQuestions) {
			currentQuestionIndex += 1;
			selectedOption = null;
			answered = false;
		} else {
			quizFinished = true;
		}
	}

	function resetQuiz() {
		currentQuestionIndex = 0;
		selectedOption = null;
		answered = false;
		score = 0;
		quizFinished = false;
		answersHistory = [];
		activeTab = 'quiz';
	}
</script>

<div class="mx-auto max-w-4xl px-0 print:max-w-none print:px-0">
	<header class="mb-8 border-b border-[#d3c5b8] pb-6 print:mb-4 print:border-black/20">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-xs uppercase tracking-[0.18em] text-[#7a6550]/80 print:text-black/70">
					Tools · Onboarding · {data.role}
				</p>
				<h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925] print:text-black">
					Cashier Onboarding — SOP & POS Training
				</h1>
				<p class="mt-2 max-w-2xl text-sm leading-relaxed text-[#7a6550]/85 print:text-black/70">
					Master the front desk flow, membership registrations, and Loyverse ticket handling. Read the study guide then test your knowledge.
				</p>
			</div>
			
			<div class="flex gap-2 print:hidden">
				<button 
					onclick={() => activeTab = 'study'}
					class="px-5 py-2 rounded-full text-sm font-medium transition-colors duration-150 {activeTab === 'study' ? 'bg-[#7a6550] text-white shadow' : 'bg-white/80 border border-[#d3c5b8] text-[#7a6550] hover:bg-white'}"
				>
					Study Guide
				</button>
				<button 
					onclick={() => { activeTab = 'quiz'; resetQuiz(); }}
					class="px-5 py-2 rounded-full text-sm font-medium transition-colors duration-150 {activeTab === 'quiz' ? 'bg-[#7a6550] text-white shadow' : 'bg-white/80 border border-[#d3c5b8] text-[#7a6550] hover:bg-white'}"
				>
					Start Training Quiz
				</button>
			</div>
		</div>
	</header>

	{#if activeTab === 'study'}
		<!-- STUDY GUIDE TAB -->
		<div class="space-y-8 animate-fadeIn">
			<!-- Section 1: Check-in Rules -->
			<section class="bg-white/70 border border-[#d3c5b8] rounded-3xl p-6 shadow-sm">
				<h2 class="text-lg font-semibold text-[#2c2925] flex items-center gap-3 border-b border-[#e6ddd4] pb-3 mb-4">
					<span class="w-2 h-2 rounded-full bg-amber-600"></span>
					The Gold Rule: Immediate Desk Check-In
				</h2>
				<div class="space-y-4 text-sm text-[#5c4a3d] leading-relaxed">
					<p class="font-medium text-[#2c2925]">
						Check in members and flexi guests the moment they walk through the door.
					</p>
					<ul class="list-disc pl-5 space-y-2">
						<li><strong>Do not delay entry:</strong> Ring up their 0-baht check-in item, attach their customer profile, and close and pay that ticket immediately—<em>before</em> they go play and <em>before</em> opening any food or drink tab.</li>
						<li><strong>Catch problems early:</strong> Ringing their entry immediately ensures any issues (expired membership, exhausted flexi punches, or registration errors) are surfaced while they are still standing at the desk.</li>
					</ul>
				</div>
			</section>

			<!-- Section 2: Core Workflows -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Memberships -->
				<section class="bg-white/70 border border-[#d3c5b8] rounded-3xl p-6 shadow-sm">
					<h3 class="text-md font-semibold text-[#2c2925] flex items-center gap-3 border-b border-[#e6ddd4] pb-3 mb-4">
						<span class="w-2 h-2 rounded-full bg-emerald-600"></span>
						Weekly & Monthly Memberships
					</h3>
					<ul class="space-y-3 text-sm text-[#5c4a3d]">
						<li class="flex items-start gap-2">
							<span class="text-emerald-700 font-bold select-none">•</span>
							<span><strong>Family-Based:</strong> The membership belongs to the family. Any kid/s from that family who arrive can use the valid spots.</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-emerald-700 font-bold select-none">•</span>
							<span><strong>Check-in Item:</strong> Select the correct customer profile and add <strong>`Member Valid Visit`</strong>. Close at 0-baht.</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-emerald-700 font-bold select-none">•</span>
							<span><strong>100% Automated:</strong> Selling a membership on Loyverse auto-creates the Svelte/Notion record. Just make sure the customer profile is attached.</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-emerald-700 font-bold select-none">•</span>
							<span><strong>Expired or Missing:</strong> Do not guess or give a free entry. Call a manager to resolve it.</span>
						</li>
					</ul>
				</section>

				<!-- Flexi Passes -->
				<section class="bg-white/70 border border-[#d3c5b8] rounded-3xl p-6 shadow-sm">
					<h3 class="text-md font-semibold text-[#2c2925] flex items-center gap-3 border-b border-[#e6ddd4] pb-3 mb-4">
						<span class="w-2 h-2 rounded-full bg-indigo-600"></span>
						Flexi Passes (11 Entrances)
					</h3>
					<ul class="space-y-3 text-sm text-[#5c4a3d]">
						<li class="flex items-start gap-2">
							<span class="text-indigo-700 font-bold select-none">•</span>
							<span><strong>Punches rule:</strong> Each card has 11 entrances. 1 punch per hour covers all kids in the same family for that hour.</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-indigo-700 font-bold select-none">•</span>
							<span><strong>Check-in Item:</strong> Select customer, add one <strong>`Flexi Single Entrance`</strong> for each hour of play used, and close at 0-baht.</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-indigo-700 font-bold select-none">•</span>
							<span><strong>Auto Validity:</strong> Sells on Loyverse are automated with a 60-day expiration window. Always link the customer account.</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-indigo-700 font-bold select-none">•</span>
							<span><strong>No Punches Left:</strong> Charge normal paid open play or sell a new card. Do not bypass with a free check-in.</span>
						</li>
					</ul>
				</section>
			</div>

			<!-- Section 3: General POS handling -->
			<section class="bg-white/70 border border-[#d3c5b8] rounded-3xl p-6 shadow-sm">
				<h2 class="text-lg font-semibold text-[#2c2925] flex items-center gap-3 border-b border-[#e6ddd4] pb-3 mb-4">
					<span class="w-2 h-2 rounded-full bg-neutral-600"></span>
					POS Handling & Exceptions
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-[#5c4a3d]">
					<div class="space-y-2">
						<h4 class="font-semibold text-[#2c2925]">Customer Profile</h4>
						<p>Always attach the <strong>Customer</strong> profile to every closed ticket—be it free check-ins, memberships, or café purchases. No anonymous play.</p>
					</div>
					<div class="space-y-2">
						<h4 class="font-semibold text-[#2c2925]">1-Hour Grace Period</h4>
						<p>We offer a 15-minute buffer. If they stay longer than 1 hour and 15 minutes, you must change the 1-Hour item to a 1-Day ticket. Call manager if they contest.</p>
					</div>
					<div class="space-y-2">
						<h4 class="font-semibold text-[#2c2925]">Discount Thresholds</h4>
						<p>Never apply a 100% discount, or any discount total over 400 Baht on a single ticket, without explicit, on-shift manager approval.</p>
					</div>
				</div>
			</section>

			<!-- Section 4: What to Teach During Training -->
			<section class="bg-white/70 border border-[#d3c5b8] rounded-3xl p-6 shadow-sm">
				<h2 class="text-lg font-semibold text-[#2c2925] flex items-center gap-3 border-b border-[#e6ddd4] pb-3 mb-4">
					<span class="w-2 h-2 rounded-full bg-sky-600"></span>
					Training Checklist
				</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-[#5c4a3d]">
					<div class="rounded-2xl bg-[#f6f1eb] border border-[#e6ddd4] p-4">
						<h3 class="font-semibold text-[#2c2925]">Customer Flow</h3>
						<p class="mt-1 text-xs leading-relaxed">Greeting, first-time vs returning families, family code, and when to call a manager.</p>
					</div>
					<div class="rounded-2xl bg-[#f6f1eb] border border-[#e6ddd4] p-4">
						<h3 class="font-semibold text-[#2c2925]">Registration</h3>
						<p class="mt-1 text-xs leading-relaxed">QR code, why we need contact details, screenshot/card reminder, and Loyverse search.</p>
					</div>
					<div class="rounded-2xl bg-[#f6f1eb] border border-[#e6ddd4] p-4">
						<h3 class="font-semibold text-[#2c2925]">Check-in</h3>
						<p class="mt-1 text-xs leading-relaxed">Attach customer, ring the correct play/member/flexi item, close check-in before they play.</p>
					</div>
					<div class="rounded-2xl bg-[#f6f1eb] border border-[#e6ddd4] p-4">
						<h3 class="font-semibold text-[#2c2925]">Checkout</h3>
						<p class="mt-1 text-xs leading-relaxed">Open tabs, time rules, 1-hour grace period, split receipts, and unpaid ticket handling.</p>
					</div>
					<div class="rounded-2xl bg-[#f6f1eb] border border-[#e6ddd4] p-4">
						<h3 class="font-semibold text-[#2c2925]">Memberships</h3>
						<p class="mt-1 text-xs leading-relaxed">Family-based access, flexi punches, automatic records, expiration/missing-record escalation.</p>
					</div>
					<div class="rounded-2xl bg-[#f6f1eb] border border-[#e6ddd4] p-4">
						<h3 class="font-semibold text-[#2c2925]">Receipt & House Rules</h3>
						<p class="mt-1 text-xs leading-relaxed">Customer on every ticket, card fee notice, add-on charges, discounts, and cafe/playground rules.</p>
					</div>
				</div>
			</section>

			<!-- Section 5: Decision Flow -->
			<section class="bg-white/70 border border-[#d3c5b8] rounded-3xl p-6 shadow-sm overflow-hidden">
				<div class="border-b border-[#e6ddd4] pb-3 mb-5">
					<h2 class="text-lg font-semibold text-[#2c2925] flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-rose-600"></span>
						Cashier Decision Flow
					</h2>
					<p class="mt-2 text-xs leading-relaxed text-[#7a6550]">
						Use this as the floor script: identify the family, register or find them, check entry immediately, then keep every cafe/play ticket linked to a customer.
					</p>
				</div>

				<div class="space-y-5 text-sm text-[#5c4a3d]">
					<div class="mx-auto max-w-md rounded-3xl border-2 border-[#7a6550] bg-[#f6f1eb] p-5 text-center shadow-sm">
						<p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6550]">Start</p>
						<h3 class="mt-1 text-lg font-semibold text-[#2c2925]">Customer Comes In</h3>
						<p class="mt-2 text-xs leading-relaxed">Smile, greet them, and make them feel remembered. Ask if they have registered before / know their family code.</p>
					</div>

					<div class="flex justify-center text-[#b29d8b] print:text-black/40">↓</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="rounded-3xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm">
							<p class="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">First time / not found</p>
							<h3 class="mt-1 font-semibold text-[#2c2925]">Register with QR Code</h3>
							<ul class="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed">
								<li><strong>What to say:</strong> “We register every family so we have a contact number if something happens with a child, and so orders/loyalty can connect to your family.”</li>
								<li>After completion, ask them to screenshot the registration-complete page or photograph the yellow family card.</li>
								<li>If time allows, give a short tour or ask a manager to help.</li>
							</ul>
						</div>

						<div class="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
							<p class="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Returning family</p>
							<h3 class="mt-1 font-semibold text-[#2c2925]">Find Customer Profile</h3>
							<ul class="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed">
								<li>Ask for family code first. If they forgot, search family name and remind them of the code.</li>
								<li>Use purchase history when helpful to make the customer feel remembered.</li>
								<li>If registered but not visible in Loyverse, restart Loyverse. If still missing, call manager.</li>
							</ul>
						</div>
					</div>

					<div class="flex justify-center text-[#b29d8b] print:text-black/40">↓</div>

					<div class="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
						<p class="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Decide entry type</p>
						<h3 class="mt-1 font-semibold text-[#2c2925]">What are they here for?</h3>
						<div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
							<div class="rounded-2xl bg-white/70 border border-amber-100 p-4">
								<h4 class="font-semibold text-[#2c2925]">Open Play</h4>
								<p class="mt-1 text-xs leading-relaxed">Add the correct play item per kid/family rule, attach customer, then track the 1-hour grace period.</p>
							</div>
							<div class="rounded-2xl bg-white/70 border border-amber-100 p-4">
								<h4 class="font-semibold text-[#2c2925]">Membership / Flexi</h4>
								<p class="mt-1 text-xs leading-relaxed">Check in immediately with the correct 0-baht item before play. If expired/missing/no punches, call manager or sell paid entry/new card.</p>
							</div>
							<div class="rounded-2xl bg-white/70 border border-amber-100 p-4">
								<h4 class="font-semibold text-[#2c2925]">Cafe / Food Only</h4>
								<p class="mt-1 text-xs leading-relaxed">Attach the family customer. If truly not applicable, use the correct ZZ special customer. Explain extra charges before ordering.</p>
							</div>
						</div>
					</div>

					<div class="flex justify-center text-[#b29d8b] print:text-black/40">↓</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
							<p class="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-800">During visit</p>
							<h3 class="mt-1 font-semibold text-[#2c2925]">Keep Tickets Clean</h3>
							<ul class="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed">
								<li>Every ticket needs a customer profile before closing.</li>
								<li>Tell customers about 3% credit-card charge and paid add-ons before they are surprised.</li>
								<li>If an item is missing, a request is unusual, or kitchen clarification is needed, call manager / kitchen.</li>
							</ul>
						</div>

						<div class="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
							<p class="text-xs font-semibold uppercase tracking-[0.14em] text-rose-800">Checkout / exception</p>
							<h3 class="mt-1 font-semibold text-[#2c2925]">Close Correctly or Escalate</h3>
							<ul class="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed">
								<li>More than 1 hour + 15 minutes means change 1-hour play to 1-day play.</li>
								<li>No 100% discount or discount over ฿400 without manager approval.</li>
								<li>If a customer insists they already paid an unpaid ticket, call to confirm; if they insist, leave it and notify manager.</li>
							</ul>
						</div>
					</div>
				</div>
			</section>

			<!-- Call to Action -->
			<div class="flex justify-center pt-4">
				<button 
					onclick={() => { activeTab = 'quiz'; resetQuiz(); }}
					class="px-8 py-3 rounded-full bg-[#7a6550] hover:bg-[#5c4a3d] text-white text-sm font-semibold tracking-wide shadow-md transition-colors"
				>
					I've Studied the SOP — Take the Quiz
				</button>
			</div>
		</div>
	{:else if activeTab === 'quiz'}
		<!-- QUIZ TAB -->
		<div class="max-w-2xl mx-auto animate-fadeIn">
			{#if !quizFinished}
				<!-- QUIZ CARD IN PROGRESS -->
				<div class="bg-white/80 border border-[#d3c5b8] rounded-3xl shadow-xl overflow-hidden">
					<!-- Progress Bar -->
					<div class="w-full bg-[#e6ddd4] h-1.5">
						<div 
							class="bg-[#7a6550] h-full transition-all duration-300" 
							style="width: {((currentQuestionIndex + 1) / totalQuestions) * 100}%"
						></div>
					</div>

					<div class="p-8">
						<!-- Progress Text -->
						<div class="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-[#7a6550]/80 mb-4">
							<span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
							<span class="tabular-nums">Score: {score}/{currentQuestionIndex}</span>
						</div>

						<!-- Question Text -->
						<h3 class="text-lg font-semibold text-[#2c2925] leading-snug mb-6">
							{currentQuestion.question}
						</h3>

						<!-- Options List -->
						<div class="space-y-3">
							{#each currentQuestion.options as option}
								{@const isSelected = selectedOption === option.id}
								{@const isCorrect = option.id === currentQuestion.correctOption}
								{@const showSuccess = answered && isCorrect}
								{@const showFailure = answered && isSelected && !isCorrect}
								
								<button
									onclick={() => selectOption(option.id)}
									disabled={answered}
									class="w-full text-left p-4 rounded-2xl border text-sm transition-all duration-200 flex gap-4 items-start
										{isSelected && !answered ? 'border-[#7a6550] bg-[#f6f1eb] font-medium text-[#2c2925]' : ''}
										{showSuccess ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-medium shadow-sm' : ''}
										{showFailure ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-medium' : ''}
										{!isSelected && !showSuccess ? 'border-[#e6ddd4] hover:bg-neutral-50 text-[#5c4a3d] bg-white/50' : ''}
										{answered ? 'cursor-default' : 'hover:border-[#7a6550]'}"
								>
									<span class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs border font-bold
										{isSelected && !answered ? 'border-[#7a6550] bg-[#7a6550] text-white' : ''}
										{showSuccess ? 'border-emerald-600 bg-emerald-600 text-white' : ''}
										{showFailure ? 'border-rose-600 bg-rose-600 text-white' : ''}
										{!isSelected && !showSuccess ? 'border-[#d3c5b8] bg-white text-[#7a6550]' : ''}"
									>
										{option.id}
									</span>
									<span class="leading-normal">{option.text}</span>
								</button>
							{/each}
						</div>

						<!-- Feedback Explanations -->
						{#if answered}
							<div class="mt-6 p-5 rounded-2xl bg-[#f6f1eb] border border-[#e6ddd4] text-xs leading-relaxed text-[#5c4a3d] animate-slideUp">
								<h4 class="font-bold text-[#2c2925] mb-1">
									{selectedOption === currentQuestion.correctOption ? 'Correct!' : 'Incorrect'}
								</h4>
								<p>{currentQuestion.explanation}</p>
							</div>

							<!-- Action Button -->
							<div class="mt-6 flex justify-end">
								<button
									onclick={nextQuestion}
									class="px-6 py-2.5 rounded-full bg-[#7a6550] hover:bg-[#5c4a3d] text-white text-sm font-semibold shadow transition-colors"
								>
									{currentQuestionIndex + 1 === totalQuestions ? 'Finish Quiz' : 'Next Question'}
								</button>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<!-- QUIZ COMPLETED SUMMARY -->
				<div class="bg-white/80 border border-[#d3c5b8] rounded-3xl p-8 shadow-xl text-center animate-fadeIn">
					<div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 
						{score === totalQuestions ? 'bg-emerald-100 border border-emerald-200 text-emerald-700' : 'bg-amber-100 border border-amber-200 text-amber-700'}"
					>
						{#if score === totalQuestions}
							<svg xmlns="http://www.w3.org/2000/svg" width="28" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
						{/if}
					</div>

					<h3 class="text-2xl font-bold text-[#2c2925]">Quiz Completed!</h3>
					
					<p class="text-sm text-[#7a6550] mt-1">
						You scored <span class="font-bold text-[#2c2925]">{score}</span> out of <span class="font-bold text-[#2c2925]">{totalQuestions}</span>.
					</p>

					<!-- Rating and messages -->
					<div class="my-6 p-6 rounded-2xl bg-[#f6f1eb] border border-[#e6ddd4] max-w-md mx-auto">
						{#if score === totalQuestions}
							<h4 class="font-semibold text-emerald-800 text-sm mb-1">Perfect Score!</h4>
							<p class="text-xs text-emerald-950 leading-relaxed">
								You have fully mastered the Cashier SOP. You are 100% ready to handle membership flows and POS check-ins on the shop floor. Great job!
							</p>
						{:else if score >= 5}
							<h4 class="font-semibold text-amber-800 text-sm mb-1">Passed</h4>
							<p class="text-xs text-amber-950 leading-relaxed">
								Good effort! You understand the core checkout and check-in workflows well. Review the study guide for any questions you missed to achieve absolute mastery.
							</p>
						{:else}
							<h4 class="font-semibold text-rose-800 text-sm mb-1">Needs Review</h4>
							<p class="text-xs text-rose-950 leading-relaxed">
								We recommend reviewing the Cashier SOP or studying the guide again before checking in customers. Understanding the immediate check-in rule is essential.
							</p>
						{/if}
					</div>

					<!-- Actions -->
					<div class="flex justify-center gap-3">
						<button
							onclick={() => activeTab = 'study'}
							class="px-5 py-2 rounded-full border border-[#d3c5b8] text-[#7a6550] text-sm font-medium hover:bg-neutral-50 transition-colors"
						>
							Back to Study Guide
						</button>
						<button
							onclick={resetQuiz}
							class="px-5 py-2 rounded-full bg-[#7a6550] text-white text-sm font-medium hover:bg-[#5c4a3d] transition-colors shadow-sm"
						>
							Retake Quiz
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Subtle animations for transitions */
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(6px); }
		to { opacity: 1; transform: translateY(0); }
	}
	@keyframes slideUp {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.animate-fadeIn {
		animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
	.animate-slideUp {
		animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
</style>
