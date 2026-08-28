<script lang="ts">
	function zeit(iso: string): string {
		return new Date(iso).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	}
</script>

<div class="min-h-dvh bg-lvs-nacht text-lvs-eis font-body p-4 lg:p-8">
	<div class="max-w-4xl mx-auto grid gap-6 ">

			
		<div class="lvs-panel p-4 grid gap-3 bg-lvs-wasser">
			<span>
				<span class="font-display text-2xl font-600 uppercase block flex justify-center"
					>Verwaltung</span
				>
			</span>
		</div>
		<nav class="grid gap-3 sm:grid-cols-2">
			<a
				href="/boteinsatzgruppe"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Verwaltung Einsatzgruppe</span>
				<span class="text-sm text-lvs-grau">Verwaltung von Quallifikationen und Rollen</span>
			</a>
			<a
				href="/aufgaben"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">RWS Aufgaben</span>
				<span class="text-sm text-lvs-grau">Übersicht von Aufgaben der RWS</span>
			</a>
			<a
				href="/botevd"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Verwaltung EvD</span>
				<span class="text-sm text-lvs-grau">Übersicht von Aufgaben der RWS</span>
			</a>
			<a
				href="/botrws"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Verwaltung RWS</span>
				<span class="text-sm text-lvs-grau">Übersicht von Aufgaben der RWS</span>
			</a>
		</nav>
		<div class="lvs-panel p-4 grid gap-3 bg-green-9">
			<span>
				<span class="font-display text-2xl font-600 uppercase block flex justify-center"
					>Ausbildung</span
				>
			</span>
		</div>
		<nav class="grid gap-3 sm:grid-cols-2">
			<a
				href="/bfausb"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Bootsführer Ausbildung</span>
				<span class="text-sm text-lvs-grau">Übersicht von Aufgaben der RWS</span>
			</a>
			<a
				href="/kfausb"
				class="lvs-panel p-4 no-underline text-lvs-eis hover:border-lvs-wasser transition-colors"
			>
				<span class="font-display text-2xl font-600 uppercase block">Kraftfahrer Ausbildung</span>
				<span class="text-sm text-lvs-grau">Übersicht von Aufgaben der RWS</span>
			</a>
		</nav>
	</div>
</div>

<style>
	
	@keyframes puls {
		0%,
		100% {
			background-color: #e30613;
		}
		50% {
			background-color: #b8050f;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		
	}
</style>
