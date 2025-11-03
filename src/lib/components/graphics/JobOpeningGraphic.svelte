<script lang="ts">
	import type { JobOpeningsResponseDTO } from '$lib/notion-sdk/dbs/job-openings';

	interface Props {
		opening: JobOpeningsResponseDTO;
	}

	let { opening }: Props = $props();

	const jobTitle = opening.properties.jobTitle?.text || 'Position';
	const skills = opening.properties.requiredSkills.values.slice(0, 4);
	const employmentType = opening.properties.employmentType?.name;
	const location = opening.properties.location?.name;
	const experienceLevel = opening.properties.experienceLevel?.name;
	const salary = opening.properties.expectedSalary ?? 0;
	const openPositions = opening.properties.openPositions ?? 0;
	const pointOfContact = (opening.properties as any).pointOfContact?.text;
	
	const formatSalary = (sal: number): string => {
		if (sal === 0) return 'Negotiable';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(sal);
	};
</script>

<!-- Main graphic container -->
<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 50%, #white 100%); display: flex; flex-direction: column; position: relative; overflow: hidden; box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; text-align: center;">
	<!-- Decorative background elements - larger and more prominent -->
	<div style="position: absolute; top: -100px; left: 50%; width: 500px; height: 500px; background-color: #dfbc69; border-radius: 50%; opacity: 0.06; transform: translateX(-250px);"></div>
	<div style="position: absolute; bottom: -80px; right: -100px; width: 400px; height: 400px; background-color: #A8C3A0; border-radius: 50%; opacity: 0.07; transform: translateX(100px) translateY(100px);"></div>
	<div style="position: absolute; top: 20%; left: -80px; width: 350px; height: 350px; background-color: #E07A5F; border-radius: 50%; opacity: 0.05;"></div>

	<!-- Content -->
	<div style="position: relative; z-index: 10; display: flex; flex-direction: column; height: 100%; justify-content: center; align-items: center; padding: 60px 48px;">
		<!-- "WE ARE HIRING" - MUCH BIGGER -->
		<div style="margin-bottom: 24px;">
			<div style="font-size: 24px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #0f172a; opacity: 0.8; margin-bottom: 12px;">
				We Are
			</div>
			<div style="font-size: 72px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #dfbc69; text-shadow: 0 2px 8px rgba(223, 188, 105, 0.2);">
				Hiring
			</div>
		</div>

		<!-- Job Title - BIG and Bold -->
		<h1 style="font-size: 64px; font-weight: 900; color: #0f172a; line-height: 1.1; margin: 0 0 40px 0; max-width: 900px; word-break: break-word;">
			{jobTitle}
		</h1>

		<!-- Metadata Row - Location, Type, Level -->
		<div style="display: flex; justify-content: center; gap: 32px; margin-bottom: 40px; flex-wrap: wrap; width: 100%;">
			{#if location}
				<div style="display: flex; flex-direction: column; align-items: center;">
					<div style="font-size: 32px; margin-bottom: 8px;">📍</div>
					<div style="font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #1e293b; opacity: 0.6; margin-bottom: 4px;">
						Location
					</div>
					<div style="font-size: 18px; font-weight: 600; color: #0f172a;">
						{location}
					</div>
				</div>
			{/if}

			{#if employmentType}
				<div style="display: flex; flex-direction: column; align-items: center;">
					<div style="font-size: 32px; margin-bottom: 8px;">⏱️</div>
					<div style="font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #1e293b; opacity: 0.6; margin-bottom: 4px;">
						Type
					</div>
					<div style="font-size: 18px; font-weight: 600; color: #0f172a;">
						{employmentType}
					</div>
				</div>
			{/if}

			{#if experienceLevel}
				<div style="display: flex; flex-direction: column; align-items: center;">
					<div style="font-size: 32px; margin-bottom: 8px;">🎯</div>
					<div style="font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #1e293b; opacity: 0.6; margin-bottom: 4px;">
						Level
					</div>
					<div style="font-size: 18px; font-weight: 600; color: #0f172a;">
						{experienceLevel}
					</div>
				</div>
			{/if}

			{#if pointOfContact}
				<div style="display: flex; flex-direction: column; align-items: center;">
					<div style="font-size: 32px; margin-bottom: 8px;">👤</div>
					<div style="font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #1e293b; opacity: 0.6; margin-bottom: 4px;">
						Point of Contact
					</div>
					<div style="font-size: 18px; font-weight: 600; color: #0f172a;">
						{pointOfContact}
					</div>
				</div>
			{/if}

			<!--{#if salary > 0}
				<div style="display: flex; flex-direction: column; align-items: center;">
					<div style="font-size: 32px; margin-bottom: 8px;">💰</div>
					<div style="font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #1e293b; opacity: 0.6; margin-bottom: 4px;">
						Salary
					</div>
					<div style="font-size: 18px; font-weight: 600; color: #0f172a;">
						{formatSalary(salary)}
					</div>
				</div>
			{/if}-->
		</div>

		<!-- Divider -->
		<div style="width: 160px; height: 4px; background: linear-gradient(to right, #dfbc69, #A8C3A0, #E07A5F); border-radius: 9999px; margin-bottom: 40px;"></div>

		<!-- Positions Available - Centered below divider -->
		{#if openPositions > 0}
			<div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 40px;">
				<div style="font-size: 32px; margin-bottom: 8px;">✨</div>
				<div style="font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #1e293b; opacity: 0.6; margin-bottom: 4px;">
					Positions Available
				</div>
				<div style="font-size: 24px; font-weight: 900; color: #A8C3A0;">
					{openPositions} {openPositions === 1 ? 'Position' : 'Positions'}
				</div>
			</div>
		{/if}

		<!-- Skills Section - Centered -->
		{#if skills.length > 0}
			<div style="margin-bottom: 24px;">
				<p style="font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #1e293b; opacity: 0.6; margin-bottom: 16px;">
					Required Skills
				</p>

				<div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 12px;">
					{#each skills as skill, index}
						<div
							style="
								padding: 10px 20px;
								color: white;
								font-weight: 600;
								font-size: 13px;
								border-radius: 20px;
								{index % 3 === 0 ? 'background-color: #0f172a;' : ''}
								{index % 3 === 1 ? 'background-color: #dfbc69; color: #0f172a;' : ''}
								{index % 3 === 2 ? 'background-color: #A8C3A0; color: #0f172a;' : ''}
								box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
								transform: {index % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)'};
							"
						>
							{skill}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Bottom accent dots -->
		<div style="position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px;">
			<div style="width: 10px; height: 10px; border-radius: 50%; background-color: #dfbc69;"></div>
			<div style="width: 10px; height: 10px; border-radius: 50%; background-color: #A8C3A0;"></div>
			<div style="width: 10px; height: 10px; border-radius: 50%; background-color: #E07A5F;"></div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
