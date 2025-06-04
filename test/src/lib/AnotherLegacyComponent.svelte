<script lang="ts">
	// Deprecated: $$props and $$restProps
	export let name: string;
	console.log('All props:', $$props);
	console.log('Rest props:', $$restProps);

	// More reactive statements
	$: greeting = `Hello ${name}!`;
	$: if (name) {
		console.log('Name is set');
	}
</script>

<div class="container">
	<h2>{greeting}</h2>

	<!-- Deprecated: $$slots usage -->
	{#if $$slots.default}
		<div class="content">
			<slot />
		</div>
	{/if}

	{#if $$slots.sidebar}
		<aside>
			<slot name="sidebar" />
		</aside>
	{/if}

	<!-- More deprecated event handlers -->
	<input
		type="text"
		bind:value={name}
		on:focus={() => console.log('focused')}
		on:blur={() => console.log('blurred')}
	/>
</div>

<style>
	.container {
		max-width: 800px;
	}

	.content {
		padding: 1rem;
	}

	/* Another unused style */
	.never-used {
		background: blue;
	}
</style>
