<script>
	import { afterUpdate, beforeUpdate, createEventDispatcher } from 'svelte';
	
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
	
	function handleClick() {
		count += 1;
		// Deprecated: createEventDispatcher
		dispatch('increment', { count });
	}
</script>

<div>
	<h1>{title}</h1>
	<p>Count: {count}</p>
	<p>Doubled: {doubled}</p>
	
	<!-- Deprecated: on: event directive -->
	<button on:click={handleClick}>
		Click me
	</button>
	
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