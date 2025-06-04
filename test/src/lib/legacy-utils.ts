import LegacyComponent from './LegacyComponent.svelte';

// Deprecated: component instantiation with new
export function createLegacyComponent(target: HTMLElement) {
	const component = new LegacyComponent({
		target,
		props: {
			title: 'Legacy Title',
			count: 42
		}
	});

	return component;
}

// This would be the new way in Svelte 5
// import { mount } from 'svelte';
// export function createModernComponent(target: HTMLElement) {
//   return mount(LegacyComponent, {
//     target,
//     props: {
//       title: 'Modern Title',
//       count: 42
//     }
//   });
// }
