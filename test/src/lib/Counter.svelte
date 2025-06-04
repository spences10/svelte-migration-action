<script>
	export let initialValue = 0;
	
	let count = initialValue;
	
	$: doubled = count * 2;
	$: tripled = count * 3;
	$: {
		if (count > 10) {
			console.log('Count is high:', count);
		}
	}
	
	console.log('Props:', $$props);
	console.log('Rest:', $$restProps);
</script>

<div class="counter">
	<p>Count: {count}</p>
	<p>Doubled: {doubled}</p>
	
	<button on:click={() => count--}>-</button>
	<button on:click={() => count++}>+</button>
	
	{#if $$slots.extra}
		<slot name="extra" {count} {doubled} />
	{/if}
</div>

<style>
	.counter {
		padding: 1rem;
		border: 1px solid #ccc;
	}
	
	.never-used {
		background: blue;
	}
</style> 