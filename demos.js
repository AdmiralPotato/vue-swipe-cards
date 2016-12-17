"use strict";

let demoFullWidth = new Vue({
	el: '#demo-full-width'
});

let demoMarkupTemplate = new Vue({
	el: '#demo-markup-template',
	data: {
		cards: [
			'fi-die-one',
			'fi-die-two',
			'fi-die-three',
			'fi-die-four',
		]
	}
});

let demoStringTemplate = new Vue({
	el: '#demo-string-template',
	data: {
		cards: [
			'fi-die-one',
			'fi-die-two',
			'fi-die-three',
			'fi-die-four',
			'fi-die-five',
			'fi-die-six',
		]
	},
	template: `
		<vue-swipe-cards :numCardsVisible="3.5">
			<div v-for="card in cards" class="styledHolder">
				<i :class="card"></i>
			</div>
		</vue-swipe-cards>
	`
});
