<script>
	import { afterUpdate, beforeUpdate, createEventDispatcher, tick } from 'svelte';

	// Deprecated: createEventDispatcher
	const dispatch = createEventDispatcher();

	// Deprecated: export let
	export let title = 'Hello';
	export let count = 0;

	// Deprecated: reactive statements
	$: doubled = count * 2;
	$: {
		console.log('Count changed:', count);
	}

	// Deprecated: lifecycle hooks
	beforeUpdate(() => {
		console.log('Before update');
	});

	afterUpdate(() => {
		console.log('After update');
	});

	// Testing store subscription pattern (should NOT be flagged)
	let myState = $state(0);
	let computed = $derived(myState * 2);

	// This should be flagged as problematic store usage
	let $someStore = writable(0);

	async function handleClick() {
		count += 1;
		// Deprecated: createEventDispatcher
		dispatch('increment', { count });
		
		// This should trigger the tick warning
		tick();
		
		// This should be flagged
		setTimeout(() => {
			tick();
		}, 100);
	}

	// Component method usage (should be flagged)
	let componentRef;
	function testComponentMethods() {
		componentRef.$set({ title: 'New Title' });
		componentRef.$on('event', handler);
		componentRef.$destroy();
	}
</script>

<div>
	<h1>{title}</h1>
	<p>Count: {count}</p>
	<p>Doubled: {doubled}</p>

	<!-- Deprecated: on: event directive -->
	<button on:click={handleClick}> Click me </button>

	<!-- Deprecated: named slots -->
	<slot name="header" />
	<slot />
	<slot name="footer" />
</div>

<style>
	div {
		padding: 1rem;
	}

	/* Some unused CSS that should be detected */
	.unused-class {
		color: red;
	}
</style>
