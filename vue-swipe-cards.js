"use strict";

let touchHandlingMixin = {
	created: function(){
		let t = this;
		//internal properties that should not be observables,
		//and need not be redefined each time the render method is run
		t.startPoint = null;
		t.handleTouchStart = t.createTouchHandler('Start');
		t.handleTouchMove = t.createTouchHandler('Move');
		t.handleTouchEnd = t.createTouchHandler('End');
	},
	methods: {
		getPointByTouch: function(touchEvent){
			let t = this;
			let touches = touchEvent.changedTouches;
			let result = null;
			let point = null;
			let isStart = t.startPoint === null;
			if (isStart) {
				result = touches[0];
			} else {
				for (let i = 0; i < touches.length; i++) {
					let touch = touches[i];
					if (touch.identifier === t.startPoint.id) {
						result = touch;
						break;
					}
				}
			}
			if (result) {
				let bounds = event.currentTarget.getBoundingClientRect();
				point = {
					x: result.clientX - bounds.left,
					y: result.clientY - bounds.top,
					id: result.identifier
				};
				if(isStart){
					t.startPoint = point;
				}
			}
			return point;
		},
		createTouchHandler(eventName){
			let t = this;
			return function(touchEvent){
				//console.log(touchEvent);
				let point = t.getPointByTouch(touchEvent);
				if (point) {
					t[`drag${eventName}`](point, touchEvent);
					if(eventName === 'End'){
						t.startPoint = null;
					}
				}
			};
		},
	}
};

let vueSwipeCardCount = 0;
Vue.component(
	'vue-swipe-cards',
	{
		mixins: [touchHandlingMixin],
		data: function(){
			vueSwipeCardCount += 1;
			let data = {
				id: 'vue-swipe-card-' + vueSwipeCardCount,
				parentWidth: 0,
				numCards: 0,
				cardWidth: 0,
				cardsVisible: 0,
				expanderWidth: 0,
				snapToCard: false,
				scrollInitiator: '',
				maxScrollPosition: 0,
				cardIndex: 0,
				x: 0
			};
			if(navigator.userAgent.search(/iPhone|iPad|iPod/) !== -1){
				data.needsIosScrollHack = true;
			}
			return data;
		},
		props: {
			numCardsVisible: {
				type: Number,
				default: 1
			},
			startIndex: {
				type: Number,
				default: 0
			},
			debug: {
				type: Boolean,
				default: false
			}
		},
		created: function(){
			let t = this;
			//internal properties that should not be observables,
			//and need not be redefined each time the render method is run
			t.startX = null;
			t.isSwiping = null;
			if(t.startIndex){
				t.cardIndex = t.startIndex;
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
					if(t.needsIosScrollHack){
						window.requestAnimationFrame(function(){
							t.needsIosScrollHack = false;
						});
					}
					t.parentWidth = parentWidth;
					t.numCards = numCards;
					t.cardsVisible = t.numCardsVisible;
					t.cardWidth = t.parentWidth / t.cardsVisible;
					t.expanderWidth = t.cardWidth * t.numCards;
					t.maxScrollPosition = (t.numCards -1) * t.cardWidth;
					if(t.cardsVisible > 1){
						t.snapToCard = false;
					} else {
						t.snapToCard = true;
						t.x = t.cardIndex * t.cardWidth;
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
					duration: 0.25,
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
			handleScroll: function(event) {
				let t = this;
				if(!t.scrollInitiator) {
					let numCards = t.numCards;
					let x = event.currentTarget.scrollLeft;
					let maximumScrollPosition = t.maxScrollPosition;
					let scrollCompletionRatio = x / maximumScrollPosition;
					//don't allow scroll bounce to set state
					if (x >= 0 && x <= maximumScrollPosition) {
						t.x = x;
						t.cardIndex = Math.round(scrollCompletionRatio * (numCards - 1));
					}
				}
			},
			dragStart: function(point) {
				let t = this;
				t.startX = t.x;
			},
			dragMove: function(point, event) {
				let t = this;
				if (t.isSwiping === null) {
					t.isSwiping = t.isUserScrollingHorizontally(point);
				}
				if (t.isSwiping) {
					event.preventDefault();
					t.x = t.getAbsoluteXFromRelativeX(point.x);
				}
			},
			dragEnd: function(point){
				let t = this;
				if (t.isSwiping) {
					t.x = t.getAbsoluteXFromRelativeX(point.x);
					let scrollDirection = this.getRelativeDragDirection(point.x);
					let nextCardIndex = Math.min(
						t.numCards - 1,
						Math.max(0, t.cardIndex - scrollDirection)
					);
					t.setIndex(nextCardIndex);
				}
				t.startX = null;
				t.isSwiping = null;
			},
			getRelativeDragDirection: function(x){
				let t = this;
				let xDiff = x - t.startPoint.x;
				let sign = (xDiff / Math.abs(xDiff));
				return isNaN(sign) ? 0 : sign;
			},
			getAbsoluteXFromRelativeX: function(x){
				return this.startX + (this.startPoint.x - x);
			},
			isUserScrollingHorizontally: function(point) {
				let x = Math.abs(point.x - this.startPoint.x);
				let y = Math.abs(point.y - this.startPoint.y);
				return x > y;
			}
		},
		computed: {
			styles: function(){
				let t = this;
				return `
					#${t.id} .swipe-card{
						width: ${t.cardWidth}px;
					}
					#${this.id}.vue-swipe-cards .swipe-scroller .swipe-expander{
						width: ${t.expanderWidth}px;
					}
				`;
			},
			translateStyle: function () {
				let t = this;
				let translate = `translate3d(${-t.x}px, 0, 0)`;
				return `-webkit-transform: ${translate};transform: ${translate};`;
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
			let swipeExpanderOptions = {
				staticClass: 'swipe-expander'
			};
			if(t.snapToCard){
				swipeExpanderOptions.style = t.translateStyle;
			}
			let swipeExpander = createElement(
				'div',
				swipeExpanderOptions,
				slots
			);
			let swipeHandlers = {};
			if(t.snapToCard && !t.scrollInitiator){
				swipeHandlers.touchstart = t.handleTouchStart;
				swipeHandlers.touchmove = t.handleTouchMove;
				swipeHandlers.touchend = t.handleTouchEnd;
			} else {
				swipeHandlers.scroll = t.handleScroll;
			}
			let swipeScroller = createElement(
				'div',
				{
					staticClass: 'swipe-scroller',
					'class': {
						nativeScroll: !t.snapToCard && !t.needsIosScrollHack,
						momentumScroll: !t.snapToCard && !t.needsIosScrollHack
					},
					on: swipeHandlers
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
