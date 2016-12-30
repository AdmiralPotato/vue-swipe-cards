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
				snapToCard: false,
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
		created: function(){
			let t = this;
			//internal properties that should not be observables,
			//and need not be redefined each time the render method is run
			t.startX = null;
			t.isSwiping = null;
			t.startPoint = null;
			t.handleTouchStart = t.createTouchHandler('Start');
			t.handleTouchMove = t.createTouchHandler('Move');
			t.handleTouchEnd = t.createTouchHandler('End');
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
					point = {
						x: result.clientX,
						y: result.clientY,
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
					let shouldSnap = t.snapToCard && !t.scrollInitiator;
					let point = shouldSnap ? t.getPointByTouch(touchEvent) : null;
					if (point) {
						t[`drag${eventName}`](point);
					}
				};
			},
			dragStart: function(point) {
				let t = this;
				t.startX = t.x;
			},
			dragMove: function(point) {
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
				t.startPoint = null;
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
			let swipeScroller = createElement(
				'div',
				{
					staticClass: 'swipe-scroller',
					'class': {
						nativeScroll: !t.snapToCard,
						momentumScroll: !t.snapToCard
					},
					on:{
						touchstart: t.handleTouchStart,
						touchmove: t.handleTouchMove,
						touchend: t.handleTouchEnd,
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
