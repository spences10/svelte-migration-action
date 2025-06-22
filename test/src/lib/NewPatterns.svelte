<script>
	import { SvelteComponent } from 'svelte';
	
	// This should be flagged - SvelteComponent usage
	class MyComponent extends SvelteComponent {
		constructor(options) {
			super(options);
		}
	}
	
	// Component instantiation with new (should be flagged)
	const instance = new MyComponent({
		target: document.body,
		props: { message: 'Hello' }
	});
	
	// Transition with modifiers (should warn about needing |global)
	let visible = true;
</script>

<div>
	{#if visible}
		<p transition:fade|local>This should warn about transition modifiers</p>
		<p in:fly={{ y: 200 }}|preventDefault>This has event-like syntax but isn't an event</p>
	{/if}
	
	<!-- Event modifiers (deprecated) -->
	<button on:click|preventDefault|stopPropagation={handleClick}>
		Click with modifiers
	</button>
	
	<!-- svelte:fragment usage -->
	<svelte:fragment slot="content">
		<p>This should suggest using snippets instead</p>
	</svelte:fragment>
	
	<!-- let: directive -->
	<SomeComponent>
		<div slot="item" let:item let:index>
			{item} at {index}
		</div>
	</SomeComponent>
</div>

<style>
	div {
		padding: 1rem;
	}
</style>