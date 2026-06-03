export async function focusValidationField(fieldId: string) {
	const field = document.getElementById(fieldId);
	if (!field) return;

	field.scrollIntoView({ behavior: 'smooth', block: 'center' });
	field.focus({ preventScroll: true });
	field.classList.remove('validation-attention');
	void field.offsetWidth;
	field.classList.add('validation-attention');
}
