"use strict";

let vueSwipeCardCount = 0;
Vue.component(
	'vue-swipe-cards',
	{
		data: function(){
			vueSwipeCardCount += 1;
			let data = {
				id: 'vue-swipe-card-' + vueSwipeCardCount,
				parentWidth: 0,
				numCards: 0,
				width: 0,
				cardWidth: 0,
				cardsVisible: 0,
				expanderWidth: 0
			};
			return data;
		},
		props: {
			numCardsVisible: {
				type: Number,
				default: 1
			}
		},
		mounted: function(){
			let t = this;
			t.resize();
			t.resizeEventListener = function(){
				t.resize();
			};
			window.addEventListener('resize', t.resizeEventListener);
		},
		beforeUpdate: function(){
			this.resize();
		},
		beforeDestroy: function(){
			window.removeEventListener('resize', this.resizeEventListener);
		},
		methods: {
			resize: function(){
				let t = this;
				let parentWidth = t.$el.parentNode.clientWidth;
				let vNodeList = t.getNonEmptySlotVNodes();
				let numCards = vNodeList.length;
				let sameNumCards = t.numCards === numCards;
				let sameViewportWidth = t.parentWidth === parentWidth;
				let sameNumberOfCardVisible = t.cardsVisible === t.numCardsVisible;
				if(!(
					sameNumCards &&
					sameViewportWidth &&
					sameNumberOfCardVisible
				)){
					t.parentWidth = parentWidth;
					t.numCards = numCards;
					t.cardsVisible = t.numCardsVisible;
					t.cardWidth = t.parentWidth / t.cardsVisible;
					t.expanderWidth = t.cardWidth * t.numCards;
				}
			},
			getNonEmptySlotVNodes: function(){
				let vNodeList = [];
				this.$slots.default.forEach(function(slotItem){
					if(!slotItem.tag){return;} //is whitespace
					vNodeList.push(slotItem);
				});
				return vNodeList;
			}
		},
		computed: {
			styles: function(){
				return `
					#${this.id} .swipe-card{
						width: ${this.cardWidth}px;
					}
					#${this.id} .swipe-expander{
						width: ${this.expanderWidth}px;
					}
				`;
			}
		},
		render: function (createElement, context) {
			let children = [createElement(
				'style',
				undefined,
				this.styles
			)];
			let vNodeList = this.getNonEmptySlotVNodes();
			vNodeList.forEach(function(slotItem){
				children.push(createElement(
					'swipe-card',
					undefined,
					[slotItem]
				));
			});
			return createElement(
				'div',
				{
					staticClass: 'vue-swipe-cards',
					attrs: {
						id: this.id
					}
				},
				[createElement(
					'div',
					{
						staticClass: 'swipe-expander',
					},
					children
				)]
			)
		}
	}
);

Vue.component(
	'swipe-card',
	{
		template: `
			<div class="swipe-card">
				<slot></slot>
			</div>
		`
	}
);
