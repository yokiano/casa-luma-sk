<script lang="ts">
	import { BUSINESS_INFO, SOCIAL_LINKS, FOOTER_LINKS } from '$lib/constants';
	import logoFull from '$lib/assets/logo/logo-no-sun-transparent.png';
</script>

<footer class="border-t border-[#F9F7F2]/10 bg-[#2D3A3A] text-[#F9F7F2]">
	<div class="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-16 lg:px-12">
		<div class="grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr] lg:gap-10">
			<div>
				<p class="mb-5 text-[11px] uppercase tracking-[0.24em] text-[#F9F7F2]/55">Casa Luma</p>
				<div class="mb-7 inline-flex rounded-2xl bg-[#F9F7F2] px-4 py-3">
					<img src={logoFull} alt="Casa Luma logo" class="h-20 w-auto object-contain sm:h-24" />
				</div>
				<h3 class="max-w-sm text-2xl leading-tight text-[#F9F7F2] sm:text-3xl">
					A space to play, eat and celebrate together.
				</h3>
				<p class="mt-6 max-w-md text-sm leading-relaxed text-[#F9F7F2]/75">{BUSINESS_INFO.tagline}</p>
			</div>

			<div class="grid grid-cols-2 gap-8 sm:max-w-sm">
				<div>
					<p class="mb-4 text-[11px] uppercase tracking-[0.22em] text-[#F9F7F2]/55">Explore</p>
					<ul class="space-y-3">
						{#each FOOTER_LINKS as link}
							<li>
								<a
									href={link.href}
									class="text-sm text-[#F9F7F2]/80 transition-colors hover:text-[#dfbc69]"
								>
									{link.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>

				<div>
					<p class="mb-4 text-[11px] uppercase tracking-[0.22em] text-[#F9F7F2]/55">Connect</p>
					<div class="flex gap-2">
						<a
							href={SOCIAL_LINKS.instagram}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#F9F7F2]/25 text-[10px] tracking-[0.2em] transition-colors hover:border-[#dfbc69] hover:text-[#dfbc69]"
							aria-label="Instagram"
						>
							IG
						</a>
						<a
							href={SOCIAL_LINKS.facebook}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#F9F7F2]/25 text-[10px] tracking-[0.2em] transition-colors hover:border-[#dfbc69] hover:text-[#dfbc69]"
							aria-label="Facebook"
						>
							FB
						</a>
						<a
							href={SOCIAL_LINKS.googleMaps}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#F9F7F2]/25 text-[10px] tracking-[0.2em] transition-colors hover:border-[#dfbc69] hover:text-[#dfbc69]"
							aria-label="Google Maps"
						>
							MAP
						</a>
					</div>
				</div>
			</div>

			<div>
				<p class="mb-4 text-[11px] uppercase tracking-[0.22em] text-[#F9F7F2]/55">Contact</p>
				<div class="space-y-2 text-sm text-[#F9F7F2]/80">
					<p>{BUSINESS_INFO.location}</p>
					<p>{BUSINESS_INFO.email}</p>
					<p>{BUSINESS_INFO.phone}</p>
				</div>
			</div>
		</div>

		<div class="mt-12 border-t border-[#F9F7F2]/10 pt-7 text-[10px] uppercase tracking-[0.18em] text-[#F9F7F2]/45">
			&copy; {new Date().getFullYear()} {BUSINESS_INFO.name}. All rights reserved.
		</div>
	</div>
</footer>
