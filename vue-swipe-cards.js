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
				expanderWidth: 0,
				snapToCard: true,
				scrollInitiator: '',
				maxScrollPosition: 0,
				cardIndex: 0,
				x: 0
			};
			return data;
		},
		props: {
			numCardsVisible: {
				type: Number,
				default: 1
			},
			debug: {
				type: Boolean,
				default: false
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
					t.maxScrollPosition = (t.numCards -1) * t.cardWidth;
					if(t.cardsVisible > 1){
						t.snapToCard = false;
					}
				}
			},
			getNonEmptySlotVNodes: function(){
				let vNodeList = [];
				this.$slots.default.forEach(function(slotItem){
					if(!slotItem.tag){return;} //is whitespace
					vNodeList.push(slotItem);
				});
				return vNodeList;
			},
			setIndex: function(cardIndex){
				let t = this;
				t.cardIndex = cardIndex;
				t.scrollInitiator = 'setIndex';
				t.animateValue({
					valueName: 'x',
					targetValue: cardIndex * this.cardWidth,
					duration: 0.5,
					callback: function(){
						t.scrollInitiator = '';
					}
				});
			},
			animateValue(args){
				let t = this;
				if(!args.valueName || args.targetValue === undefined){
					throw new Error('valueName and targetValue are required.');
				}
				let valueName = args.valueName;
				let initialValue = t[valueName];
				let targetValue = args.targetValue;
				let duration = 1000 * (args.duration || 0.5);
				let sharpness = args.sharpness || 4;
				let diff = targetValue - initialValue;
				let start = window.performance.now();
				let end = start + duration;
				let differ = function(time){
					let timeDiff = time - start;
					let k = 1 - Math.min(1, timeDiff / duration);
					let progress = 1 - Math.pow(k, sharpness);
					return initialValue + (diff * progress);
				};
				let animate = function(time){
					let value = differ(time);
					t[valueName] = value;
					if(time <= end){
						window.requestAnimationFrame(animate);
					} else {
						if(args.callback){
							args.callback(value);
						}
					}
				};
				window.requestAnimationFrame(animate);
			},
			addDots: function(createElement, vNodeList, children){
				let t = this;
				let dots = vNodeList.map(function(slotItem, cardIndex){
					return createElement(
						'a',
						{
							staticClass: 'dot',
							'class': {
								active: t.cardIndex === cardIndex
							},
							on: {
								click: function(){
									t.setIndex(cardIndex);
								}
							}
						}
					);
				});
				children.push(createElement(
					'div',
					{
						staticClass: 'dotHolder'
					},
					dots
				));
			},
			handleScroll(event) {
				let t = this;
				let numCards = t.numCards;
				let x = event.currentTarget.scrollLeft;
				let maximumScrollPosition = t.maxScrollPosition;
				let scrollCompletionRatio = x / maximumScrollPosition;
				//don't allow scroll bounce to set state
				if (x >= 0 && x <= maximumScrollPosition) {
					t.x = x;
					if (!t.scrollInitiator) {
						t.cardIndex = Math.round(scrollCompletionRatio * (numCards - 1));
					}
				}
			},
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
		render: function (createElement) {
			let t = this;
			let slots = [];
			let vNodeList = t.getNonEmptySlotVNodes();
			vNodeList.forEach(function(slotItem){
				slots.push(createElement(
					'swipe-card',
					undefined,
					[slotItem]
				));
			});
			let styleElement = createElement(
				'style',
				undefined,
				t.styles
			);
			let swipeExpander = createElement(
				'div',
				{
					staticClass: 'swipe-expander'
				},
				slots
			);
			let domProps = {};
			if(t.snapToCard){
				domProps.scrollLeft = t.x;
			}
			let swipeScroller = createElement(
				'div',
				{
					staticClass: 'swipe-scroller',
					'class': {
						momentumScroll: !t.snapToCard
					},
					domProps: domProps,
					on:{
						touchstart: function(event) {
							if(t.scrollInitiator){
								event.preventDefault();
							}
						},
						touchend: function(event){
							if(t.snapToCard){
								event.preventDefault();
								t.setIndex(t.cardIndex);
							}
						},
						scroll: function(event){
							if(!t.scrollInitiator){
								t.handleScroll(event);
							}
						}
					}
				},
				[swipeExpander]
			);
			let children = [styleElement, swipeScroller];
			if(t.snapToCard) {
				t.addDots(createElement, vNodeList, children);
			}
			if(t.debug){
				children.push(createElement(
					'pre',
					{
						domProps:{
							innerText: JSON.stringify(this.$data, null, '\t')
						}
					}
				));
			}
			return createElement(
				'div',
				{
					staticClass: 'vue-swipe-cards',
					attrs: {
						id: t.id
					}
				},
				children
			);
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
