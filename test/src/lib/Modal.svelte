<script>
	import { createEventDispatcher } from 'svelte';
	
	export let isOpen = false;
	export let title = 'Modal';
	
	const dispatch = createEventDispatcher();
	
	$: if (isOpen) {
		document.body.style.overflow = 'hidden';
	} else {
		document.body.style.overflow = '';
	}
	
	function close() {
		dispatch('close');
	}
</script>

{#if isOpen}
	<div class="backdrop" on:click={close}>
		<div class="modal" on:click|stopPropagation>
			<header>
				<h2>{title}</h2>
				<button on:click={close}>×</button>
			</header>
			<slot />
			<slot name="footer" />
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
	}
	
	.modal {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		padding: 2rem;
		border-radius: 8px;
	}
	
	.unused-style {
		color: red;
	}
</style> 