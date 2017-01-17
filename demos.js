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


let demoTouchMixin = new Vue({
	el: '#demo-touch-mixin',
	mixins: [touchHandlingMixin],
	data: {
		x: 0,
		y: 0,
		isDragging: false
	},
	methods: {
		dragStart: function(point, event){
			event.preventDefault();
			this.x = point.x - event.target.offsetLeft;
			this.y = point.y - event.target.offsetTop;
			this.isDragging = true;
		},
		dragMove: function(point, event){
			event.preventDefault();
			this.x = point.x;
			this.y = point.y;
		},
		dragEnd: function(point, event){
			event.preventDefault();
			this.isDragging = false;
		},
	},
	computed: {
		style: function () {
			return {
				top: this.y + 'px',
				left: this.x + 'px',
			};
		}
	},
	template: `
		<div class="demo-touch-mixin-holder"
			:class="{isDragging: isDragging}"
			@touchstart="handleTouchStart"
			@touchmove="handleTouchMove"
			@touchend="handleTouchEnd"
			>
			<div class="locationDisplay" :style="style"></div>
		</div>
	`
});
