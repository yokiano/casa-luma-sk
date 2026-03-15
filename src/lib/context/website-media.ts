import { getContext, setContext } from 'svelte';
import { WebsiteMediaState } from '$lib/state/website-media.svelte';

const websiteMediaContextKey = Symbol('website-media');

export function setWebsiteMediaContext(state: WebsiteMediaState) {
	return setContext(websiteMediaContextKey, state);
}

export function getWebsiteMediaContext() {
	return getContext<WebsiteMediaState>(websiteMediaContextKey);
}
